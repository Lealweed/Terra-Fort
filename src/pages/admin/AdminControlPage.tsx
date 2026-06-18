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
            <h3 className="font-black text-lg text-slate-800 tracking-tight">Alertas operacionais</h3>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 bg-slate-50 border px-2.5 py-1 rounded-full">{alerts.length} alertas</span>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={`${alert.severity}-${alert.title}`} className={`rounded-xl border p-4 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md ${alertToneMap[alert.severity]}`}>
                <div className="absolute left-0 top-0 w-[4px] h-full bg-current opacity-80"></div>
                <p className="text-xs font-black uppercase tracking-wider">{alert.title}</p>
                <p className="text-xs mt-1.5 font-medium leading-relaxed">{alert.description}</p>
              </div>
            ))}
            {alerts.length === 0 && <p className="text-xs text-gray-400 italic text-center py-6">Operação estável, sem alertas críticos agora.</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-black text-lg text-slate-800 tracking-tight">Produtos que precisam de atenção</h3>
            <p className="text-xs text-gray-500 mt-1">Atalhos rápidos para ajuste de estoque.</p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 bg-slate-50 border px-2.5 py-1 rounded-full">{criticalProducts.length} itens</span>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {criticalProducts.map((product) => (
            <button 
              key={product.id} 
              onClick={() => onOpenInventory(product.id)} 
              className="text-left rounded-xl border border-gray-100 bg-slate-50/40 hover:bg-orange-50/50 hover:border-brand-orange/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 p-4 flex flex-col justify-between min-h-[100px]"
            >
              <div className="flex items-start justify-between gap-3 w-full">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-800 line-clamp-2 leading-snug">{product.name}</p>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">{product.category || 'Sem categoria'}</p>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-xs font-black shrink-0 border ${
                  product.stock_level <= 0 
                    ? 'bg-red-50 text-red-700 border-red-100' 
                    : 'bg-orange-50 text-orange-700 border-orange-100'
                }`}>
                  {product.stock_level}
                </div>
              </div>
            </button>
          ))}
          {criticalProducts.length === 0 && <p className="text-xs text-gray-400 italic text-center py-6 col-span-full">Nenhum produto em estado crítico.</p>}
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
  const borderColors = {
    orange: 'border-t-brand-orange',
    blue: 'border-t-blue-500',
    green: 'border-t-green-500',
    red: 'border-t-red-500',
  } as const;

  const iconContainers = {
    orange: 'bg-orange-50 text-brand-orange border-orange-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  } as const;

  return (
    <div className={`bg-white rounded-2xl border-t-4 border border-gray-100/90 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${borderColors[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{title}</p>
          <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${iconContainers[tone]}`}>
          {icon}
        </div>
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

  const leftBorderMap = {
    blue: 'border-l-blue-500',
    green: 'border-l-green-500',
    red: 'border-l-red-500',
  } as const;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col min-h-[380px]">
      <div className="mb-4">
        <div className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${toneMap[tone]}`}>{title}</div>
        <p className="text-xs text-gray-400 font-medium mt-2">{subtitle}</p>
      </div>
      <div className="space-y-3 overflow-auto pr-1 flex-1 max-h-[320px]">
        {items.map((order) => (
          <button 
            key={order.id} 
            onClick={() => onOpen(order.id)} 
            className={`w-full text-left rounded-xl border-l-4 border border-y-gray-100 border-r-gray-100 bg-white hover:bg-slate-50/60 p-4 transition-all duration-300 hover:translate-x-1 hover:shadow-sm ${leftBorderMap[tone]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-sm text-slate-800 tracking-tight">{order.order_code || order.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs text-gray-500 mt-1 font-semibold">{order.customer_name}</p>
                <p className="text-[10px] text-gray-400 mt-1 font-medium">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-sm text-slate-900 tracking-tight">{money(order.total)}</p>
                <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-1.5 border ${
                  order.payment_status === 'Pago' 
                    ? 'bg-green-50 text-green-700 border-green-100' 
                    : 'bg-orange-50 text-orange-700 border-orange-100'
                }`}>
                  {order.payment_status}
                </span>
              </div>
            </div>
          </button>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-400 italic text-center py-8">{emptyMessage}</p>}
      </div>
    </div>
  );
}
