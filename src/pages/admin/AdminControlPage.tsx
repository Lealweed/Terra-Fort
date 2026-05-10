import { useMemo, type ReactNode } from 'react';
import { AlertTriangle, ArrowRightCircle, Boxes, CircleDollarSign, CreditCard, PackageCheck, Truck } from 'lucide-react';
import type { AdminOrderRow, ProductRow } from './admin-types';
import { buildControlAlerts, buildControlSnapshot, groupOperationalQueues } from '../../services/admin/control';

type Props = {
  orders: AdminOrderRow[];
  products: ProductRow[];
  onOpenOrder: (orderId: string, targetTab?: 'orders' | 'delivery' | 'finance') => void;
  onOpenInventory: (productId: string) => void;
};

export default function AdminControlPage({ orders, products, onOpenOrder, onOpenInventory }: Props) {
  const snapshot = useMemo(() => buildControlSnapshot(orders, products), [orders, products]);
  const queues = useMemo(() => groupOperationalQueues(orders), [orders]);
  const alerts = useMemo(() => buildControlAlerts(orders, products), [orders, products]);
  const criticalProducts = useMemo(() => products.filter((product) => product.stock_level <= 5).sort((a, b) => a.stock_level - b.stock_level).slice(0, 8), [products]);
  const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        <MetricCard title="Pedidos pendentes" value={String(snapshot.pendingOrders)} icon={<PackageCheck className="w-5 h-5" />} tone="orange" />
        <MetricCard title="Pagos para separar" value={String(snapshot.paidOrders)} icon={<ArrowRightCircle className="w-5 h-5" />} tone="blue" />
        <MetricCard title="Em rota" value={String(snapshot.inDelivery)} icon={<Truck className="w-5 h-5" />} tone="green" />
        <MetricCard title="Pendência financeira" value={String(snapshot.paymentPending)} icon={<CreditCard className="w-5 h-5" />} tone="red" />
        <MetricCard title="Estoque crítico" value={String(snapshot.criticalStock)} icon={<AlertTriangle className="w-5 h-5" />} tone="orange" />
        <MetricCard title="Sem estoque" value={String(snapshot.zeroStock)} icon={<Boxes className="w-5 h-5" />} tone="red" />
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 grid lg:grid-cols-3 gap-6">
          <QueueCard
            title="Separação"
            subtitle="Pedidos pagos aguardando preparo"
            items={queues.toPrepare}
            emptyMessage="Nenhum pedido aguardando separação."
            onOpen={(orderId) => onOpenOrder(orderId, 'orders')}
            tone="blue"
            money={money}
          />
          <QueueCard
            title="Expedição / rota"
            subtitle="Pedidos em trânsito"
            items={queues.toDispatch}
            emptyMessage="Nenhum pedido em rota agora."
            onOpen={(orderId) => onOpenOrder(orderId, 'delivery')}
            tone="green"
            money={money}
          />
          <QueueCard
            title="Financeiro"
            subtitle="Pedidos com falha ou pagamento pendente"
            items={queues.withPaymentIssue}
            emptyMessage="Nenhuma pendência financeira no momento."
            onOpen={(orderId) => onOpenOrder(orderId, 'finance')}
            tone="red"
            money={money}
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-black text-lg text-gray-900">Alertas operacionais</h3>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{alerts.length} alertas</span>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={`${alert.severity}-${alert.title}`} className={`rounded-xl border p-4 ${alertToneMap[alert.severity]}`}>
                <p className="text-sm font-black uppercase tracking-wider">{alert.title}</p>
                <p className="text-sm mt-1">{alert.description}</p>
              </div>
            ))}
            {alerts.length === 0 && <p className="text-sm text-gray-500">Operação estável, sem alertas críticos agora.</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-black text-lg text-gray-900">Produtos que precisam de atenção</h3>
            <p className="text-sm text-gray-500 mt-1">Atalhos rápidos para ajuste de estoque.</p>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{criticalProducts.length} itens</span>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {criticalProducts.map((product) => (
            <button key={product.id} onClick={() => onOpenInventory(product.id)} className="text-left rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-orange-50 hover:border-orange-100 transition-colors p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900 line-clamp-2">{product.name}</p>
                  <p className="text-xs text-gray-500 mt-1 uppercase">{product.category || 'Sem categoria'}</p>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-black ${product.stock_level <= 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                  {product.stock_level}
                </div>
              </div>
            </button>
          ))}
          {criticalProducts.length === 0 && <p className="text-sm text-gray-500 col-span-full">Nenhum produto em estado crítico.</p>}
        </div>
      </div>
    </div>
  );
}

const alertToneMap = {
  high: 'bg-red-50 text-red-700 border-red-100',
  medium: 'bg-orange-50 text-orange-700 border-orange-100',
  low: 'bg-blue-50 text-blue-700 border-blue-100',
} as const;

function MetricCard({ title, value, icon, tone }: { title: string; value: string; icon: ReactNode; tone: 'orange' | 'blue' | 'green' | 'red' }) {
  const tones = {
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  } as const;

  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-black mt-2">{value}</p>
        </div>
        <div>{icon}</div>
      </div>
    </div>
  );
}

function QueueCard({ title, subtitle, items, emptyMessage, onOpen, tone, money }: { title: string; subtitle: string; items: AdminOrderRow[]; emptyMessage: string; onOpen: (orderId: string) => void; tone: 'blue' | 'green' | 'red'; money: (value: number) => string }) {
  const toneMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  } as const;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col min-h-[360px]">
      <div className="mb-4">
        <div className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${toneMap[tone]}`}>{title}</div>
        <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
      </div>
      <div className="space-y-3 overflow-auto pr-1 flex-1">
        {items.map((order) => (
          <button key={order.id} onClick={() => onOpen(order.id)} className="w-full text-left rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-gray-50 p-4 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-gray-900">{order.order_code || order.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs text-gray-500 mt-1">{order.customer_name}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-gray-900">{money(order.total)}</p>
                <p className="text-xs text-gray-500 mt-1">{order.payment_status}</p>
              </div>
            </div>
          </button>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">{emptyMessage}</p>}
      </div>
    </div>
  );
}
