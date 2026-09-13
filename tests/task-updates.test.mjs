import test from 'node:test';
import assert from 'node:assert/strict';
import { taskChangesToDb } from '../lib/mappers.js';

test('completing or rescheduling preserves fields another user may have changed', () => {
  assert.deepEqual(taskChangesToDb({ concluida: true }), { concluida: true });
  assert.deepEqual(taskChangesToDb({ data: '2026-09-14' }), { data: '2026-09-14' });
});

test('task edits map explicit fields and allow removing the lead without resetting automation', () => {
  assert.deepEqual(taskChangesToDb({ titulo: 'Visita atualizada', leadId: '', hora: '15:30', id: 'ignored' }), {
    titulo: 'Visita atualizada', lead_id: null, hora: '15:30',
  });
  assert.deepEqual(taskChangesToDb({ concluida: false, tipoAuto: undefined }), { concluida: false });
});
