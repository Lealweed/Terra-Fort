import test from 'node:test';
import assert from 'node:assert/strict';
import { buildControlSnapshot, buildControlAlerts, groupOperationalQueues } from '../control';
import type { AdminOrderRow, ProductRow } from '../../../pages/admin/admin-types';

const products: ProductRow[] = [
  { id: 'p1', name: 'Cimento', description: '', price: 40, original_price: null, category: 'base', image_url: '', video_url: null, brand: null, sob_consulta: false, stock_level: 3, is_active: true, features: [], specifications: {} },
  { id: 'p2', name: 'Tijolo', description: '', price: 2, original_price: null, category: 'base', image_url: '', video_url: null, brand: null, sob_consulta: false, stock_level: 0, is_active: true, features: [], specifications: {} },
  { id: 'p3', name: 'Areia', description: '', price: 10, original_price: null, category: 'agregado', image_url: '', video_url: null, brand: null, sob_consulta: false, stock_level: 12, is_active: true, features: [], specifications: {} },
];

const orders: AdminOrderRow[] = [
  { id: 'o1', order_code: 'TF-001', customer_name: 'Maria', customer_email: 'maria@teste.com', customer_phone: '1', status: 'Pendente', total: 100, payment_status: 'Pendente', created_at: '2026-05-09T08:00:00Z', delivery_address: null },
  { id: 'o2', order_code: 'TF-002', customer_name: 'João', customer_email: 'joao@teste.com', customer_phone: '2', status: 'Pago', total: 220, payment_status: 'Pago', created_at: '2026-05-09T09:00:00Z', delivery_address: { driver_name: 'Carlos' } },
  { id: 'o3', order_code: 'TF-003', customer_name: 'Ana', customer_email: 'ana@teste.com', customer_phone: '3', status: 'Em rota de entrega', total: 180, payment_status: 'Pago', created_at: '2026-05-09T10:00:00Z', delivery_address: { driver_name: 'Rafael' } },
  { id: 'o4', order_code: 'TF-004', customer_name: 'Beto', customer_email: 'beto@teste.com', customer_phone: '4', status: 'Cancelado', total: 90, payment_status: 'Falhou', created_at: '2026-05-09T11:00:00Z', delivery_address: null },
];

test('buildControlSnapshot calcula contadores operacionais principais', () => {
  const snapshot = buildControlSnapshot(orders, products);
  assert.equal(snapshot.pendingOrders, 1);
  assert.equal(snapshot.paidOrders, 1);
  assert.equal(snapshot.inDelivery, 1);
  assert.equal(snapshot.paymentPending, 1);
  assert.equal(snapshot.criticalStock, 2);
  assert.equal(snapshot.zeroStock, 1);
});

test('groupOperationalQueues separa filas do dia por operação', () => {
  const queues = groupOperationalQueues(orders);
  assert.deepEqual(queues.toPrepare.map((order) => order.order_code), ['TF-002']);
  assert.deepEqual(queues.toDispatch.map((order) => order.order_code), ['TF-003']);
  assert.deepEqual(queues.withPaymentIssue.map((order) => order.order_code), ['TF-001', 'TF-004']);
});

test('buildControlAlerts gera alertas de estoque e financeiro por prioridade', () => {
  const alerts = buildControlAlerts(orders, products);
  assert.deepEqual(alerts.map((alert) => ({ severity: alert.severity, title: alert.title })), [
    { severity: 'high', title: 'Produto sem estoque' },
    { severity: 'medium', title: 'Produtos com estoque crítico' },
    { severity: 'medium', title: 'Pedidos com pendência financeira' },
  ]);
});
