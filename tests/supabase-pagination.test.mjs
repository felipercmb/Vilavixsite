import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { readAllRows } from "../lib/supabase-pagination.js";

const makeRows = (length) => Array.from({ length }, (_, index) => ({
  id: index + 1,
  created_at: "2026-09-12T12:00:00Z",
  status: "disponivel",
}));

function assertComplete(result, expected) {
  assert.equal(result.error, null);
  assert.equal(result.data?.length, expected.length);
  assert.deepEqual(result.data, expected);
}

// Exercise the actual Supabase query builder against a local fake HTTP endpoint.
// Its row cap can be lower than the client's requested range.
function fakeServer(rows, { serverLimit = 1000, includeCount = true, respond } = {}) {
  const calls = [];
  const client = createClient("https://pagination-test.supabase.co", "public-test-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(input instanceof Request ? input.url : input);
        const from = Number(url.searchParams.get("offset") || 0);
        const limit = Number(url.searchParams.get("limit"));
        const order = url.searchParams.get("order");
        calls.push({ from, limit, order, prefer: new Headers(init.headers).get("prefer") });
        const override = respond?.({ from, limit, request: calls.length });
        if (override) return override;

        const filter = url.searchParams.get("status");
        const selected = rows.filter((row) => !filter || filter === `eq.${row.status}`);
        selected.sort((left, right) => {
          for (const item of (order || "").split(",")) {
            const [column, direction] = item.split(".");
            if (left[column] === right[column]) continue;
            const compared = left[column] < right[column] ? -1 : 1;
            return direction === "desc" ? -compared : compared;
          }
          return 0;
        });
        const page = selected.slice(from, from + Math.min(limit, serverLimit));
        return new Response(JSON.stringify(page), {
          headers: {
            "content-type": "application/json",
            "content-range": `${from}-${from + page.length - 1}/${includeCount ? selected.length : "*"}`,
          },
        });
      },
    },
  });
  return {
    calls,
    query: (options) => client.from("items").select("*", options).order("created_at", { ascending: false }),
  };
}

test("carrega 18.026 registros com desempate por id e mantém filtro em todas as páginas", async () => {
  const expected = makeRows(18026);
  const { query, calls } = fakeServer([
    { id: 0, created_at: "2026-10-01T12:00:00Z", status: "vendido" },
    ...expected.toReversed(),
  ]);
  const result = await readAllRows((options) => query(options).eq("status", "disponivel"));
  assertComplete(result, expected);
  assert.equal(calls.length, 19);
  assert.equal(calls.at(-1).from, 18000);
  for (const call of calls) {
    assert.equal(call.order, "created_at.desc,id.asc");
    assert.match(call.prefer, /count=exact/);
  }
});

test("total exato encerra na última página cheia sem consulta adicional", async () => {
  const rows = makeRows(2000);
  const { query, calls } = fakeServer(rows);
  assertComplete(await readAllRows(query), rows);
  assert.deepEqual(calls.map((call) => call.from), [0, 1000]);
});

test("sem total, última página cheia exige página vazia para confirmar o fim", async () => {
  const rows = makeRows(2000);
  const { query, calls } = fakeServer(rows, { includeCount: false });
  assertComplete(await readAllRows(query), rows);
  assert.deepEqual(calls.map((call) => call.from), [0, 1000, 2000]);
});

for (const includeCount of [true, false]) {
  test(`limite do servidor menor que a página não perde registros (total ${includeCount ? "disponível" : "ausente"})`, async () => {
    const rows = makeRows(2200);
    const { query, calls } = fakeServer(rows, { serverLimit: 137, includeCount });
    assertComplete(await readAllRows(query), rows);
    assert.equal(calls.length, includeCount ? 17 : 18);
    assert.deepEqual(calls.slice(0, 3).map((call) => call.from), [0, 137, 274]);
    assert.equal(calls.at(-1).from, includeCount ? 2192 : 2200);
  });
}

