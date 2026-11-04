import test from 'node:test';
import assert from 'node:assert/strict';
import {reactivationDay,nextReactivationDay,reactivationQueue,reactivationSummary} from '../lib/reactivation-model.js';
test('agenda diária segue São Paulo na virada UTC, fim de mês e ano',()=>{
 assert.equal(reactivationDay(new Date('2026-11-05T01:00:00Z')),'2026-11-04');
 assert.equal(reactivationDay(new Date('2026-11-05T03:00:00Z')),'2026-11-05');
 assert.equal(nextReactivationDay('2026-12-31'),'2027-01-01');
 assert.equal(nextReactivationDay('2028-02-28'),'2028-02-29');
});
test('resumo de prazos separa dias inclusivos, exclui finalizados e mantém a mesma fila dos atalhos',()=>{
 const rows=[{id:1,status:'active',next_contact_on:'2026-12-31'},{id:2,status:'active',next_contact_on:'2027-01-01'},{id:3,status:'active',next_contact_on:'2027-01-02'},{id:4,status:'reactivated',next_contact_on:'2026-12-30'},{id:5,status:'closed',next_contact_on:'2027-01-01'}];
 assert.deepEqual(reactivationSummary(rows,'2027-01-01'),{active:3,overdue:1,dueToday:1,scheduled:1});
 assert.deepEqual(reactivationQueue(rows,'overdue','','2027-01-01').map(r=>r.id),[1]);
 assert.deepEqual(reactivationQueue(rows,'due_today','','2027-01-01').map(r=>r.id),[2]);
 assert.deepEqual(reactivationQueue(rows,'scheduled','','2027-01-01').map(r=>r.id),[3]);
 assert.deepEqual(reactivationSummary(rows,'2027-01-02'),{active:3,overdue:2,dueToday:1,scheduled:0});
 assert.deepEqual(reactivationSummary([],'2027-01-01'),{active:0,overdue:0,dueToday:0,scheduled:0});
});
test('fila reúne atrasados e hoje, preserva futuros e separa histórico; busca aceita acentos e telefone',()=>{
 const rows=[{id:1,status:'active',next_contact_on:'2026-11-05',lead_name:'João'},{id:2,status:'active',next_contact_on:'2026-11-04',lead_name:'Márcia',lead:{telefone:'27999990000'}},{id:3,status:'active',next_contact_on:'2026-11-02',lead_name:'Contato atrasado'},{id:4,status:'reactivated',next_contact_on:'2026-11-01',lead_name:'Retornou'}];
 assert.deepEqual(reactivationQueue(rows,'today','','2026-11-04').map(r=>r.id),[3,2]);
 assert.deepEqual(reactivationQueue(rows,'active','joao','2026-11-04').map(r=>r.id),[1]);
 assert.deepEqual(reactivationQueue(rows,'active','2799999','2026-11-04').map(r=>r.id),[2]);
 assert.deepEqual(reactivationQueue(rows,'reactivated','','2026-11-04').map(r=>r.id),[4]);
 assert.equal(rows[0].id,1);
});
