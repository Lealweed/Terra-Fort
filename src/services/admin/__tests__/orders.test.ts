import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderDeliverySnapshot, buildOrdersOperationalSummary, filterOrders, summarizeOrderItems } from '../orders';
import type { AdminDriverRow, AdminOrderItemRow, AdminOrderRow } from '../../../pages/admin/admin-types';

const orders: AdminOrderRow[] = [
  { id: '1', order_code: 'TF-100', customer_name: 'Maria', customer_email: 'maria@teste.com', customer_phone: '1', status: 'Pendente', total: 120, payment_status: 'Pendente', created_at: '2026-05-09T10:00:00Z', assigned_driver_id: null, delivery_address: null },
  { id: '2', order_code: 'TF-101', customer_name: 'João', customer_email: 'joao@teste.com', customer_phone: '2', status: 'Pago', total: 80, payment_status: 'Pago', created_at: '2026-05-09T11:00:00Z', assigned_driver_id: null, delivery_address: null },
  { id: '3', order_code: 'TF-102', customer_name: 'Ana', customer_email: 'ana@teste.com', customer_phone: '3', status: 'Em rota de entrega', total: 40, payment_status: 'Pago', created_at: '2026-05-09T12:00:00Z', assigned_driver_id: null, delivery_address: null },
];

const items: AdminOrderItemRow[] = [
  { id: 'i1', product_name: 'Cimento', unit_price: 40, quantity: 2, line_total: 80 },
  { id: 'i2', product_name: 'Areia', unit_price: 20, quantity: 2, line_total: 40 },
];

const drivers: AdminDriverRow[] = [
  { id: 'd1', name: 'Carlos', phone: '(94) 99999-1111', document: null, status: 'available', notes: null, created_at: '2026-05-10T09:00:00Z' },
];

test('filterOrders busca por código, cliente e email e respeita status', () => {
  assert.deepEqual(filterOrders(orders, 'maria', 'todos').map((order) => order.id), ['1']);
  assert.deepEqual(filterOrders(orders, 'tf-10', 'Pago').map((order) => order.id), ['2']);
  assert.deepEqual(filterOrders(orders, '', 'Em rota de entrega').map((order) => order.id), ['3']);
});

test('summarizeOrderItems calcula quantidade total e valor consolidado', () => {
  assert.deepEqual(summarizeOrderItems(items), {
    itemCount: 2,
    quantityTotal: 4,
    amountTotal: 120,
  });
});

test('buildOrderDeliverySnapshot prefere entregador cadastrado quando pedido tem vínculo formal', () => {
  const snapshot = buildOrderDeliverySnapshot({
    id: '7',
    order_code: 'TF-777',
    customer_name: 'Paulo',
    customer_email: 'paulo@teste.com',
    customer_phone: '(94) 99123-4567',
    status: 'Em rota de entrega',
    total: 150,
    payment_status: 'Pago',
    created_at: '2026-05-09T13:00:00Z',
    assigned_driver_id: 'd1',
    delivery_address: {
      street: 'Rua das Torres',
      number: '120',
      neighborhood: 'Cidade Nova',
      city: 'Parauapebas',
      driver_name: 'Motorista legado',
      occurrence: 'Cliente pediu contato antes da chegada',
      proofUrl: 'https://cdn.exemplo/prova.jpg',
    },
  }, drivers);

  assert.equal(snapshot.driverName, 'Carlos');
  assert.equal(snapshot.driverPhone, '(94) 99999-1111');
  assert.equal(snapshot.occurrence, 'Cliente pediu contato antes da chegada');
  assert.match(snapshot.addressLabel, /Rua das Torres/);
  assert.equal(snapshot.logisticsStatus, 'Em rota');
  assert.equal(snapshot.customerPhoneHref, 'tel:94991234567');
  assert.match(snapshot.mapsUrl || '', /google\.com\/maps\/search/);
  assert.equal(snapshot.hasDriver, true);
  assert.equal(snapshot.hasOccurrence, true);
  assert.equal(snapshot.proofUrl, 'https://cdn.exemplo/prova.jpg');
});

test('buildOrdersOperationalSummary contabiliza gargalos logísticos da fila', () => {
  const summary = buildOrdersOperationalSummary([
    ...orders,
    {
      id: '4',
      order_code: 'TF-103',
      customer_name: 'Carla',
      customer_email: 'carla@teste.com',
      customer_phone: '4',
      status: 'Pago',
      total: 95,
      payment_status: 'Pago',
      created_at: '2026-05-09T13:30:00Z',
      assigned_driver_id: 'd1',
      delivery_address: { driver_name: 'Marcos', occurrence: 'Portaria fechada' },
    },
  ], drivers);

  assert.deepEqual(summary, {
    total: 4,
    awaitingAssignment: 2,
    inTransit: 1,
    withOccurrence: 1,
  });
});
