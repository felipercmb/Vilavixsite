import test from 'node:test';
import assert from 'node:assert/strict';
import {reactivationDay,nextReactivationDay,reactivationQueue} from '../lib/reactivation-model.js';
test('agenda diária segue São Paulo na virada UTC, fim de mês e ano',()=>{
 assert.equal(reactivationDay(new Date('2026-11-05T01:00:00Z')),'2026-11-04');
 assert.equal(reactivationDay(new Date('2026-11-05T03:00:00Z')),'2026-11-05');
 assert.equal(nextReactivationDay('2026-12-31'),'2027-01-01');
 assert.equal(nextReactivationDay('2028-02-28'),'2028-02-29');
});
test('fila reúne atrasados e hoje, preserva futuros e separa histórico; busca aceita acentos e telefone',()=>{
 const rows=[{id:1,status:'active',next_contact_on:'2026-11-05',lead_name:'João'},{id:2,status:'active',next_contact_on:'2026-11-04',lead_name:'Márcia',lead:{telefone:'27999990000'}},{id:3,status:'active',next_contact_on:'2026-11-02',lead_name:'Contato atrasado'},{id:4,status:'reactivated',next_contact_on:'2026-11-01',lead_name:'Retornou'}];
 assert.deepEqual(reactivationQueue(rows,'today','','2026-11-04').map(r=>r.id),[3,2]);
 assert.deepEqual(reactivationQueue(rows,'active','joao','2026-11-04').map(r=>r.id),[1]);
 assert.deepEqual(reactivationQueue(rows,'active','2799999','2026-11-04').map(r=>r.id),[2]);
 assert.deepEqual(reactivationQueue(rows,'reactivated','','2026-11-04').map(r=>r.id),[4]);
 assert.equal(rows[0].id,1);
});
