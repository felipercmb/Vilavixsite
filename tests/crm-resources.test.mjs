import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrmResourceLoader, crmResourcePlan } from '../lib/crm-resources.js';
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };

test('funil entrega contatos sem esperar agenda; visitas não solicita tarefas gerais nem catálogo', async () => {
  const waiting = deferred(); const data = []; const calls = [];
  const loader = createCrmResourceLoader(Object.fromEntries(['leads', 'profiles', 'visits', 'tasks'].map(name => [name, () => { calls.push(name); return name === 'tasks' ? waiting.promise : { data: [name] }; }])), { onStatus() {}, onData: (name) => data.push(name) });
  const plan = crmResourcePlan('funil');
  const background = loader.ensure(plan.background);
  await loader.ensure(plan.required);
  assert.deepEqual(data.sort(), ['leads', 'profiles']);
  assert.ok(!data.includes('tasks'));
  const visits = crmResourcePlan('visitas');
  assert.ok(![...visits.required, ...visits.background].includes('tasks'));
  assert.ok(!visits.required.includes('properties'));
  await loader.ensure(visits.required);
  assert.equal(calls.filter(name => name === 'leads').length, 1);
  waiting.resolve({ data: [] }); await background; loader.dispose();
});

test('troca de aba reutiliza consulta pendente e cache; atualizar consulta novamente', async () => {
  const waiting = deferred(); let calls = 0;
  const loader = createCrmResourceLoader({ leads: () => { calls++; return waiting.promise; } }, { onStatus() {}, onData() {} });
  const first = loader.load('leads'); const second = loader.load('leads');
  assert.equal(first, second);
  waiting.resolve({ data: [] }); await first;
  await loader.load('leads'); assert.equal(calls, 1);
  await loader.load('leads', { refresh: true }); assert.equal(calls, 2);
  loader.dispose();
});

test('erro da agenda não invalida contatos prontos nem transforma erro em lista vazia', async () => {
  const states = {}; const data = [];
  const loader = createCrmResourceLoader({ leads: () => ({ data: [1, 2] }), tasks: () => ({ error: new Error('Sem conexão') }) }, { onStatus: (name, value) => states[name] = value, onData: (name) => data.push(name) });
  await loader.ensure(['leads', 'tasks']);
  assert.equal(states.leads.state, 'ready'); assert.equal(states.tasks.state, 'error');
  assert.deepEqual(data, ['leads']); loader.dispose();
});

test('sessão encerrada aborta consulta e ignora dados e estados tardios', async () => {
  const waiting = deferred(); let signal; const states = []; const data = [];
  const loader = createCrmResourceLoader({ leads: incoming => { signal = incoming; return waiting.promise; } }, { onStatus: (_, value) => states.push(value.state), onData: value => data.push(value) });
  const pending = loader.load('leads'); await Promise.resolve(); loader.dispose();
  assert.equal(signal.aborted, true); waiting.resolve({ data: ['private'] }); await pending;
  assert.deepEqual(data, []); assert.deepEqual(states, ['loading']);
});

test('consulta travada tem prazo, erro explícito e não bloqueia tentativa seguinte', async () => {
  let calls = 0; const states = [];
  const loader = createCrmResourceLoader({ leads: () => ++calls === 1 ? new Promise(() => {}) : { data: [] } }, { timeoutMs: 10, onStatus: (_, value) => states.push(value.state), onData() {} });
  await loader.load('leads'); assert.equal(states.at(-1), 'error');
  await loader.load('leads'); assert.equal(states.at(-1), 'ready'); loader.dispose();
});
