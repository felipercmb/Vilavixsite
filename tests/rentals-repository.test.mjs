import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Exercise the browser repository with a deliberately unreliable transport. Only
// the browser env and Supabase import are adapted; the repository itself is unchanged.
test("rental repository retains attempt IDs after uncertain writes and recovers uploaded documents", async () => {
  const storage = () => {
    const map = new Map();
    return {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => map.set(key, value),
      removeItem: (key) => map.delete(key),
    };
  };
  const originalSession = globalThis.sessionStorage;
  const originalLocal = globalThis.localStorage;
  globalThis.sessionStorage = storage();
  globalThis.localStorage = storage();
  const calls = [],
    objects = new Set(),
    attempts = new Map();
  let access = true;
  globalThis.__rentalTestClient = {
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === "has_rental_access") return { data: access, error: null };
      const count = (attempts.get(name) || 0) + 1;
      attempts.set(name, count);
      if (count === 1)
        return {
          data: null,
          error: { message: "Network fetch failed after commit" },
        };
      return {
        data: args.p_values || {
          id: args.p_request_id,
          amount_cents: args.p_amount_cents,
        },
        error: null,
      };
    },
    from() {
      throw new Error("Unauthorised load must not query the data tables");
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, "rental-documents");
        return {
          async upload(path) {
            if (objects.has(path))
              return {
                error: {
                  statusCode: "409",
                  message: "The resource already exists",
                },
              };
            objects.add(path);
            return { error: null };
          },
        };
      },
    },
  };
  try {
    let source = await readFile(
      new URL("../lib/rentals.js", import.meta.url),
      "utf8",
    );
    source = source
      .replace(
        /import \{ supabase \} from ['"]\.\/supabase\.js['"];?/,
        "const supabase = globalThis.__rentalTestClient;",
      )
      .replace(
        /['"]\.\/rental-domain\.js['"]/,
        JSON.stringify(
          new URL("../lib/rental-domain.js", import.meta.url).href,
        ),
      )
      .replaceAll("import.meta.env.DEV", "true");
    const { createRentalRepository } = await import(
      `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
    );
    const live = createRentalRepository({ userId: "member" });
    access = false;
    assert.equal(await live.getAccess(), false);
    await assert.rejects(live.load(), /não está liberado/);
    access = true;
    const property = { title: "Apartamento", owner_name: "Proprietário" };
    await assert.rejects(live.saveProperty(property), /confirmar/);
    const saved = await createRentalRepository({
      userId: "member",
    }).saveProperty(property);
    const saves = calls.filter((c) => c.name === "save_rental_property");
    assert.equal(saves[0].args.p_values.id, saves[1].args.p_values.id);
    assert.equal(saved.id, saves[0].args.p_values.id);
    const receipt = {
      chargeId: "charge",
      amountCents: 100,
      date: "2024-02-02",
      method: "pix",
      note: "Parcial",
    };
    await assert.rejects(
      live.recordReceipt({
        ...receipt,
        requestId: "00000000-0000-4000-8000-000000000001",
      }),
      /confirmar/,
    );
    await createRentalRepository({ userId: "member" }).recordReceipt({
      ...receipt,
      requestId: "00000000-0000-4000-8000-000000000002",
    });
    const receipts = calls.filter((c) => c.name === "record_rental_receipt");
    assert.equal(receipts[0].args.p_request_id, receipts[1].args.p_request_id);
    const file = new File(["%PDF-1.7\nExample"], "contrato.pdf", {
      type: "application/pdf",
    });
    await assert.rejects(
      live.uploadDocument({ contractId: "contract", file }),
      /confirmar/,
    );
    const uploaded = await live.uploadDocument({
      contractId: "contract",
      file,
    });
    assert.equal(
      objects.size,
      1,
      "a metadata retry must reuse the uploaded object",
    );
    const uploads = calls.filter((c) => c.name === "register_rental_document");
    assert.equal(uploads[0].args.p_values.id, uploads[1].args.p_values.id);
    assert.equal(uploaded.id, uploads[0].args.p_values.id);
    await assert.rejects(
      live.uploadDocument({
        contractId: "contract",
        file: new File(["<html>"], "fake.pdf", { type: "application/pdf" }),
      }),
      /não corresponde/,
    );
    const demo = createRentalRepository({ demo: true, userId: "local" });
    const initial = await demo.load();
    assert.equal(initial.properties.length, 3);
    assert.ok(initial.properties.every((p) => p.title.startsWith("Exemplo")));
    const unpaid = initial.charges.find((c) => c.received_cents === 0);
    await demo.adjustCharge({
      chargeId: unpaid.id,
      amountCents: 200000,
      reason: "Ajuste de teste",
    });
    await demo.recordReceipt({
      chargeId: unpaid.id,
      amountCents: 100000,
      date: "2024-02-02",
    });
    const changed = (await demo.load()).charges.find((c) => c.id === unpaid.id);
    assert.deepEqual(
      [changed.amount_cents, changed.received_cents, changed.fee_cents],
      [200000, 100000, 10000],
    );
    await assert.rejects(
      demo.recordPayout({
        chargeId: unpaid.id,
        amountCents: 90001,
        date: "2024-02-02",
      }),
      /excede/,
    );
    await assert.rejects(
      demo.adjustCharge({
        chargeId: unpaid.id,
        amountCents: 100000,
        reason: "Alteração indevida",
      }),
      /recebimentos/,
    );
  } finally {
    delete globalThis.__rentalTestClient;
    if (originalSession === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = originalSession;
    if (originalLocal === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalLocal;
  }
});
