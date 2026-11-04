import test from 'node:test';
import assert from 'node:assert/strict';
import {managementPeriod,managementParams} from '../lib/reactivation-management-model.js';
test('períodos inclusivos atravessam mês, ano e fevereiro bissexto',()=>{
 assert.deepEqual(managementPeriod('7','2026-01-03'),{from:'2025-12-28',to:'2026-01-03'});
 assert.equal(managementPeriod('30','2024-03-01').from,'2024-02-01');
 assert.equal(managementPeriod('month','2026-11-04').from,'2026-11-01');
 assert.equal(managementPeriod('all','2026-11-04').from,'');
});
test('parâmetros preservam o período e validam a ordem das datas',()=>{
 const p=managementParams({from:'',to:'2020-01-01',query:'  contato  '});assert.equal(p.p_from,null);assert.equal(p.p_query,'contato');assert.equal(p.p_worker_id,null);
 assert.throws(()=>managementParams({from:'2020-01-02',to:'2020-01-01'}),/período válido/);
 assert.throws(()=>managementParams({from:'',to:''}),/período válido/);
});
