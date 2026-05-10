import type { AdminOrderRow, ProductRow } from '../../pages/admin/admin-types';

export type ControlAlert = {
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
};

export function buildControlSnapshot(orders: AdminOrderRow[], products: ProductRow[]) {
  return {
    pendingOrders: orders.filter((order) => order.status === 'Pendente').length,
    paidOrders: orders.filter((order) => order.status === 'Pago').length,
    inDelivery: orders.filter((order) => order.status === 'Em rota de entrega').length,
    paymentPending: orders.filter((order) => order.payment_status === 'Pendente').length,
    criticalStock: products.filter((product) => product.stock_level <= 5).length,
    zeroStock: products.filter((product) => product.stock_level <= 0).length,
  };
}

export function groupOperationalQueues(orders: AdminOrderRow[]) {
  return {
    toPrepare: orders.filter((order) => order.status === 'Pago'),
    toDispatch: orders.filter((order) => order.status === 'Em rota de entrega'),
    withPaymentIssue: orders.filter((order) => order.payment_status === 'Pendente' || order.payment_status === 'Falhou'),
  };
}

export function buildControlAlerts(orders: AdminOrderRow[], products: ProductRow[]): ControlAlert[] {
  const alerts: ControlAlert[] = [];
  const zeroStock = products.filter((product) => product.stock_level <= 0);
  const criticalStock = products.filter((product) => product.stock_level > 0 && product.stock_level <= 5);
  const paymentIssues = orders.filter((order) => order.payment_status === 'Pendente' || order.payment_status === 'Falhou');

  if (zeroStock.length) {
    alerts.push({
      severity: 'high',
      title: 'Produto sem estoque',
      description: `${zeroStock.length} item(ns) precisam de reposição imediata.`,
    });
  }

  if (criticalStock.length) {
    alerts.push({
      severity: 'medium',
      title: 'Produtos com estoque crítico',
      description: `${criticalStock.length} item(ns) estão abaixo do nível seguro.`,
    });
  }

  if (paymentIssues.length) {
    alerts.push({
      severity: 'medium',
      title: 'Pedidos com pendência financeira',
      description: `${paymentIssues.length} pedido(s) exigem acompanhamento de pagamento.`,
    });
  }

  return alerts;
}
