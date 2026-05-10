import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeliveryDraft, buildMapsSearchUrl, buildPhoneHref, createDeliveryEventDescription, mergeDeliveryAddressMeta, summarizeDeliveryAddress } from '../delivery';

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

test('summarizeDeliveryAddress prioriza campos legíveis e evita retorno vazio', () => {
  assert.equal(
    summarizeDeliveryAddress({ street: 'Rua A', number: '10', neighborhood: 'Centro', city: 'Parauapebas' }),
    'Rua A, 10, Centro, Parauapebas',
  );
  assert.equal(summarizeDeliveryAddress(null), 'Endereço não informado');
});

test('buildMapsSearchUrl e buildPhoneHref geram links rápidos para operação', () => {
  assert.match(buildMapsSearchUrl({ endereco: 'Av. Principal, 200' }) || '', /google\.com\/maps\/search/);
  assert.equal(buildPhoneHref('(94) 98888-7777'), 'tel:94988887777');
  assert.equal(buildPhoneHref(''), null);
});
