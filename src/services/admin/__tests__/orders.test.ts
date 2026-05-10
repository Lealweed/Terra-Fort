import test from 'node:test';
import assert from 'node:assert/strict';
import { filterOrders, summarizeOrderItems } from '../orders';
import type { AdminOrderItemRow, AdminOrderRow } from '../../../pages/admin/admin-types';

const orders: AdminOrderRow[] = [
  { id: '1', order_code: 'TF-100', customer_name: 'Maria', customer_email: 'maria@teste.com', customer_phone: '1', status: 'Pendente', total: 120, payment_status: 'Pendente', created_at: '2026-05-09T10:00:00Z', delivery_address: null },
  { id: '2', order_code: 'TF-101', customer_name: 'João', customer_email: 'joao@teste.com', customer_phone: '2', status: 'Pago', total: 80, payment_status: 'Pago', created_at: '2026-05-09T11:00:00Z', delivery_address: null },
  { id: '3', order_code: 'TF-102', customer_name: 'Ana', customer_email: 'ana@teste.com', customer_phone: '3', status: 'Em rota de entrega', total: 40, payment_status: 'Pago', created_at: '2026-05-09T12:00:00Z', delivery_address: null },
];

const items: AdminOrderItemRow[] = [
  { id: 'i1', product_name: 'Cimento', unit_price: 40, quantity: 2, line_total: 80 },
  { id: 'i2', product_name: 'Areia', unit_price: 20, quantity: 2, line_total: 40 },
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
