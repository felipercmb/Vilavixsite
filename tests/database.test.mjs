import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const admin = "00000000-0000-0000-0000-000000000001";
const broker = "00000000-0000-0000-0000-000000000002";
test("database migration: guarded rules, atomic assignment, retries and pause", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('test.uid',true),'')::uuid$$;`,
    );
    const base = (
      await readFile(new URL("../supabase_schema.sql", import.meta.url), "utf8")
    ).split("-- STORAGE BUCKET")[0];
    await db.exec(base);
    await db.exec(
      await readFile(
        new URL("../supabase_migration_automation.sql", import.meta.url),
        "utf8",
      ),
    );
    const migration = await readFile(
      new URL(
        "../supabase/migrations/20260912181000_campaign_routing.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    const catalogMigration = await readFile(
      new URL(
        "../supabase/migrations/20260912180000_catalog.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(catalogMigration);
    await db.exec(catalogMigration);
    await db.exec(
      "CREATE SCHEMA storage;CREATE TABLE storage.objects(id int,bucket_id text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT USAGE ON SCHEMA storage TO authenticated;GRANT SELECT,INSERT,DELETE ON storage.objects TO authenticated;CREATE POLICY photos_public ON storage.objects FOR SELECT USING(bucket_id='fotos');CREATE POLICY \"Fotos upload logado\" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='fotos');CREATE POLICY \"Fotos delete logado\" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='fotos');",
    );
    const accessMigration = await readFile(
      new URL(
        "../supabase/migrations/20260912182000_access.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(accessMigration);
    await db.exec(accessMigration);
    const property = {
      codigo: "SOURCE:1",
      slug: "test-source-1",
      titulo: "Published property",
      tipo: "Apartamento",
      finalidade: "venda",
      preco: 650000,
      quartos: 2,
      area: 70,
      fotos: ["https://example.test/property.jpg"],
      caracteristicas: [],
      sourceUrl: "https://vilaviximoveis.com.br/imovel/test",
      importedAt: new Date().toISOString(),
    };
    await db.query("SELECT import_legacy_catalog($1)", [
      JSON.stringify([property]),
    ]);
    await db.query("UPDATE imoveis SET status='vendido' WHERE codigo=$1", [
      property.codigo,
    ]);
    await db.query("SELECT import_legacy_catalog($1)", [
      JSON.stringify([{ ...property, preco: 625000 }]),
    ]);
    const imported = (
      await db.query("SELECT status,preco FROM imoveis WHERE codigo=$1", [
        property.codigo,
      ])
    ).rows;
    assert.equal(imported.length, 1);
    assert.equal(imported[0].status, "vendido");
    assert.equal(Number(imported[0].preco), 625000);
    assert.equal(
      (
        await db.query(
          "SELECT has_function_privilege('authenticated','public.import_legacy_catalog(jsonb)','EXECUTE') AS allowed",
        )
      ).rows[0].allowed,
      false,
    );
    await db.query("INSERT INTO auth.users VALUES($1,$2,$3),($4,$5,$6)", [
      admin,
      "admin@local.test",
      JSON.stringify({ nome: "Admin", role: "admin" }),
      broker,
      "broker@local.test",
      JSON.stringify({ nome: "Broker", role: "admin" }),
    ]);
    assert.equal(
      (await db.query("SELECT role FROM profiles WHERE id=$1", [admin])).rows[0]
        .role,
      "corretor",
      "user metadata cannot self-promote",
    );
    assert.equal(
      (await db.query("SELECT ativo FROM profiles WHERE id=$1", [broker]))
        .rows[0].ativo,
      false,
      "new registration cannot read customer data without approval",
    );
    await db.exec(
      "INSERT INTO storage.objects VALUES(1,'fotos');GRANT USAGE ON SCHEMA public TO authenticated;",
    );
    await db.query("SELECT set_config('test.uid',$1,false)", [broker]);
    await db.exec("SET ROLE authenticated");
    await assert.rejects(
      db.query("INSERT INTO storage.objects VALUES(2,'fotos')"),
      /row-level security/,
    );
    assert.equal(
      (await db.query("DELETE FROM storage.objects WHERE id=1 RETURNING id"))
        .rows.length,
      0,
      "inactive account cannot remove published photos",
    );
    await db.exec("RESET ROLE");
    await db.query("UPDATE profiles SET ativo=true WHERE id=ANY($1)", [
      [admin, broker],
    ]);
    await db.query("UPDATE profiles SET role='admin' WHERE id=$1", [admin]);
    await db.query("SELECT set_config('test.uid',$1,false)", [admin]);
    const campaign = {
      id: "meta-act_1-1",
      external_id: "1",
      name: "Test",
      source: "meta",
      provider: "zernio",
      platform: "facebook",
      status: "ACTIVE",
      effective_status: "ACTIVE",
      ad_account_id: "act_1",
      synced_at: new Date().toISOString(),
    };
    await db.query("SELECT sync_zernio_campaigns($1,$2)", [
      JSON.stringify([campaign]),
      "act_1",
    ]);
    await db.query("SELECT save_campaign_rules($1,$2,$3,$4,$5)", [
      campaign.id,
      [admin, broker],
      JSON.stringify({ [admin]: 2, [broker]: 1 }),
      true,
      2,
    ]);
    await db.query("SELECT sync_zernio_campaigns($1,$2)", [
      JSON.stringify([campaign]),
      "act_1",
    ]);
    assert.equal(
      (await db.query("SELECT routing_enabled FROM campaigns")).rows[0]
        .routing_enabled,
      true,
      "sync must preserve rules",
    );
    await db.exec(
      "INSERT INTO leads(nome)VALUES('L1'),('L2'),('L3'),('L4'),('L5');",
    );
    const one = await db.query("SELECT * FROM route_lead($1,$2)", [
      1,
      campaign.id,
    ]);
    const retry = await db.query("SELECT * FROM route_lead($1,$2)", [
      1,
      campaign.id,
    ]);
    assert.equal(one.rows[0].id, retry.rows[0].id);
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM comments WHERE lead_id=1",
        )
      ).rows[0].n,
      1,
    );
    await db.query("SELECT * FROM route_lead($1,$2)", [2, campaign.id]);
    await db.query("SELECT * FROM route_lead($1,$2)", [3, campaign.id]);
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM lead_assignments WHERE broker_id=$1",
          [admin],
        )
      ).rows[0].n,
      2,
    );
    await db.query("SELECT * FROM route_lead($1,$2)", [4, campaign.id]);
    await assert.rejects(
      db.query("SELECT * FROM route_lead($1,$2)", [5, campaign.id]),
      /Nenhum corretor/,
    );
    assert.equal(
      (await db.query("SELECT corretor FROM leads WHERE id=5")).rows[0]
        .corretor,
      null,
      "failed route leaves lead untouched",
    );
    await db.query("SELECT sync_zernio_campaigns($1,$2)", [
      JSON.stringify([
        { ...campaign, status: "PAUSED", effective_status: "PAUSED" },
      ]),
      "act_1",
    ]);
    await assert.rejects(
      db.query("SELECT * FROM route_lead($1,$2)", [5, campaign.id]),
      /inativa/,
    );
    await db.query("SELECT set_config('test.uid',$1,false)", [broker]);
    await assert.rejects(
      db.query("SELECT * FROM route_lead($1,$2)", [5, campaign.id]),
      /administradores/,
    );
    await assert.rejects(
      db.query("SELECT save_campaign_rules($1,$2,$3,$4,$5)", [
        campaign.id,
        [broker],
        "{}",
        true,
        5,
      ]),
      /administradores/,
    );
    const grants = (
      await db.query(
        "SELECT has_function_privilege('authenticated','public.sync_zernio_campaigns(jsonb,text)','EXECUTE') AS sync,has_table_privilege('authenticated','public.campaigns','UPDATE') AS edit",
      )
    ).rows[0];
    assert.equal(grants.sync, false);
    assert.equal(grants.edit, false);
  } finally {
    await db.close();
  }
});
