import test from 'node:test';
import assert from 'node:assert/strict';
import {groupManagementActivities,managementPeriodLabel} from '../lib/remalho-presentation.js';
test('diário agrupa pelo dia de Brasília e preserva registros completos na virada da meia-noite',()=>{
 const items=[{id:1,created_at:'2026-11-04T02:59:59Z',body:'antes'},{id:2,created_at:'2026-11-04T03:00:00Z',body:'depois'},{id:3,created_at:'2026-11-04T02:59:59Z',body:'outro'}];
 const groups=groupManagementActivities(items);
 assert.deepEqual(groups.map(g=>g.day),['2026-11-04','2026-11-03']);
 assert.deepEqual(groups[1].items.map(n=>n.id),[3,1]);
 assert.equal(groups[0].items[0].body,'depois');assert.deepEqual(items.map(n=>n.id),[1,2,3]);
});
test('rótulos identificam ambos os anos quando o período atravessa dezembro',()=>{
 const label=managementPeriodLabel({from:'2025-12-20',to:'2026-01-10'});
 assert.match(label,/2025/);assert.match(label,/2026/);
 assert.match(managementPeriodLabel({from:null,to:'2026-11-04'}),/Todo o histórico/);
 assert.equal(groupManagementActivities([]).length,0);
});