test("coleção vazia retorna sucesso vazio", async () => {
  const { query, calls } = fakeServer([]);
  assert.deepEqual(await readAllRows(query), { data: [], error: null });
  assert.equal(calls.length, 1);
});

test("erro na segunda página descarta o resultado parcial e preserva o erro do banco", async () => {
  const { query, calls } = fakeServer(makeRows(2200), {
    respond: ({ request }) => request === 2 ? new Response(JSON.stringify({
      message: "Consulta indisponível", code: "42501", details: "", hint: "",
    }), { status: 403, headers: { "content-type": "application/json" } }) : null,
  });
  const result = await readAllRows(query);
  assert.equal(result.data, null);
  assert.equal(result.error.code, "42501");
  assert.equal(result.error.message, "Consulta indisponível");
  assert.equal(calls.length, 2);
});

test("exceção depois da primeira página também preserva contrato sem dados parciais", async () => {
  const original = new Error("Conexão interrompida");
  let requests = 0;
  const result = await readAllRows(() => ({
    order() { return this; },
    async range() {
      requests += 1;
      if (requests === 2) throw original;
      return { data: makeRows(2), error: null, count: null };
    },
  }));
  assert.equal(result.data, null);
  assert.equal(result.error, original);
});

test("limite de consultas devolve erro explícito em vez de truncar", async () => {
  const { query, calls } = fakeServer(makeRows(3000));
  const result = await readAllRows(query, { maxRequests: 2 });
  assert.equal(result.data, null);
  assert.equal(result.error.code, "PAGINATION_LIMIT");
  assert.equal(calls.length, 2);
});

test("página vazia antes do total esperado não é apresentada como leitura completa", async () => {
  const { query } = fakeServer(makeRows(2200), {
    respond: ({ request }) => request === 2 ? new Response("[]", {
      headers: { "content-type": "application/json", "content-range": "*/2200" },
    }) : null,
  });
  const result = await readAllRows(query);
  assert.equal(result.data, null);
  assert.equal(result.error.code, "PAGINATION_INCOMPLETE");
});

test("mudança no total durante a consulta exige nova leitura", async () => {
  const { query } = fakeServer(makeRows(2200), {
    respond: ({ request }) => request === 2 ? new Response(JSON.stringify(makeRows(1000)), {
      headers: { "content-type": "application/json", "content-range": "1000-1999/2201" },
    }) : null,
  });
  const result = await readAllRows(query);
  assert.equal(result.data, null);
  assert.equal(result.error.code, "PAGINATION_CHANGED");
});

test("sem total, remove duplicatas entre páginas e continua até a página vazia", async () => {
  const pages = [[{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }], []];
  const offsets = [];
  const result = await readAllRows(() => ({
    order() { return this; },
    async range(from) {
      offsets.push(from);
      return { data: pages.shift(), error: null, count: null };
    },
  }));
  assert.deepEqual(result, { data: [{ id: 1 }, { id: 2 }, { id: 3 }], error: null });
  assert.deepEqual(offsets, [0, 2, 4]);
});

test("página repetida sem progresso falha imediatamente", async () => {
  let requests = 0;
  const result = await readAllRows(() => ({
    order() { return this; },
    async range() {
      requests += 1;
      return { data: [{ id: 1 }], error: null, count: null };
    },
  }));
  assert.equal(result.data, null);
  assert.equal(result.error.code, "PAGINATION_STALLED");
  assert.equal(requests, 2);
});

test("duplicatas não cumprem um total exato de registros distintos", async () => {
  const pages = [[{ id: 1 }, { id: 2 }], [{ id: 2 }]];
  const result = await readAllRows(() => ({
    order() { return this; },
    async range() { return { data: pages.shift(), error: null, count: 3 }; },
  }));
  assert.equal(result.data, null);
  assert.equal(result.error.code, "PAGINATION_CHANGED");
});
