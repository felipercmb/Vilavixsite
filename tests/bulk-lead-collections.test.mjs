import test from "node:test";
import assert from "node:assert/strict";
import { moveLeadCollections, selectedLeadIds, toggleLeadSelection } from "../lib/bulk-lead-collections.js";

test("seleção atravessa páginas, permite desmarcar uma página e não inclui novas chegadas", () => {
  const rows = Array.from({ length: 32 }, (_, i) => ({ id: i + 1 }));
  let selected = toggleLeadSelection([], rows.slice(0, 15).map(row => row.id), true);
  selected = toggleLeadSelection(selected, [16, 18], true);
  assert.equal(selected.length, 17);
  selected = toggleLeadSelection(selected, rows.slice(0, 15).map(row => row.id), false);
  assert.deepEqual(selected, ["16", "18"]);
  assert.deepEqual(selectedLeadIds(selected, [{ id: 33 }, ...rows]), ["16", "18"]);
  assert.deepEqual(selectedLeadIds(selected, rows.filter(row => row.id !== 16)), ["18"]);
  assert.deepEqual(selectedLeadIds([18, "18", "99"], rows), ["18"]);
});

test("lote maior que mil confirma todos em lotes pequenos com patch exclusivo da carteira", async () => {
  const ids = Array.from({ length: 1207 }, (_, i) => String(i + 1));
  const calls = [], local = new Map(ids.map(id => [id, { id, carteira: null, corretor: "A", status: "atendimento", notas: "Não alterar" }]));
  const result = await moveLeadCollections([...ids, ids[0]], "prospeccao", async (batch, changes) => {
    assert.deepEqual(changes, { carteira: "prospeccao" });
    calls.push(batch);
    return { data: batch.map(id => ({ id, ...changes })) };
  }, (saved, changes) => saved.forEach(id => local.set(id, { ...local.get(id), ...changes })));
  assert.equal(calls.length, 13);
  assert.ok(calls.every(batch => batch.length <= 100));
  assert.deepEqual(result.confirmedIds, ids);
  assert.deepEqual(result.unconfirmedIds, []);
  assert.equal(result.error, null);
  assert.deepEqual(local.get("1207"), { id: "1207", carteira: "prospeccao", corretor: "A", status: "atendimento", notas: "Não alterar" });
});

test("linhas omitidas por permissão e respostas inconsistentes nunca contam como sucesso", async () => {
  const confirmed = [];
  const result = await moveLeadCollections([1, 2, 3, 4], "entrada", async () => ({ data: [
    { id: 1, carteira: "entrada" }, { id: 1, carteira: "entrada" },
    { id: 2, carteira: "prospeccao" }, { id: 99, carteira: "entrada" },
  ] }), ids => confirmed.push(...ids));
  assert.deepEqual(confirmed, ["1"]);
  assert.deepEqual(result.confirmedIds, ["1"]);
  assert.deepEqual(result.unconfirmedIds, ["2", "3", "4"]);
});

test("queda de conexão preserva confirmações anteriores e mantém o restante para nova tentativa", async () => {
  const ids = Array.from({ length: 250 }, (_, i) => String(i + 1));
  let calls = 0;
  const result = await moveLeadCollections(ids, "entrada", async batch => {
    calls++;
    if (calls === 2) throw new Error("Conexão interrompida");
    return { data: batch.map(id => ({ id, carteira: "entrada" })) };
  });
  assert.equal(calls, 2);
  assert.deepEqual(result.confirmedIds, ids.slice(0, 100));
  assert.deepEqual(result.unconfirmedIds, ids.slice(100));
  assert.match(result.error.message, /Conexão/);
  const retry = await moveLeadCollections(result.unconfirmedIds, "entrada", async batch => ({ data: batch.map(id => ({ id, carteira: "entrada" })) }));
  assert.deepEqual(retry.confirmedIds, ids.slice(100));
});

test("erro retornado ou resposta vazia não confirma nenhum lead; destino inválido não escreve", async () => {
  for (const response of [{ error: new Error("Sessão expirada") }, { data: null }, { data: [] }]) {
    const result = await moveLeadCollections([1, 2], "entrada", async () => response);
    assert.deepEqual(result.confirmedIds, []);
    assert.deepEqual(result.unconfirmedIds, ["1", "2"]);
  }
  let wrote = false;
  await assert.rejects(moveLeadCollections([1], "all", async () => { wrote = true; }), /Escolha/);
  assert.equal(wrote, false);
  assert.deepEqual(await moveLeadCollections([], "entrada", async () => { wrote = true; }), { confirmedIds: [], unconfirmedIds: [], error: null });
  assert.equal(wrote, false);
});
