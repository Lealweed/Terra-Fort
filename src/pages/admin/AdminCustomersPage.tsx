import { useMemo, type ReactNode } from 'react';
import { Building2, Mail, Phone, PlusCircle, ReceiptText, Search, UserRound, ShieldBan } from 'lucide-react';
import type { AdminCustomerDraft, AdminCustomerRow, AdminOrderRow } from './admin-types';
import { buildCustomerInsights, filterCustomers } from '../../services/admin/customers';

type Props = {
  customers: AdminCustomerRow[];
  orders: AdminOrderRow[];
  selectedCustomerId: string;
  draftCustomer: AdminCustomerDraft;
  search: string;
  isCreatingCustomer: boolean;
  onSearchChange: (value: string) => void;
  onSelectCustomer: (customerId: string) => void;
  onDraftChange: (updater: (draft: AdminCustomerDraft) => AdminCustomerDraft) => void;
  onSaveCustomer: () => Promise<void> | void;
  onCreateCustomer: () => void;
  onDeleteCustomer: (customerId: string) => void;
  onOpenOrder: (orderId: string) => void;
};

export default function AdminCustomersPage({
  customers,
  orders,
  selectedCustomerId,
  draftCustomer,
  search,
  isCreatingCustomer,
  onSearchChange,
  onSelectCustomer,
  onDraftChange,
  onSaveCustomer,
  onCreateCustomer,
  onDeleteCustomer,
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
  const isCompany = draftCustomer.customer_kind === 'company';

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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-black text-gray-900">Base de clientes</p>
                <p className="text-xs text-gray-500 mt-1">Cadastre pessoa física e empresa.</p>
              </div>
              <button onClick={onCreateCustomer} className="inline-flex items-center gap-2 rounded-lg bg-brand-black px-3 py-2 text-xs font-bold text-white hover:bg-gray-800 transition-colors">
                <PlusCircle className="w-4 h-4" /> Cadastrar cliente
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar por nome, contato, e-mail, telefone ou documento" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-orange" />
            </div>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-gray-100">
            {filtered.map((customer) => (
              <button key={customer.id} onClick={() => onSelectCustomer(customer.id)} className={`w-full text-left p-4 transition-colors ${selectedCustomerId === customer.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-gray-900">{customer.name}</p>
                      {customer.is_blocked && <ShieldBan className="w-3.5 h-3.5 text-red-500" title="Cliente bloqueado" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{customer.contact_name || customer.email || '-'} • {customer.phone || '-'}</p>
                  </div>
                  <CustomerBadge kind={customer.customer_kind} isBlocked={customer.is_blocked} />
                </div>
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
                <h3 className="text-2xl font-black text-gray-900 mt-1">{isCreatingCustomer ? 'Novo cliente' : selectedCustomer?.name || 'Selecione um cliente'}</h3>
                <p className="text-sm text-gray-500 mt-2">Use esta área para cadastrar clientes em geral e também empresas.</p>
              </div>
              {!isCreatingCustomer && selectedCustomer && (
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-gray-400">Último pedido</p>
                  <p className="text-sm font-black text-brand-orange mt-1">{insights.lastOrderCode || 'Sem pedidos'}</p>
                  <div className="mt-2 flex justify-end">
                    <CustomerBadge kind={selectedCustomer.customer_kind} />
                  </div>
                </div>
              )}
            </div>

            {!selectedCustomer && !isCreatingCustomer ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-6 text-sm text-gray-600 space-y-4">
                <p>Selecione um cliente para editar ou clique em <strong>Cadastrar cliente</strong> para criar um novo cadastro.</p>
                <button onClick={onCreateCustomer} className="inline-flex items-center gap-2 rounded-xl bg-brand-black px-4 py-3 text-sm font-bold text-white hover:bg-gray-800 transition-colors">
                  <PlusCircle className="w-4 h-4" /> Abrir cadastro de cliente
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onDraftChange((draft) => ({ ...draft, customer_kind: 'person', contact_name: draft.customer_kind === 'company' ? '' : draft.contact_name }))}
                    className={`rounded-2xl border px-4 py-3 text-left transition-colors ${!isCompany ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <p className="font-black text-sm">Pessoa física</p>
                    <p className="text-xs mt-1 opacity-80">Cliente individual, consumidor final.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDraftChange((draft) => ({ ...draft, customer_kind: 'company' }))}
                    className={`rounded-2xl border px-4 py-3 text-left transition-colors ${isCompany ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <p className="font-black text-sm">Empresa</p>
                    <p className="text-xs mt-1 opacity-80">Cadastre CNPJ e contato responsável.</p>
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input icon={isCompany ? <Building2 className="w-4 h-4" /> : <UserRound className="w-4 h-4" />} label={isCompany ? 'Razão social / nome da empresa' : 'Nome completo'} value={draftCustomer.name} onChange={(value) => onDraftChange((draft) => ({ ...draft, name: value }))} />
                  <Input icon={<ReceiptText className="w-4 h-4" />} label={isCompany ? 'CNPJ' : 'CPF / documento'} value={draftCustomer.document} onChange={(value) => onDraftChange((draft) => ({ ...draft, document: value }))} />
                  {isCompany && <Input icon={<UserRound className="w-4 h-4" />} label="Contato responsável" value={draftCustomer.contact_name} onChange={(value) => onDraftChange((draft) => ({ ...draft, contact_name: value }))} />}
                  <Input icon={<Mail className="w-4 h-4" />} label="E-mail" value={draftCustomer.email} onChange={(value) => onDraftChange((draft) => ({ ...draft, email: value }))} />
                  <Input icon={<Phone className="w-4 h-4" />} label="Telefone" value={draftCustomer.phone} onChange={(value) => onDraftChange((draft) => ({ ...draft, phone: value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Anotações internas</label>
                  <textarea value={draftCustomer.notes} onChange={(e) => onDraftChange((draft) => ({ ...draft, notes: e.target.value }))} rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-orange" />
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-5 mt-2">
                  <div className="flex gap-3 items-center">
                    <button onClick={() => void onSaveCustomer()} className="bg-brand-black hover:bg-gray-800 transition-colors text-white px-5 py-3 rounded-xl text-sm font-bold">
                      {isCreatingCustomer ? 'Criar cliente' : 'Salvar alterações'}
                    </button>
                    {!isCreatingCustomer && (
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={draftCustomer.is_blocked} onChange={(e) => onDraftChange((draft) => ({ ...draft, is_blocked: e.target.checked }))} className="w-4 h-4 text-brand-orange focus:ring-brand-orange border-gray-300 rounded" />
                        Bloquear cliente
                      </label>
                    )}
                  </div>
                  {!isCreatingCustomer && selectedCustomer && (
                    <button onClick={() => onDeleteCustomer(selectedCustomer.id)} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="font-black text-lg text-gray-900">Histórico de pedidos</h3>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{customerOrders.length} pedidos</span>
            </div>
            {!selectedCustomer || isCreatingCustomer ? (
              <p className="text-sm text-gray-500">Selecione um cliente salvo para ver o histórico.</p>
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

function CustomerBadge({ kind, isBlocked }: { kind: 'person' | 'company', isBlocked?: boolean }) {
  if (isBlocked) {
    return <span className="rounded-full px-3 py-1 text-[11px] font-bold bg-red-100 text-red-700">Bloqueado</span>;
  }
  const tones = kind === 'company' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700';
  return <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${tones}`}>{kind === 'company' ? 'Empresa' : 'Pessoa'}</span>;
}
