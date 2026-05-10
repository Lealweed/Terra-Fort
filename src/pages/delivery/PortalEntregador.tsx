import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MapPin, Navigation, Package, Phone, Plus, Save, Trash2, Truck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type EntregaStatus = 'Pendente' | 'Em separação' | 'Em rota' | 'Concluído' | 'Cancelado';

type Entrega = {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  address: string;
  status: EntregaStatus;
  total: number;
  occurrence?: string;
  proofUrl?: string;
  updatedAt?: string;
};

const statusOptions: EntregaStatus[] = ['Pendente', 'Em separação', 'Em rota', 'Concluído', 'Cancelado'];

const mapStatus = (v?: string): EntregaStatus => {
  if (!v) return 'Pendente';
  const s = v.toLowerCase();
  if (s.includes('rota')) return 'Em rota';
  if (s.includes('separa')) return 'Em separação';
  if (s.includes('conclu') || s.includes('entreg')) return 'Concluído';
  if (s.includes('cancel')) return 'Cancelado';
  return 'Pendente';
};

const fmtCurrency = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

function normalizeAddress(value: unknown): string {
  if (!value) return 'Endereço não informado';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).filter(Boolean).join(', ');
  return 'Endereço não informado';
}

async function loadEntregas(): Promise<Entrega[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_code, customer_name, customer_phone, delivery_address, status, total, updated_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return data.map((o: any) => ({
    id: o.id,
    orderCode: o.order_code || o.id.slice(0, 8).toUpperCase(),
    customerName: o.customer_name || 'Cliente',
    customerPhone: o.customer_phone || '',
    address: normalizeAddress(o.delivery_address),
    status: mapStatus(o.status),
    total: Number(o.total || 0),
    occurrence: o.delivery_address?.occurrence || '',
    proofUrl: o.delivery_address?.proofUrl || '',
    updatedAt: o.updated_at,
  }));
}

export default function PortalEntregador() {
  const [items, setItems] = useState<Entrega[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId]);

  const refresh = async () => {
    const data = await loadEntregas();
    setItems(data);
    setSelectedId((prev) => (data.find((d) => d.id === prev)?.id || data[0]?.id || ''));
    setLoading(false);
  };

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel('portal-entregador-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => ({
    total: items.length,
    done: items.filter((i) => i.status === 'Concluído').length,
    pending: items.filter((i) => i.status !== 'Concluído' && i.status !== 'Cancelado').length,
  }), [items]);

  const createEntrega = async () => {
    setSaving(true);
    const payload = {
      customer_name: 'Novo Cliente',
      customer_phone: '',
      status: 'Pendente',
      total: 0,
      delivery_address: { rua: 'Preencher endereço' },
      order_code: `TF-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    const { error } = await supabase.from('orders').insert(payload);
    setSaving(false);
    if (!error) refresh();
  };

  const saveEntrega = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    setSaving(true);
    const { error } = await supabase
      .from('orders')
      .update({
        customer_name: selected.customerName,
        customer_phone: selected.customerPhone,
        status: selected.status,
        total: selected.total,
        delivery_address: { endereco: selected.address, occurrence: selected.occurrence || '', proofUrl: selected.proofUrl || '' },
      })
      .eq('id', selected.id);

    if (!error) {
      await supabase.from('order_events').insert({
        order_id: selected.id,
        event_type: 'delivery_status_changed',
        description: `Entregador atualizou status para ${selected.status}`,
        actor_role: 'delivery',
      });
    }

    setSaving(false);
    if (!error) refresh();
  };

  const removeEntrega = async () => {
    if (!selected) return;
    if (!confirm(`Remover entrega ${selected.orderCode}?`)) return;

    setSaving(true);
    const { error } = await supabase.from('orders').delete().eq('id', selected.id);
    setSaving(false);
    if (!error) refresh();
  };

  const updateSelected = <K extends keyof Entrega>(field: K, value: Entrega[K]) => {
    setItems((prev) => prev.map((item) => (item.id === selectedId ? { ...item, [field]: value } : item)));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-black">Portal do Entregador</h1>
        <button
          onClick={createEntrega}
          disabled={saving}
          className="bg-brand-black text-white rounded-lg px-4 py-2.5 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Nova entrega
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Stat title="Rotas registradas" value={String(stats.total)} icon={<Navigation className="w-5 h-5" />} />
        <Stat title="Concluídas" value={String(stats.done)} icon={<CheckCircle2 className="w-5 h-5" />} />
        <Stat title="Pendentes" value={String(stats.pending)} icon={<Package className="w-5 h-5" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b font-bold">Entregas</div>
          {loading ? (
            <div className="p-5 text-sm text-gray-500">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="p-5 text-sm text-gray-500">Sem entregas cadastradas.</div>
          ) : (
            <div className="divide-y">
              {items.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left p-4 transition ${selectedId === r.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="font-black">{r.orderCode} · {r.customerName}</p>
                      <p className="text-gray-600 text-sm flex items-center gap-2 mt-1"><MapPin className="w-4 h-4" />{r.address}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">{r.status}</span>
                      <span className="text-sm font-bold">{fmtCurrency(r.total)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={saveEntrega} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-black text-lg">CRUD da entrega</h2>

          {!selected ? (
            <p className="text-sm text-gray-500">Selecione uma entrega para editar.</p>
          ) : (
            <>
              <Field label="Pedido" value={selected.orderCode} readOnly />
              <Field label="Cliente" value={selected.customerName} onChange={(v) => updateSelected('customerName', v)} />
              <Field label="Telefone" value={selected.customerPhone} onChange={(v) => updateSelected('customerPhone', v)} />
              <Field label="Endereço" value={selected.address} onChange={(v) => updateSelected('address', v)} />

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Status</label>
                <select
                  value={selected.status}
                  onChange={(e) => updateSelected('status', e.target.value as EntregaStatus)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                >
                  {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Valor total</label>
                <input
                  type="number"
                  step="0.01"
                  value={selected.total}
                  onChange={(e) => updateSelected('total', Number(e.target.value || 0))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>

              <Field label="Ocorrência" value={selected.occurrence || ''} onChange={(v) => updateSelected('occurrence', v)} />
              <Field label="Comprovante (URL)" value={selected.proofUrl || ''} onChange={(v) => updateSelected('proofUrl', v)} />

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button type="submit" disabled={saving} className="bg-brand-black text-white py-2.5 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                  <Save className="w-4 h-4" /> Salvar
                </button>
                <button type="button" onClick={removeEntrega} disabled={saving} className="bg-red-600 text-white py-2.5 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </div>

              {selected.customerPhone && (
                <a href={`tel:${selected.customerPhone.replace(/\D/g, '')}`} className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" /> Ligar para cliente
                </a>
              )}

              {selected.status === 'Em rota' && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2"
                >
                  <Truck className="w-4 h-4" /> Iniciar navegação
                </a>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
}

function Stat({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between text-gray-500 text-sm"><span>{title}</span>{icon}</div>
      <p className="text-2xl font-black mt-2">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, readOnly }: { label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
      />
    </div>
  );
}
