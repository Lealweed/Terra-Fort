import { useMemo, type ReactNode } from 'react';
import { Mail, Phone, ReceiptText, Search, StickyNote, UserRound } from 'lucide-react';
import type { AdminCustomerDraft, AdminCustomerRow, AdminOrderRow } from './admin-types';
import { buildCustomerInsights, filterCustomers } from '../../services/admin/customers';

type Props = {
  customers: AdminCustomerRow[];
  orders: AdminOrderRow[];
  selectedCustomerId: string;
  draftCustomer: AdminCustomerDraft;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectCustomer: (customerId: string) => void;
  onDraftChange: (updater: (draft: AdminCustomerDraft) => AdminCustomerDraft) => void;
  onSaveCustomer: () => Promise<void> | void;
  onOpenOrder: (orderId: string) => void;
};

export default function AdminCustomersPage({
  customers,
  orders,
  selectedCustomerId,
  draftCustomer,
  search,
  onSearchChange,
  onSelectCustomer,
  onDraftChange,
  onSaveCustomer,
  onOpenOrder,
}: Props) {
  const filtered = useMemo(() => filterCustomers(customers, search), [customers, search]);
  const selectedCustomer = useMemo(() => customers.find((customer) => customer.id === selectedCustomerId) || null, [customers, selectedCustomerId]);
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders
      .filter((order) => order.customer_email === selectedCustomer.email || order.customer_name === selectedCustomer.name)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, selectedCustomer]);
  const insights = useMemo(() => buildCustomerInsights(selectedCustomer, orders), [selectedCustomer, orders]);
  const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Clientes na base" value={String(customers.length)} icon={<UserRound className="w-5 h-5" />} tone="blue" />
        <MetricCard title="Pedidos do cliente" value={String(insights.totalOrders)} icon={<ReceiptText className="w-5 h-5" />} tone="orange" />
        <MetricCard title="Receita do cliente" value={money(insights.totalRevenue)} icon={<Mail className="w-5 h-5" />} tone="green" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col min-h-[680px]">
          <div className="p-5 border-b border-gray-100 bg-gray-50/60 space-y-3">
            <p className="font-black text-gray-900">Base de clientes</p>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-orange" />
            </div>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-gray-100">
            {filtered.map((customer) => (
              <button key={customer.id} onClick={() => onSelectCustomer(customer.id)} className={`w-full text-left p-4 transition-colors ${selectedCustomerId === customer.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                <p className="font-bold text-sm text-gray-900">{customer.name}</p>
                <p className="text-xs text-gray-500 mt-1">{customer.email || '-'} • {customer.phone || '-'}</p>
              </button>
            ))}
            {filtered.length === 0 && <div className="p-6 text-sm text-gray-500">Nenhum cliente encontrado para essa busca.</div>}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-gray-500">Cadastro do cliente</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">{selectedCustomer?.name || 'Selecione um cliente'}</h3>
              </div>
              {selectedCustomer && (
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-gray-400">Último pedido</p>
                  <p className="text-sm font-black text-brand-orange mt-1">{insights.lastOrderCode || 'Sem pedidos'}</p>
                </div>
              )}
            </div>

            {!selectedCustomer ? (
              <p className="text-sm text-gray-500">Selecione um cliente para visualizar e editar os dados cadastrais.</p>
            ) : (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input icon={<UserRound className="w-4 h-4" />} label="Nome" value={draftCustomer.name} onChange={(value) => onDraftChange((draft) => ({ ...draft, name: value }))} />
                  <Input icon={<ReceiptText className="w-4 h-4" />} label="Documento" value={draftCustomer.document} onChange={(value) => onDraftChange((draft) => ({ ...draft, document: value }))} />
                  <Input icon={<Mail className="w-4 h-4" />} label="E-mail" value={draftCustomer.email} onChange={(value) => onDraftChange((draft) => ({ ...draft, email: value }))} />
                  <Input icon={<Phone className="w-4 h-4" />} label="Telefone" value={draftCustomer.phone} onChange={(value) => onDraftChange((draft) => ({ ...draft, phone: value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Anotações internas</label>
                  <textarea value={draftCustomer.notes} onChange={(e) => onDraftChange((draft) => ({ ...draft, notes: e.target.value }))} rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-orange" />
                </div>
                <button onClick={() => void onSaveCustomer()} className="bg-brand-black hover:bg-gray-800 transition-colors text-white px-5 py-3 rounded-xl text-sm font-bold">Salvar cliente</button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="font-black text-lg text-gray-900">Histórico de pedidos</h3>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{customerOrders.length} pedidos</span>
            </div>
            {!selectedCustomer ? (
              <p className="text-sm text-gray-500">Selecione um cliente para ver o histórico.</p>
            ) : customerOrders.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum pedido encontrado para este cliente.</p>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
                {customerOrders.map((order) => (
                  <button key={order.id} onClick={() => onOpenOrder(order.id)} className="w-full rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-left hover:bg-orange-50 hover:border-orange-100 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-gray-900">{order.order_code || order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString('pt-BR')} • {order.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-gray-900">{money(order.total)}</p>
                        <p className="text-xs text-gray-500 mt-1">Pagamento: {order.payment_status}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, tone }: { title: string; value: string; icon: ReactNode; tone: 'blue' | 'orange' | 'green' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    green: 'bg-green-50 text-green-700 border-green-100',
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

function Input({ label, value, onChange, icon }: { label: string; value: string; onChange: (value: string) => void; icon: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">{label}</label>
      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus-within:border-brand-orange focus-within:bg-white transition-colors">
        <span className="text-gray-400">{icon}</span>
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
      </div>
    </div>
  );
}
