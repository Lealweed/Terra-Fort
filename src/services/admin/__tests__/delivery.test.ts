import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeliveryDraft, createDeliveryEventDescription, mergeDeliveryAddressMeta } from '../delivery';

test('buildDeliveryDraft hidrata motorista e ocorrência com strings seguras', () => {
  assert.deepEqual(buildDeliveryDraft({ driver_name: 'Carlos', occurrence: null }), {
    driverName: 'Carlos',
    note: '',
  });
  assert.deepEqual(buildDeliveryDraft(null), { driverName: '', note: '' });
});

test('mergeDeliveryAddressMeta preserva campos existentes e sobrescreve logística', () => {
  assert.deepEqual(
    mergeDeliveryAddressMeta({ street: 'Rua A', number: '10', driver_name: 'Old' }, 'Novo', 'Sem ocorrência'),
    { street: 'Rua A', number: '10', driver_name: 'Novo', occurrence: 'Sem ocorrência' },
  );
});

test('createDeliveryEventDescription monta mensagem legível para timeline', () => {
  assert.equal(createDeliveryEventDescription('Em rota'), 'Admin alterou logística para Em rota');
});
