import test from "node:test";
import assert from "node:assert/strict";
import { createCrmTaskCache } from "../lib/crm-task-cache.js";

const task = (id, tipo = "ligacao", extra = {}) => ({ id, tipo, titulo: `Atividade ${id}`, leadId: 7, concluida: false, ...extra });
const sorted = (rows) => rows.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));

test("visitas mais recentes vencem o fetch completo antigo em qualquer ordem de resposta", () => {
  for (const visitsFirst of [false, true]) {
    const cache = createCrmTaskCache();
    const allToken = cache.beginRead(), visitToken = cache.beginRead();
    const allRows = [task(1), task(2, "visita"), task(3, "visita")];
    const visitRows = [task(2, "visita", { titulo: "Horário atualizado" }), task(4, "visita")];
    const responses = [() => cache.applyRead("tasks", allRows, allToken), () => cache.applyRead("visits", visitRows, visitToken)];
    if (visitsFirst) responses.reverse();
    for (const respond of responses) respond();
    assert.deepEqual(sorted(cache.snapshot().tasks), sorted([allRows[0], ...visitRows]));
    assert.deepEqual(sorted(cache.snapshot().visits), sorted(visitRows));
  }
});

test("consulta completa mais nova impede resposta de visitas antiga de restaurar dados ou exclusões", () => {
  const cache = createCrmTaskCache();
  const visits = cache.beginRead(), tasks = cache.beginRead();
  const converted = task(1, "ligacao", { titulo: "Visita virou ligação" });
  cache.applyRead("tasks", [converted], tasks);
  const current = cache.snapshot();
  cache.applyRead("visits", [task(1, "visita"), task(2, "visita")], visits);
  assert.equal(cache.snapshot(), current, "discarded reads preserve state references");
  assert.deepEqual(current.tasks, [converted]);
  assert.deepEqual(current.visits, []);
});

test("criação, edição e exclusão confirmadas durante a consulta vencem sua resposta atrasada", () => {
  const cache = createCrmTaskCache();
  cache.applyRead("tasks", [task(1), task(2, "visita")], cache.beginRead());
  const full = cache.beginRead(), visits = cache.beginRead();
  const updated = task(1, "visita", { titulo: "Confirmada pelo corretor", concluida: true });
  const created = task(4, "visita");
  cache.upsert(updated);
  cache.remove(2);
  cache.remove(3);
  cache.upsert(created);
  cache.applyRead("visits", [task(2, "visita"), task(3, "visita")], visits);
  cache.applyRead("tasks", [task(1), task(2, "visita"), task(3, "visita")], full);
  assert.deepEqual(sorted(cache.snapshot().tasks), sorted([updated, created]));
  assert.deepEqual(sorted(cache.snapshot().visits), sorted([updated, created]));
  const refresh = cache.beginRead();
  const serverUpdated = task(1, "ligacao", { titulo: "Alterada em outra sessão" });
  cache.applyRead("tasks", [serverUpdated, created], refresh);
  assert.deepEqual(sorted(cache.snapshot().tasks), sorted([serverUpdated, created]));
  assert.deepEqual(cache.snapshot().visits, [created], "a newer read can reflect a visit converted to another type");
});

test("leitura iniciada depois da edição vence mesmo se uma leitura intermediária responder por último", () => {
  const cache = createCrmTaskCache();
  const old = cache.beginRead();
  cache.upsert(task(1, "visita", { titulo: "Edição local" }));
  const fresh = cache.beginRead();
  const row = task(1, "visita", { titulo: "Estado novo do servidor" });
  cache.applyRead("visits", [row], fresh);
  cache.applyRead("tasks", [task(1), task(2)], old);
  assert.deepEqual(cache.snapshot().visits, [row]);
  assert.equal(cache.snapshot().tasks.find(item => item.id === 1).titulo, row.titulo);
  assert.equal(cache.snapshot().tasks.find(item => item.id === 2).id, 2);
});

test("converter visita por edição confirmada retira o cartão da aba sem perder a atividade", () => {
  const cache = createCrmTaskCache();
  cache.applyRead("visits", [task(1, "visita")], cache.beginRead());
  assert.equal(cache.snapshot().tasks.length, 1, "visits are available for editing before the full agenda loads");
  const stale = cache.beginRead();
  const converted = task(1, "whatsapp", { titulo: "Cliente preferiu mensagem" });
  cache.upsert(converted);
  cache.applyRead("visits", [task(1, "visita")], stale);
  assert.deepEqual(cache.snapshot().tasks, [converted]);
  assert.deepEqual(cache.snapshot().visits, []);
  const outdatedFull = cache.beginRead(), latestFull = cache.beginRead();
  cache.applyRead("tasks", [], latestFull);
  cache.applyRead("tasks", [converted], outdatedFull);
  assert.deepEqual(cache.snapshot(), { tasks: [], visits: [] }, "the older full snapshot cannot restore a row removed by the newer one");
});

test("excluir contato desvincula atividades conhecidas e as ainda em trânsito", () => {
  const cache = createCrmTaskCache();
  cache.upsert(task(1));
  const token = cache.beginRead();
  cache.unlinkLead("7");
  cache.applyRead("tasks", [task(1), task(2, "visita"), task(3, "ligacao", { leadId: 8 })], token);
  assert.equal(cache.snapshot().tasks.find(row => row.id === 1).leadId, null);
  assert.equal(cache.snapshot().visits[0].leadId, null);
  assert.equal(cache.snapshot().tasks.find(row => row.id === 3).leadId, 8);
  cache.applyRead("tasks", [task(2, "visita", { leadId: 9 })], cache.beginRead());
  assert.equal(cache.snapshot().visits[0].leadId, 9, "future reads can reflect an intentional later reassignment");
});

test("troca de conta invalida respostas anteriores e instâncias não compartilham atividades", () => {
  const cache = createCrmTaskCache(), anotherAccount = createCrmTaskCache();
  const old = cache.beginRead();
  cache.upsert(task(1));
  cache.reset();
  const next = cache.beginRead();
  assert.ok(next > old);
  cache.applyRead("tasks", [task(1)], old);
  assert.deepEqual(cache.snapshot(), { tasks: [], visits: [] });
  cache.applyRead("visits", [task(2, "visita")], next);
  assert.deepEqual(anotherAccount.snapshot(), { tasks: [], visits: [] });
  assert.equal(cache.snapshot().visits[0].id, 2);
});

test("consulta inválida não aplica somente parte da lista nem apaga dados existentes", () => {
  const cache = createCrmTaskCache();
  cache.upsert(task(1));
  const before = cache.snapshot();
  assert.throws(() => cache.applyRead("visits", [task(2, "visita"), task(3)], cache.beginRead()), /outro tipo/);
  assert.equal(cache.snapshot(), before);
  assert.throws(() => cache.applyRead("tasks", [task(2), task("2")], cache.beginRead()), /repetida/);
  assert.equal(cache.snapshot(), before);
});
