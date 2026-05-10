import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFinancePendingQueue,
  buildFinanceSummary,
  filterOrdersByFinanceRange,
  groupRevenueByPaymentStatus,
  recentFinancialOrders,
} from '../finance';
import type { AdminOrderRow } from '../../../pages/admin/admin-types';

const orders: AdminOrderRow[] = [
  { id: '1', order_code: 'TF-100', customer_name: 'Maria', customer_email: 'maria@teste.com', customer_phone: '1', status: 'Pendente', total: 100, payment_status: 'Pendente', created_at: '2026-05-09T09:00:00Z', delivery_address: null },
  { id: '2', order_code: 'TF-101', customer_name: 'João', customer_email: 'joao@teste.com', customer_phone: '2', status: 'Pago', total: 200, payment_status: 'Pago', created_at: '2026-05-08T09:00:00Z', delivery_address: null },
  { id: '3', order_code: 'TF-102', customer_name: 'Ana', customer_email: 'ana@teste.com', customer_phone: '3', status: 'Concluído', total: 300, payment_status: 'Pago', created_at: '2026-04-20T09:00:00Z', delivery_address: null },
  { id: '4', order_code: 'TF-103', customer_name: 'Paulo', customer_email: 'paulo@teste.com', customer_phone: '4', status: 'Pendente', total: 80, payment_status: 'Pendente', created_at: '2026-05-01T09:00:00Z', delivery_address: null },
  { id: '5', order_code: 'TF-104', customer_name: 'Bia', customer_email: 'bia@teste.com', customer_phone: '5', status: 'Cancelado', total: 500, payment_status: 'Pendente', created_at: '2026-05-09T08:00:00Z', delivery_address: null },
];

const now = new Date('2026-05-09T12:00:00Z');

test('buildFinanceSummary calcula KPIs financeiros sem contar cancelados como receita recebida', () => {
  assert.deepEqual(buildFinanceSummary(orders), {
    totalOrders: 5,
    paidOrders: 2,
    pendingOrders: 3,
    receivedRevenue: 500,
    pendingRevenue: 680,
    averageTicket: 125,
  });
});

test('groupRevenueByPaymentStatus soma valores por status de pagamento', () => {
  const grouped = groupRevenueByPaymentStatus(orders);
  assert.equal(grouped.find((item) => item.label === 'Pago')?.value, 500);
  assert.equal(grouped.find((item) => item.label === 'Pendente')?.value, 680);
});

test('recentFinancialOrders ordena pedidos mais recentes primeiro', () => {
  assert.deepEqual(recentFinancialOrders(orders, 3).map((order) => order.id), ['1', '5', '2']);
});

test('filterOrdersByFinanceRange filtra hoje, 7 dias, mês e tudo', () => {
  assert.deepEqual(filterOrdersByFinanceRange(orders, 'today', now).map((order) => order.id), ['1', '5']);
  assert.deepEqual(filterOrdersByFinanceRange(orders, '7d', now).map((order) => order.id), ['1', '2', '5']);
  assert.deepEqual(filterOrdersByFinanceRange(orders, 'month', now).map((order) => order.id), ['1', '2', '4', '5']);
  assert.deepEqual(filterOrdersByFinanceRange(orders, 'all', now).map((order) => order.id), ['1', '2', '3', '4', '5']);
});

test('buildFinancePendingQueue separa pendentes e atrasados ignorando cancelados', () => {
  const queue = buildFinancePendingQueue(orders, now);
  assert.deepEqual(queue.pendingNow.map((order) => order.id), ['1']);
  assert.deepEqual(queue.overdue.map((order) => order.id), ['4']);
  assert.equal(queue.pendingAmount, 180);
  assert.equal(queue.overdueAmount, 80);
});
