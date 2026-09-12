import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const member = "00000000-0000-4000-8000-000000000001";
const outsider = "00000000-0000-4000-8000-000000000002";
const disabled = "00000000-0000-4000-8000-000000000003";
const propertyId = "00000000-0000-4000-8000-000000000010";
const contractId = "00000000-0000-4000-8000-000000000020";
const requestId = "00000000-0000-4000-8000-000000000030";
const migration = await readFile(
  new URL(
    "../supabase/migrations/20260912190000_rental_management.sql",
    import.meta.url,
  ),
  "utf8",
);

test("rental database: exact membership, private storage, atomic ledger, retries and audited corrections", async () => {
  const db = new PGlite();
  const as = async (id) => {
    await db.exec("RESET ROLE");
    await db.query("SELECT set_config('test.uid',$1,false)", [id]);
    await db.exec("SET ROLE authenticated");
  };
  const rpc = async (name, row) =>
    (
      await db.query(`SELECT to_jsonb(public.${name}($1::jsonb)) AS row`, [
        JSON.stringify(row),
      ])
    ).rows[0].row;
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('test.uid',true),'')::uuid$$;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY,nome text,role text,ativo boolean);
      CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon; GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
      INSERT INTO profiles VALUES('${member}','Membro selecionado','corretor',true),('${outsider}','Éder','admin',true),('${disabled}','Felipe','admin',false);`);
    await db.exec(migration);
    await db.exec(migration);
    await db.query("INSERT INTO rental_members(profile_id)VALUES($1),($2)", [
      member,
      disabled,
    ]);
    assert.equal(
      (
        await db.query(
          "SELECT public FROM storage.buckets WHERE id='rental-documents'",
        )
      ).rows[0].public,
      false,
    );
    await as(outsider);
    assert.equal(
      (await db.query("SELECT has_rental_access() AS allowed")).rows[0].allowed,
      false,
      "a familiar name or admin role cannot grant rental access",
    );
    await assert.rejects(
      rpc("save_rental_property", {
        id: propertyId,
        title: "Apartamento",
        owner_name: "Proprietária",
      }),
      /não autorizado/,
    );
    await assert.rejects(
      db.query("INSERT INTO rental_members(profile_id)VALUES($1)", [outsider]),
      /permission denied/,
    );
    await as(disabled);
    assert.equal(
      (await db.query("SELECT has_rental_access() AS allowed")).rows[0].allowed,
      false,
      "membership does not override a disabled CRM account",
    );
    await as(member);
    assert.equal(
      (await db.query("SELECT has_rental_access() AS allowed")).rows[0].allowed,
      true,
    );
    await rpc("save_rental_property", {
      id: propertyId,
      title: "Apartamento",
      owner_name: "Proprietária",
    });
    const contract = {
      id: contractId,
      property_id: propertyId,
      tenant_name: "Locatário",
      start_date: "2024-01-15",
      end_date: "2024-03-12",
      rent_cents: 300001,
      admin_fee_bps: 1000,
      due_day: 31,
      transfer_day: 31,
      status: "active",
    };
    await rpc("save_rental_contract", contract);
    await assert.rejects(
      rpc("save_rental_contract", {
        ...contract,
        id: "00000000-0000-4000-8000-000000000021",
      }),
      /Já existe/,
    );
    await assert.rejects(
      rpc("save_rental_property", {
        id: propertyId,
        title: "Apartamento",
        owner_name: "Proprietária",
        archived: true,
      }),
      /Encerre/,
    );
    const generation = (
      await db.query("SELECT generate_rental_charges('2024-02-01') AS result")
    ).rows[0].result;
    assert.deepEqual(generation, { created: 1, total: 1 });
    assert.equal(
      (await db.query("SELECT generate_rental_charges('2024-02-01') AS result"))
        .rows[0].result.created,
      0,
    );
    assert.equal(
      (await db.query("SELECT generate_rental_charges('2024-04-01') AS result"))
        .rows[0].result.created,
      0,
      "no charges after contract end",
    );
    assert.equal(
      (await db.query("SELECT generate_rental_charges('2023-12-01') AS result"))
        .rows[0].result.created,
      0,
      "no charges before contract start",
    );
    await assert.rejects(
      db.query("SELECT generate_rental_charges('2099-01-01')"),
      /atual/,
    );
    let charge = (await db.query("SELECT * FROM rental_charges")).rows[0];
    assert.equal(charge.due_date.toISOString().slice(0, 10), "2024-02-29");
    assert.equal(Number(charge.amount_cents), 300001);
    await rpc("save_rental_contract", {
      ...contract,
      rent_cents: 400000,
      admin_fee_bps: 1200,
    });
    assert.equal(
      Number(
        (await db.query("SELECT amount_cents FROM rental_charges")).rows[0]
          .amount_cents,
      ),
      300001,
      "rent changes preserve previously generated charge snapshot",
    );
    await db.query("SELECT adjust_rental_charge($1,$2,$3)", [
      charge.id,
      290001,
      "Desconto acordado",
    ]);
    await assert.rejects(
      db.query("SELECT adjust_rental_charge($1,$2,$3)", [
        charge.id,
        0,
        "Inválido",
      ]),
      /positivo/,
    );
    await assert.rejects(
      db.query("SELECT adjust_rental_charge($1,$2,$3)", [
        charge.id,
        290001,
        "",
      ]),
      /motivo/,
    );
    const args = [charge.id, 100005, "2024-02-20", "pix", "Parcial", requestId];
    const receipt = (
      await db.query(
        "SELECT to_jsonb(record_rental_receipt($1,$2,$3,$4,$5,$6)) AS row",
        args,
      )
    ).rows[0].row;
    const retry = (
      await db.query(
        "SELECT to_jsonb(record_rental_receipt($1,$2,$3,$4,$5,$6)) AS row",
        args,
      )
    ).rows[0].row;
    assert.equal(receipt.id, retry.id);
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM rental_receipts")).rows[0]
        .n,
      1,
    );
    await assert.rejects(
      db.query("SELECT record_rental_receipt($1,$2,$3,$4,$5,$6)", [
        charge.id,
        1,
        ...args.slice(2),
      ]),
      /já usado/,
    );
    charge = (await db.query("SELECT * FROM rental_charges")).rows[0];
    assert.deepEqual(
      [Number(charge.received_cents), Number(charge.fee_cents)],
      [100005, 10001],
    );
    await assert.rejects(
      db.query("SELECT adjust_rental_charge($1,$2,$3)", [
        charge.id,
        300000,
        "Depois do recebimento",
      ]),
      /recebimentos/,
    );
    await assert.rejects(
      db.query("SELECT record_rental_payout($1,$2,$3,$4,$5)", [
        charge.id,
        90005,
        "2024-02-20",
        "",
        "00000000-0000-4000-8000-000000000040",
      ]),
      /excede/,
    );
    const payoutArgs = [
      charge.id,
      90004,
      "2024-02-20",
      "Repasse confirmado",
      "00000000-0000-4000-8000-000000000041",
    ];
    const payout = (
      await db.query(
        "SELECT to_jsonb(record_rental_payout($1,$2,$3,$4,$5)) AS row",
        payoutArgs,
      )
    ).rows[0].row;
    assert.equal(
      (
        await db.query(
          "SELECT to_jsonb(record_rental_payout($1,$2,$3,$4,$5)) AS row",
          payoutArgs,
        )
      ).rows[0].row.id,
      payout.id,
    );
    await assert.rejects(
      db.query("SELECT record_rental_receipt($1,$2,$3,$4,$5,$6)", [
        charge.id,
        190000,
        "2024-02-20",
        "pix",
        "",
        "00000000-0000-4000-8000-000000000042",
      ]),
      /excede/,
    );
    await assert.rejects(
      db.query("SELECT record_rental_receipt($1,$2,$3,$4,$5,$6)", [
        charge.id,
        1,
        "2099-01-01",
        "pix",
        "",
        "00000000-0000-4000-8000-000000000043",
      ]),
      /futura/,
    );
    await assert.rejects(
      db.exec("UPDATE rental_charges SET received_cents=0"),
      /permission denied/,
    );
    await assert.rejects(
      db.exec("DELETE FROM rental_receipts"),
      /permission denied/,
    );
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM rental_audit WHERE action='adjust'",
        )
      ).rows[0].n,
      1,
    );
    const docId = "00000000-0000-4000-8000-000000000050",
      storagePath = `${contractId}/${docId}.pdf`;
    await db.query(
      "INSERT INTO storage.objects(bucket_id,name)VALUES('rental-documents',$1)",
      [storagePath],
    );
    await rpc("register_rental_document", {
      id: docId,
      contract_id: contractId,
      name: "contrato.pdf",
      storage_path: storagePath,
      size_bytes: 100,
      mime_type: "application/pdf",
    });
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id='rental-documents'",
        )
      ).rows[0].n,
      1,
    );
    await assert.rejects(
      db.query(
        "INSERT INTO storage.objects(bucket_id,name)VALUES('rental-documents',$1)",
        [`${contractId}/${docId}.html`],
      ),
      /row-level security/,
    );
    await as(outsider);
    for (const table of [
      "rental_members",
      "rental_properties",
      "rental_contracts",
      "rental_charges",
      "rental_receipts",
      "rental_payouts",
      "rental_documents",
      "rental_audit",
    ])
      assert.equal(
        (await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n,
        0,
        `${table} stays private`,
      );
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id='rental-documents'",
        )
      ).rows[0].n,
      0,
    );
    await assert.rejects(
      db.query(
        "INSERT INTO storage.objects(bucket_id,name)VALUES('rental-documents',$1)",
        [storagePath],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query("SELECT record_rental_payout($1,$2,$3,$4,$5)", payoutArgs),
      /não autorizado/,
      "even a retry rechecks membership",
    );
    await db.exec("RESET ROLE");
    await assert.rejects(db.exec("DELETE FROM rental_receipts"), /imutáveis/);
    await assert.rejects(
      db.exec("UPDATE rental_audit SET action='hidden'"),
      /imutáveis/,
    );
    await db.query(
      "UPDATE rental_members SET enabled=false WHERE profile_id=$1",
      [member],
    );
    await as(member);
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM rental_contracts"))
        .rows[0].n,
      0,
      "revocation applies to every later request",
    );
  } finally {
    await db.close();
  }
});
