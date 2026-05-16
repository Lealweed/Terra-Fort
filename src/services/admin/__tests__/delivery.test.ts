import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeliveryDraft, buildMapsSearchUrl, buildPhoneHref, createDeliveryEventDescription, mapDeliveryStatusToOrderStatus, mergeDeliveryAddressMeta, resolveDriverName, summarizeDeliveryAddress } from '../delivery';

test('buildDeliveryDraft hidrata entregador, vínculo e ocorrência com strings seguras', () => {
  assert.deepEqual(buildDeliveryDraft({ assigned_driver_id: 'd1', delivery_address: { driver_name: 'Carlos', occurrence: null } }), {
    driverId: 'd1',
    driverName: 'Carlos',
    note: '',
  });
  assert.deepEqual(buildDeliveryDraft(null), { driverId: '', driverName: '', note: '' });
});

test('mergeDeliveryAddressMeta preserva campos existentes e sobrescreve logística', () => {
  assert.deepEqual(
    mergeDeliveryAddressMeta({ street: 'Rua A', number: '10', driver_name: 'Old' }, 'Novo', 'Sem ocorrência'),
    { street: 'Rua A', number: '10', driver_name: 'Novo', occurrence: 'Sem ocorrência' },
  );

  assert.deepEqual(
    mergeDeliveryAddressMeta('Rua das Flores, 100', 'Carlos', 'Portão fechado'),
    { raw_address: 'Rua das Flores, 100', driver_name: 'Carlos', occurrence: 'Portão fechado' },
  );
});

test('mapDeliveryStatusToOrderStatus padroniza os status persistidos da logística', () => {
  assert.equal(mapDeliveryStatusToOrderStatus('Pendente'), 'Pendente');
  assert.equal(mapDeliveryStatusToOrderStatus('Em separação'), 'Pago');
  assert.equal(mapDeliveryStatusToOrderStatus('Em rota'), 'Em rota de entrega');
  assert.equal(mapDeliveryStatusToOrderStatus('Concluído'), 'Concluído');
  assert.equal(mapDeliveryStatusToOrderStatus('Cancelado'), 'Cancelado');
  assert.equal(mapDeliveryStatusToOrderStatus('Em rota de entrega'), 'Em rota de entrega');
});

test('createDeliveryEventDescription monta mensagem legível para timeline', () => {
  assert.equal(createDeliveryEventDescription('Em rota'), 'Admin alterou logística para Em rota');
});

test('summarizeDeliveryAddress prioriza campos legíveis e evita retorno vazio', () => {
  assert.equal(
    summarizeDeliveryAddress({ street: 'Rua A', number: '10', neighborhood: 'Centro', city: 'Parauapebas' }),
    'Rua A, 10, Centro, Parauapebas',
  );
  assert.equal(
    summarizeDeliveryAddress({ raw_address: 'Rua das Flores, 100', driver_name: 'Carlos', occurrence: 'Portão fechado' }),
    'Rua das Flores, 100',
  );
  assert.equal(summarizeDeliveryAddress(null), 'Endereço não informado');
});

test('buildMapsSearchUrl e buildPhoneHref geram links rápidos para operação', () => {
  assert.match(buildMapsSearchUrl({ endereco: 'Av. Principal, 200' }) || '', /google\.com\/maps\/search/);
  assert.equal(buildPhoneHref('(94) 98888-7777'), 'tel:94988887777');
  assert.equal(buildPhoneHref(''), null);
});
test('resolveDriverName busca o entregador cadastrado pelo vínculo formal e preserva legado quando não encontra', () => {
  const drivers = [{ id: 'drv-1', name: 'Carlos', phone: null, document: null, status: 'available', notes: null, created_at: '', updated_at: '' }] as any;
  assert.equal(resolveDriverName('drv-1', drivers), 'Carlos');
  assert.equal(resolveDriverName('drv-x', drivers, 'Motoboy legado'), 'Motoboy legado');
  assert.equal(resolveDriverName('', drivers), '');
});
