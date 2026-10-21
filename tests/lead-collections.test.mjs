import test from "node:test";
import assert from "node:assert/strict";
import { leadCollection, filterLeadCollection, contactNavigation, leadCollectionChange } from "../lib/lead-collections.js";
import { dbToLead, leadToDb } from "../lib/mappers.js";
import { buildPipelineModel } from "../lib/pipeline-model.js";

const historicalNote = "Importado da planilha de leads da VilaVix. Campanha: [Bella Fiore].";

test("escolha manual vence a procedência nos dois sentidos e sobrevive ao mapeamento do banco", () => {
  const historic = { id: 1, notas: historicalNote, status: "atendimento", corretor: "Corretor A" };
  const toEntries = { ...historic, ...leadCollectionChange("entrada") };
  assert.equal(leadCollection(dbToLead(leadToDb(toEntries))), "entrada");
  const toProspects = { ...toEntries, notas: "Observações alteradas", ...leadCollectionChange("prospeccao") };
  assert.equal(leadCollection(dbToLead(leadToDb(toProspects))), "prospeccao");
  assert.equal(leadCollection({ ...historic, carteira: null }), "prospeccao");
  assert.equal(leadCollection({ ...historic, carteira: "inválida" }), "prospeccao");
});

test("mudança manual envia apenas a carteira e rejeita valores que não são carteiras", () => {
  assert.deepEqual(leadCollectionChange("entrada"), { carteira: "entrada" });
  assert.deepEqual(leadCollectionChange("prospeccao"), { carteira: "prospeccao" });
  for (const value of ["all", "__proto__", "novo", "", null]) assert.throws(() => leadCollectionChange(value), /Escolha/);
  assert.equal(Object.hasOwn(leadToDb({ nome: "Importação automática" }), "carteira"), false);
});

test("prospecção segue a importação histórica, sem confundir idade, origem, remarketing ou etapa", () => {
  const entries = [
    { id: 1, data: "2026-04-01", origem: "Meta Ads", status: "novo", notas: "Campanha: Remarketing Bella Fiore" },
    { id: 2, data: "2026-10-21", origem: "Meta Ads", status: "atendimento", notas: historicalNote },
    { id: 3, origem: "Manual", status: "descartado", notas: "Cliente da carteira" },
    { id: 4, origem: "Meta Ads", status: "fechado", notas: historicalNote },
  ];
  assert.equal(leadCollection(entries[0]), "entrada");
  assert.deepEqual(filterLeadCollection(entries, "prospeccao").map(row => row.id), [2, 4]);
  assert.deepEqual(filterLeadCollection(entries, "entrada").map(row => row.id), [1, 3]);
  assert.equal(filterLeadCollection(entries).length, 4);
});

test("funil separa carteiras em todas as etapas e preserva o filtro de responsável", () => {
  const rows = [
    { id: 1, status: "novo", corretorId: "a", notas: historicalNote },
    { id: 2, status: "atendimento", corretorId: "a" },
    { id: 3, status: "fechado", corretorId: "a", notas: historicalNote },
    { id: 4, status: "novo", corretorId: "b", notas: historicalNote },
  ];
  const filters = { scope: "mine", profile: { id: "a" }, collection: "prospeccao" };
  const prospects = buildPipelineModel(rows, new Map(), filters);
  assert.equal(prospects.scopeTotal, 2);
  assert.equal(prospects.total, 2);
  assert.equal(prospects.columns[0].count, 1);
  assert.equal(prospects.columns[4].count, 1);
  const entries = buildPipelineModel(rows, new Map(), { ...filters, collection: "entrada" });
  assert.equal(entries.total, 1);
  assert.equal(entries.columns[1].count, 1);
  assert.equal(buildPipelineModel(rows, new Map(), { ...filters, collection: "all" }).total, 3);
});

test("setas atravessam a paginação da lista filtrada sem saltar para novos leads ou registros excluídos", () => {
  const leads = Array.from({ length: 32 }, (_, index) => ({ id: index + 1 }));
  const queue = leads.filter(row => row.id % 2).map(row => row.id);
  const afterArrival = [{ id: 33 }, ...leads];
  assert.deepEqual(contactNavigation(queue, 29, afterArrival), { position: 15, total: 16, previous: "27", next: "31" });
  assert.equal(contactNavigation(queue, 1, leads).previous, null);
  assert.equal(contactNavigation(queue, 31, leads).next, null);
  const afterDelete = leads.filter(row => row.id !== 3);
  assert.equal(contactNavigation(queue, 1, afterDelete).next, "5");
  assert.equal(contactNavigation(queue, 2, leads).position, 0);
  assert.equal(contactNavigation(queue, 2, leads).next, null);
});

test("alterar a etapa do contato mantém a posição da fila aberta e não modifica o snapshot", () => {
  const leads = [{ id: 7, status: "novo" }, { id: 8, status: "novo" }, { id: 9, status: "novo" }];
  const queue = leads.map(row => row.id);
  const saved = leads.map(row => row.id === 8 ? { ...row, status: "atendimento" } : row);
  assert.deepEqual(contactNavigation(queue, 8, saved), { position: 2, total: 3, previous: "7", next: "9" });
  assert.equal(leads[1].status, "novo");
  assert.deepEqual(queue, [7, 8, 9]);
});
