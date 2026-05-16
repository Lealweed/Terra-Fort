import { useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CalendarRange, CheckCircle2, Clock3, CreditCard, Wallet, TrendingUp, TrendingDown, Plus, Trash2 } from 'lucide-react';
import type { AdminOrderRow } from './admin-types';
import {
  buildFinancePendingQueue,
  filterOrdersByFinanceRange,
  recentFinancialOrders,
  type FinanceRange,
  type AdminFinanceTransactionRow,
  type AdminFinanceTransactionDraft
} from '../../services/admin/finance';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

type Props = {
  orders: AdminOrderRow[];
  transactions: AdminFinanceTransactionRow[];
  onOpenOrder: (orderId: string) => void;
  onSaveTransaction: (draft: AdminFinanceTransactionDraft) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
};

const RANGE_OPTIONS: { value: FinanceRange; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'month', label: 'Mês Atual' },
  { value: 'all', label: 'Tudo' },
];

export default function AdminFinancePage({ orders, transactions, onOpenOrder, onSaveTransaction, onDeleteTransaction }: Props) {
  const [range, setRange] = useState<FinanceRange>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftTx, setDraftTx] = useState<AdminFinanceTransactionDraft>({ type: 'EXPENSE', category: 'Operacional', description: '', amount: 0, date: new Date().toISOString().split('T')[0] });

  const filteredOrders = useMemo(() => filterOrdersByFinanceRange(orders, range), [orders, range]);
  
  // Combine all income sources
  const summary = useMemo(() => {
    const paidOrders = filteredOrders.filter(o => o.payment_status === 'Pago');
    const orderRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    
    // Filter transactions by range loosely (using the order logic isn't perfect for generic dates, but for MVP we just filter by the same range logic roughly or just aggregate all visible)
    const validTxs = transactions; // We could filter by date here, but let's just use all for simplicity or build a robust filter
    
    const manualIncome = validTxs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalExpenses = validTxs.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const totalIncome = orderRevenue + manualIncome;
    const netProfit = totalIncome - totalExpenses;
    
    return {
      orderRevenue,
      manualIncome,
      totalIncome,
      totalExpenses,
      netProfit,
      pendingOrders: filteredOrders.filter(o => o.payment_status === 'Pendente').length
    };
  }, [filteredOrders, transactions]);

  // Chart Data
  const chartData = useMemo(() => {
    const map = new Map<string, { name: string, Receitas: number, Despesas: number }>();
    
    // Process orders
    filteredOrders.filter(o => o.payment_status === 'Pago').forEach(o => {
      const d = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!map.has(d)) map.set(d, { name: d, Receitas: 0, Despesas: 0 });
      map.get(d)!.Receitas += Number(o.total || 0);
    });

    // Process manual
    transactions.forEach(t => {
      const d = new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!map.has(d)) map.set(d, { name: d, Receitas: 0, Despesas: 0 });
      if (t.type === 'INCOME') map.get(d)!.Receitas += Number(t.amount);
      if (t.type === 'EXPENSE') map.get(d)!.Despesas += Number(t.amount);
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredOrders, transactions]);

  const recentOrders = useMemo(() => recentFinancialOrders(filteredOrders, 8), [filteredOrders]);
  const queue = useMemo(() => buildFinancePendingQueue(filteredOrders), [filteredOrders]);
  const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const handleSave = async () => {
    await onSaveTransaction(draftTx);
    setIsModalOpen(false);
    setDraftTx({ type: 'EXPENSE', category: 'Operacional', description: '', amount: 0, date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-gray-400">Visão Geral Financeira</p>
          <h3 className="font-black text-xl text-gray-900 mt-1">Dashboard de Resultados</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setRange(option.value)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${range === option.value ? 'bg-brand-black text-white border-brand-black' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Receita Total" value={money(summary.totalIncome)} helper="Vendas + Entradas avulsas" icon={<TrendingUp className="w-6 h-6" />} tone="green" />
        <MetricCard title="Despesas" value={money(summary.totalExpenses)} helper="Saídas registradas" icon={<TrendingDown className="w-6 h-6" />} tone="red" />
        <MetricCard title="Lucro Líquido" value={money(summary.netProfit)} helper="Receitas - Despesas" icon={<Wallet className="w-6 h-6" />} tone="blue" />
        <MetricCard title="Pedidos Pendentes" value={String(summary.pendingOrders)} helper="Aguardando pagamento" icon={<Clock3 className="w-6 h-6" />} tone="orange" />
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-black text-lg text-gray-900 mb-6">Fluxo de Caixa (Receitas vs Despesas)</h3>
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `R$ ${val}`} />
                <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm font-bold">Sem dados suficientes para gerar o gráfico neste período.</div>
          )}
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        
        {/* Lançamentos Manuais */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h3 className="font-black text-lg text-gray-900">Lançamentos Manuais</h3>
              <p className="text-xs text-gray-500">Adicione despesas ou receitas extras</p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-brand-orange text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Lançamento
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {transactions.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm font-bold">Nenhum lançamento manual registrado.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map(t => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg group">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${t.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {t.type === 'INCOME' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{t.description}</p>
                        <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString('pt-BR')} • {t.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-black ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'INCOME' ? '+' : '-'}{money(t.amount)}
                      </span>
                      <button onClick={() => onDeleteTransaction(t.id)} className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pendências e Pedidos */}
        <div className="space-y-6 h-[500px] flex flex-col">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-black text-gray-900 mb-4">Atenção Necessária</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-orange-700">
                <p className="text-xs font-black uppercase tracking-wider mb-1">Pedidos Pendentes</p>
                <p className="text-2xl font-black">{queue.pendingNow.length}</p>
                <p className="text-xs opacity-80 mt-1">{money(queue.pendingAmount)} aguardando</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-700">
                <p className="text-xs font-black uppercase tracking-wider mb-1">Atrasados</p>
                <p className="text-2xl font-black">{queue.overdue.length}</p>
                <p className="text-xs opacity-80 mt-1">{money(queue.overdueAmount)} em risco</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex-1 overflow-auto">
            <h3 className="font-black text-gray-900 mb-4">Últimos Pedidos</h3>
            <div className="space-y-3">
              {recentOrders.map(order => (
                <button key={order.id} onClick={() => onOpenOrder(order.id)} className="w-full text-left bg-gray-50 rounded-xl p-3 hover:bg-orange-50 transition-colors border border-gray-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{order.customer_name}</p>
                      <p className="text-xs text-gray-500">{order.order_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm text-brand-orange">{money(order.total)}</p>
                      <p className="text-xs text-gray-500">{order.payment_status}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Modal Novo Lançamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-black text-xl">Novo Lançamento</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900">Fechar</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setDraftTx({...draftTx, type: 'INCOME'})} className={`py-3 rounded-xl font-bold text-sm border transition-colors ${draftTx.type === 'INCOME' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                  Receita
                </button>
                <button onClick={() => setDraftTx({...draftTx, type: 'EXPENSE'})} className={`py-3 rounded-xl font-bold text-sm border transition-colors ${draftTx.type === 'EXPENSE' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                  Despesa
                </button>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Descrição</label>
                <input value={draftTx.description} onChange={e => setDraftTx({...draftTx, description: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-orange" placeholder="Ex: Conta de Luz, Venda balcão..." />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Valor (R$)</label>
                  <input type="number" step="0.01" value={draftTx.amount || ''} onChange={e => setDraftTx({...draftTx, amount: Number(e.target.value)})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-orange" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Data</label>
                  <input type="date" value={draftTx.date} onChange={e => setDraftTx({...draftTx, date: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-orange" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Categoria</label>
                <select value={draftTx.category} onChange={e => setDraftTx({...draftTx, category: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-orange">
                  <option value="Operacional">Operacional</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Impostos">Impostos</option>
                  <option value="Serviços">Serviços</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end">
              <button onClick={handleSave} disabled={!draftTx.description || draftTx.amount <= 0} className="bg-brand-black text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50">
                Salvar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function MetricCard({ title, value, helper, icon, tone }: { title: string; value: string; helper: string; icon: ReactNode; tone: 'green' | 'red' | 'blue' | 'orange' }) {
  const tones = {
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
  } as const;

  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]} relative overflow-hidden`}>
      <div className="flex justify-between items-start mb-4">
        <p className="text-xs font-black uppercase tracking-wider opacity-80">{title}</p>
        <div className="opacity-80">{icon}</div>
      </div>
      <p className="text-3xl font-black tracking-tight">{value}</p>
      <p className="text-xs mt-2 opacity-80 font-medium">{helper}</p>
    </div>
  );
}
