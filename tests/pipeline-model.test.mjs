import test from "node:test";
import assert from "node:assert/strict";
import { indexNextTasks, nextTaskForLead } from "../lib/broker-workflow.js";
import { PIPELINE_STAGES, buildPipelineModel, getPipelinePage } from "../lib/pipeline-model.js";

test("funil mantém 2.201 contatos nas seis etapas e permite percorrer todos com no máximo 20 cartões por coluna", () => {
  const leads = Array.from({ length: 2201 }, (_, index) => ({ id: index + 1, nome: `Contato ${index + 1}`, status: PIPELINE_STAGES[index % 6], data: "2026-09-12" }));
  const model = buildPipelineModel(leads, new Map());
  assert.equal(model.total, 2201);
  assert.deepEqual(model.columns.map((column) => column.id), PIPELINE_STAGES);
  assert.equal(model.columns.reduce((sum, column) => sum + column.count, 0), 2201);
  assert.ok(model.columns.find((column) => column.id === "fechado").count > 0);
  assert.ok(model.columns.find((column) => column.id === "descartado").count > 0);
  const ids = [];
  for (const column of model.columns) {
    const first = getPipelinePage(column.leads);
    assert.equal(first.total, column.count);
    for (let page = 1; page <= first.pages; page++) {
      const batch = getPipelinePage(column.leads, page);
      assert.ok(batch.items.length <= 20);
      ids.push(...batch.items.map((lead) => lead.id));
    }
  }
  assert.equal(ids.length, 2201);
  assert.equal(new Set(ids).size, 2201);
  assert.deepEqual(ids.slice().sort((a, b) => a - b), leads.map((lead) => lead.id));
  assert.equal(leads[0].id, 1, "sorting does not mutate source state");
});

test("próximos retornos fazem uma única passagem nas 18.026 tarefas para 2.201 consultas", () => {
  let visited = 0;
  const tasks = Array.from({ length: 18026 }, (_, index) => ({ id: index + 1, leadId: (index % 2201) + 1, concluida: index % 3 === 0, data: "2026-09-15", hora: "09:00" }));
  const tracked = new Proxy(tasks, { get(target, property, receiver) {
    if (property === Symbol.iterator) return function* () { for (const task of target) { visited++; yield task; } };
    return Reflect.get(target, property, receiver);
  } });
  for (let lead = 1; lead <= 2201; lead++) nextTaskForLead(lead, tracked);
  assert.equal(visited, 18026, "lookups must not rescan or sort the entire task collection for each lead");
  assert.equal(indexNextTasks(tracked), indexNextTasks(tracked));
});

test("índice de tarefas preserva empate estável, ignora concluídas e acompanha novas referências após gravação", () => {
  const tasks = [
    { id: 1, leadId: 7, data: "2026-09-14", hora: "09:00", concluida: true },
    { id: 2, leadId: "7", data: "2026-09-15", hora: "10:00" },
    { id: 3, leadId: 7, data: "2026-09-15", hora: "10:00" },
    { id: 4, leadId: 7, data: "2026-09-16", hora: "08:00" },
    { id: 5, leadId: null, data: "2026-09-01" },
  ];
  assert.equal(nextTaskForLead(7, tasks).id, 2);
  assert.equal(nextTaskForLead(null, tasks), null);
  const afterCompletion = tasks.map((task) => task.id === 2 ? { ...task, concluida: true } : task);
  assert.equal(nextTaskForLead(7, afterCompletion).id, 3);
  assert.equal(nextTaskForLead(7, tasks).id, 2, "a different snapshot does not overwrite the earlier one");
});

test("filtros não ampliam dados permitidos, reconhecem responsável legado e totalizam retorno sem ocultar etapas", () => {
  const profile = { id: "a", nome: "João" };
  const leads = [
    { id: 1, nome: "João Cliente", status: "novo", corretorId: "a", corretor: "João", telefone: "(27) 99999-9999", prioridade: "alta", origem: "Meta Ads" },
    { id: 2, nome: "Legado", status: "contato", corretor: "João", prioridade: "media", origem: "Site" },
    { id: 3, nome: "Outro João", status: "fechado", corretorId: "b", corretor: "João" },
    { id: 4, nome: "Sem responsável", status: "proposta", corretor: "" },
  ];
  const index = indexNextTasks([{ leadId: 2, titulo: "Retorno", data: "2026-09-10", hora: "09:00" }]);
  const mine = buildPipelineModel(leads, index, { scope: "mine", profile });
  assert.equal(mine.total, 2);
  assert.equal(mine.columns[1].count, 1, "the legacy contato stage belongs to atendimento");
  const broker = buildPipelineModel(leads, index, { broker: "id:a", brokerName: "João" });
  assert.equal(broker.total, 2, "a namesake with a different ID is excluded, while a legacy name-only lead remains visible");
  assert.equal(buildPipelineModel(leads, index, { query: "joao 27999999999" }).total, 1);
  const missing = buildPipelineModel(leads, index, { scope: "mine", profile, returnState: "missing", day: "2026-09-12" });
  assert.equal(missing.total, 1); assert.equal(missing.columns.length, 6);
  assert.equal(missing.columns[0].noReturnCount, 1);
  const late = buildPipelineModel(leads, index, { returnState: "overdue", day: "2026-09-12" });
  assert.equal(late.total, 1); assert.equal(late.columns[1].overdueCount, 1);
  assert.equal(buildPipelineModel(leads.slice(0, 1), index, { scope: "all", profile }).total, 1, "all means only the rows supplied by the authorized database read");
});

test("etapas desconhecidas são contabilizadas para revisão e a página ajusta quando a coluna diminui", () => {
  const rows = [{ id: 1, status: "novo" }, { id: 2, status: "qualificação antiga" }, { id: 3, status: " FECHADO " }];
  const model = buildPipelineModel(rows, new Map());
  assert.equal(model.total, 3);
  assert.deepEqual(model.unknown.map((lead) => lead.id), [2]);
  assert.equal(model.columns[4].count, 1);
  const last = getPipelinePage(rows, 9, 2);
  assert.equal(last.page, 2); assert.equal(last.start, 3); assert.equal(last.end, 3);
  const afterMove = getPipelinePage(rows.slice(0, 2), 2, 2);
  assert.equal(afterMove.page, 1); assert.equal(afterMove.total, 2);
  assert.deepEqual(getPipelinePage([], 7).items, []);
});
