import test from "node:test";
import assert from "node:assert/strict";
import { filterPortfolio, isOwnLead, leadNeedsFollowup, nextTaskForLead, searchProperties, groupTasksByDay, postponeTaskDate, saveLeadInteraction } from "../lib/broker-workflow.js";

test("carteira usa o ID do responsável e admite nomes legados somente quando não há ID", () => {
  const profile = { id: "broker-1", nome: "João Silva" };
  const own = { id: 1, corretorId: "broker-1", corretor: "João Silva" };
  const legacy = { id: 2, corretor: "Joao Silva" };
  const homonym = { id: 3, corretorId: "broker-2", corretor: "João Silva" };
  const none = { id: 4, corretor: "" };
  assert.deepEqual(filterPortfolio([own, legacy, homonym, none], "mine", profile), [own, legacy]);
  assert.deepEqual(filterPortfolio([own, legacy, homonym, none], "unassigned", profile), [none]);
  assert.equal(isOwnLead(own, null), false);
});

test("retorno identifica a próxima pendência e exclui contatos encerrados da fila sem retorno", () => {
  const tasks = [{ id: 1, leadId: 7, data: "2026-09-15", hora: "15:00", concluida: false }, { id: 2, leadId: "7", data: "2026-09-13", hora: "09:00", concluida: true }, { id: 3, leadId: "7", data: "2026-09-14", hora: "10:00", concluida: false }];
  assert.equal(nextTaskForLead(7, tasks).id, 3);
  assert.equal(leadNeedsFollowup({ id: 7, status: "atendimento" }, tasks), false);
  assert.equal(leadNeedsFollowup({ id: 8, status: "atendimento" }, tasks), true);
  assert.equal(leadNeedsFollowup({ id: 8, status: "fechado" }, tasks), false);
  assert.equal(leadNeedsFollowup({ id: 8, status: "descartado" }, tasks), false);
});

test("busca de imóvel combina código, título e bairro com limite e prioridade do código exato", () => {
  const items = [{ codigo: "1234", titulo: "Casa em área verde", bairro: "Itapuã" }, { codigo: "123", titulo: "Apartamento", bairro: "Itapuã" }];
  assert.equal(searchProperties(items, "123", 1)[0].codigo, "123");
  assert.equal(searchProperties(items, "itapua casa").length, 1);
  assert.equal(searchProperties(items, "").length, 0);
  assert.equal(searchProperties(items, "casa inexistente").length, 0);
});

test("agenda ordena dias e horários sem alterar os dados e adia atrasos a partir de hoje", () => {
  const tasks = [{ id: 1, data: "2026-10-01", hora: "15:00" }, { id: 2, data: "2026-09-30", hora: "09:00" }, { id: 3, data: "2026-10-01", hora: "10:00" }, { id: 4 }];
  assert.deepEqual(groupTasksByDay(tasks).map((group) => group.tasks.map((task) => task.id)), [[2], [3, 1], [4]]);
  assert.equal(tasks[0].id, 1);
  assert.equal(postponeTaskDate("2026-09-12", 1, "2026-09-30"), "2026-10-01");
  assert.equal(postponeTaskDate("2026-12-31", 1, "2026-09-30"), "2027-01-01");
  assert.equal(postponeTaskDate(null, 1, "2026-09-30"), "2026-10-01");
  assert.throws(() => postponeTaskDate("2026-02-31", 1, "2026-01-01"));
});

test("falha ao agendar preserva o atendimento confirmado e a repetição não duplica anotação", async () => {
  let notes = 0, tasks = 0, progress = {};
  const input = { leadId: 7, note: " Conversamos sobre a visita. ", followup: { titulo: "Confirmar visita", data: "2026-09-15", hora: "10:00" } };
  const actions = { addComment: async (id, note) => { assert.equal(id, 7); assert.equal(note, "Conversamos sobre a visita."); notes++; }, addTask: async () => { throw new Error("Banco indisponível"); }, onProgress: (value) => { progress = value; } };
  await assert.rejects(saveLeadInteraction(input, actions), /Atendimento registrado.*retorno não foi agendado/);
  assert.deepEqual(progress, { comment: true });
  const result = await saveLeadInteraction(input, { ...actions, addTask: async (task) => { tasks++; assert.equal(task.leadId, 7); } }, progress);
  assert.deepEqual(result, { comment: true, task: true });
  assert.equal(notes, 1);
  assert.equal(tasks, 1);
});

test("falha no atendimento não agenda retorno nem apresenta progresso confirmado", async () => {
  let tasks = 0, updates = 0;
  await assert.rejects(saveLeadInteraction({ leadId: 1, note: "Tentei ligar", followup: { titulo: "Ligar novamente", data: "2026-09-13", hora: "09:00" } }, { addComment: async () => { throw new Error("Sem permissão"); }, addTask: async () => { tasks++; }, onProgress: () => { updates++; } }), /Sem permissão/);
  assert.equal(tasks, 0);
  assert.equal(updates, 0);
});
