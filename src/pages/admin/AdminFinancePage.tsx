import { useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CalendarRange, CheckCircle2, Clock3, CreditCard, Wallet } from 'lucide-react';
import type { AdminOrderRow } from './admin-types';
import {
  buildFinancePendingQueue,
  buildFinanceSummary,
  filterOrdersByFinanceRange,
  groupRevenueByPaymentStatus,
  recentFinancialOrders,
  type FinanceRange,
} from '../../services/admin/finance';

type Props = {
  orders: AdminOrderRow[];
  onOpenOrder: (orderId: string) => void;
};

const RANGE_OPTIONS: { value: FinanceRange; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'month', label: 'Mês' },
  { value: 'all', label: 'Tudo' },
];

export default function AdminFinancePage({ orders, onOpenOrder }: Props) {
  const [range, setRange] = useState<FinanceRange>('month');
  const filteredOrders = useMemo(() => filterOrdersByFinanceRange(orders, range), [orders, range]);
  const summary = useMemo(() => buildFinanceSummary(filteredOrders), [filteredOrders]);
  const grouped = useMemo(() => groupRevenueByPaymentStatus(filteredOrders), [filteredOrders]);
  const recentOrders = useMemo(() => recentFinancialOrders(filteredOrders, 12), [filteredOrders]);
  const queue = useMemo(() => buildFinancePendingQueue(filteredOrders), [filteredOrders]);
  const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-gray-400">Financeiro</p>
          <h3 className="font-black text-xl text-gray-900 mt-1">Período de análise</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setRange(option.value)}
              className={`px-3 py-2 rounded-xl text-sm font-bold border transition-colors ${range === option.value ? 'bg-brand-black text-white border-brand-black' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        <MetricCard title="Receita recebida" value={money(summary.receivedRevenue)} icon={<Wallet className="w-5 h-5" />} tone="green" />
        <MetricCard title="Receita pendente" value={money(summary.pendingRevenue)} icon={<Clock3 className="w-5 h-5" />} tone="orange" />
        <MetricCard title="Pedidos pagos" value={String(summary.paidOrders)} icon={<CheckCircle2 className="w-5 h-5" />} tone="blue" />
        <MetricCard title="Pedidos pendentes" value={String(summary.pendingOrders)} icon={<AlertCircle className="w-5 h-5" />} tone="red" />
        <MetricCard title="Ticket médio" value={money(summary.averageTicket)} icon={<CreditCard className="w-5 h-5" />} tone="purple" />
        <MetricCard title="Registros no período" value={String(summary.totalOrders)} icon={<CalendarRange className="w-5 h-5" />} tone="slate" />
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-black text-lg text-gray-900 mb-5">Receita por status de pagamento</h3>
          <div className="space-y-4">
            {grouped.map((item) => {
              const max = Math.max(1, ...grouped.map((entry) => entry.value));
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
                    <span className="font-semibold text-gray-700">{item.label}</span>
                    <span className="font-black text-gray-900">{money(item.value)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-orange" style={{ width: `${(item.value / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {grouped.length === 0 && <p className="text-sm text-gray-500">Sem dados financeiros ainda.</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h3 className="font-black text-lg text-gray-900">Pendências financeiras</h3>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">ação</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <MiniStat label="Pendentes" value={`${queue.pendingNow.length}`} helper={money(queue.pendingAmount)} tone="orange" />
            <MiniStat label="Atrasados" value={`${queue.overdue.length}`} helper={money(queue.overdueAmount)} tone="red" />
          </div>

          <div className="space-y-4">
            <QueueBlock title="Cobrar agora" orders={queue.pendingNow} onOpenOrder={onOpenOrder} />
            <QueueBlock title="Atrasados" orders={queue.overdue} onOpenOrder={onOpenOrder} danger />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h3 className="font-black text-lg text-gray-900">Pedidos com impacto financeiro</h3>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{recentOrders.length} registros</span>
          </div>
          <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
            {recentOrders.map((order) => (
              <button key={order.id} onClick={() => onOpenOrder(order.id)} className="w-full rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-left hover:bg-orange-50 hover:border-orange-100 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="font-bold text-gray-900">{order.order_code || order.id.slice(0, 8).toUpperCase()} • {order.customer_name}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString('pt-BR')} • Status do pedido: {order.status}</p>
                  </div>
                  <div className="md:text-right">
                    <p className="font-black text-gray-900">{money(order.total)}</p>
                    <p className="text-xs text-gray-500 mt-1">Pagamento: {order.payment_status}</p>
                  </div>
                </div>
              </button>
            ))}
            {recentOrders.length === 0 && <p className="text-sm text-gray-500">Nenhum pedido encontrado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueBlock({ title, orders, onOpenOrder, danger = false }: { title: string; orders: AdminOrderRow[]; onOpenOrder: (orderId: string) => void; danger?: boolean }) {
  const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  return (
    <div>
      <p className={`text-xs font-black uppercase tracking-wider mb-2 ${danger ? 'text-red-500' : 'text-gray-400'}`}>{title}</p>
      <div className="space-y-2">
        {orders.slice(0, 4).map((order) => (
          <button key={order.id} onClick={() => onOpenOrder(order.id)} className={`w-full text-left rounded-xl border p-3 transition-colors ${danger ? 'border-red-100 bg-red-50/40 hover:bg-red-50' : 'border-gray-100 bg-gray-50/70 hover:bg-orange-50 hover:border-orange-100'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-gray-900">{order.order_code || order.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs text-gray-500 mt-1">{order.customer_name}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-sm text-gray-900">{money(order.total)}</p>
                <p className="text-xs text-gray-500 mt-1">{order.payment_status}</p>
              </div>
            </div>
          </button>
        ))}
        {orders.length === 0 && <p className="text-sm text-gray-500">Nenhum pedido nessa fila.</p>}
      </div>
    </div>
  );
}

function MiniStat({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: 'orange' | 'red' }) {
  const tones = {
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
    red: 'bg-red-50 border-red-100 text-red-700',
  } as const;

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-black uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black mt-2">{value}</p>
      <p className="text-xs mt-1 opacity-80">{helper}</p>
    </div>
  );
}

function MetricCard({ title, value, icon, tone }: { title: string; value: string; icon: ReactNode; tone: 'green' | 'orange' | 'blue' | 'red' | 'purple' | 'slate' }) {
  const tones = {
    green: 'bg-green-50 text-green-700 border-green-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
  } as const;

  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-black mt-2">{value}</p>
        </div>
        <div>{icon}</div>
      </div>
    </div>
  );
}
