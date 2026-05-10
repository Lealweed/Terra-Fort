import type { AdminOrderRow } from '../../pages/admin/admin-types';

export type FinanceRange = 'today' | '7d' | '30d' | 'month' | 'all';

function isSameUtcDay(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate();
}

function daysBetween(later: Date, earlier: Date) {
  return Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}

export function filterOrdersByFinanceRange(orders: AdminOrderRow[], range: FinanceRange, now = new Date()) {
  if (range === 'all') return [...orders];

  return orders.filter((order) => {
    const createdAt = new Date(order.created_at);
    if (Number.isNaN(createdAt.getTime())) return false;

    if (range === 'today') {
      return isSameUtcDay(createdAt, now);
    }

    if (range === '7d') {
      return createdAt.getTime() >= now.getTime() - (7 * 24 * 60 * 60 * 1000);
    }

    if (range === '30d') {
      return createdAt.getTime() >= now.getTime() - (30 * 24 * 60 * 60 * 1000);
    }

    return createdAt.getUTCFullYear() === now.getUTCFullYear()
      && createdAt.getUTCMonth() === now.getUTCMonth();
  });
}

export function buildFinanceSummary(orders: AdminOrderRow[]) {
  const paidOrders = orders.filter((order) => order.payment_status === 'Pago');
  const pendingOrders = orders.filter((order) => order.payment_status === 'Pendente');
  const activeOrders = orders.filter((order) => order.status !== 'Cancelado');
  const receivedRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pendingRevenue = pendingOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  return {
    totalOrders: orders.length,
    paidOrders: paidOrders.length,
    pendingOrders: pendingOrders.length,
    receivedRevenue,
    pendingRevenue,
    averageTicket: activeOrders.length ? receivedRevenue / activeOrders.length : 0,
  };
}

export function buildFinancePendingQueue(orders: AdminOrderRow[], now = new Date()) {
  const actionable = orders
    .filter((order) => order.status !== 'Cancelado' && order.payment_status !== 'Pago')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const overdue = actionable.filter((order) => daysBetween(now, new Date(order.created_at)) >= 3);
  const pendingNow = actionable.filter((order) => daysBetween(now, new Date(order.created_at)) < 3);

  return {
    pendingNow,
    overdue,
    pendingAmount: actionable.reduce((sum, order) => sum + Number(order.total || 0), 0),
    overdueAmount: overdue.reduce((sum, order) => sum + Number(order.total || 0), 0),
  };
}

export function groupRevenueByPaymentStatus(orders: AdminOrderRow[]) {
  const totals = new Map<string, number>();
  for (const order of orders) {
    totals.set(order.payment_status, (totals.get(order.payment_status) || 0) + Number(order.total || 0));
  }

  return Array.from(totals.entries()).map(([label, value]) => ({ label, value }));
}

export function recentFinancialOrders(orders: AdminOrderRow[], limit = 10) {
  return [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}
