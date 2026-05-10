import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomerInsights, filterCustomers, toCustomerDraft } from '../customers';
import type { AdminCustomerRow, AdminOrderRow } from '../../../pages/admin/admin-types';

const customers: AdminCustomerRow[] = [
  { id: 'c1', name: 'Maria Silva', email: 'maria@teste.com', phone: '85999990000', document: '123', notes: 'VIP', created_at: '2026-05-01T10:00:00Z' },
  { id: 'c2', name: 'João Souza', email: 'joao@teste.com', phone: '85888880000', document: null, notes: null, created_at: '2026-05-02T10:00:00Z' },
];

const orders: AdminOrderRow[] = [
  { id: 'o1', order_code: 'TF-001', customer_name: 'Maria Silva', customer_email: 'maria@teste.com', customer_phone: '85999990000', status: 'Pago', total: 120, payment_status: 'Pago', created_at: '2026-05-03T10:00:00Z', delivery_address: null },
  { id: 'o2', order_code: 'TF-002', customer_name: 'Maria Silva', customer_email: 'maria@teste.com', customer_phone: '85999990000', status: 'Concluído', total: 80, payment_status: 'Pago', created_at: '2026-05-04T10:00:00Z', delivery_address: null },
  { id: 'o3', order_code: 'TF-003', customer_name: 'Outro Nome', customer_email: 'outro@teste.com', customer_phone: '85777770000', status: 'Pendente', total: 50, payment_status: 'Pendente', created_at: '2026-05-05T10:00:00Z', delivery_address: null },
];

test('filterCustomers busca por nome, email e telefone', () => {
  assert.equal(filterCustomers(customers, 'maria').length, 1);
  assert.equal(filterCustomers(customers, '8588888').length, 1);
  assert.equal(filterCustomers(customers, '').length, 2);
});

test('toCustomerDraft mantém campos editáveis com strings seguras', () => {
  assert.deepEqual(toCustomerDraft(customers[1]), {
    name: 'João Souza',
    email: 'joao@teste.com',
    phone: '85888880000',
    document: '',
    notes: '',
  });
});

test('buildCustomerInsights calcula total, receita e último pedido do cliente', () => {
  const insights = buildCustomerInsights(customers[0], orders);
  assert.equal(insights.totalOrders, 2);
  assert.equal(insights.totalRevenue, 200);
  assert.equal(insights.lastOrderCode, 'TF-002');
});
