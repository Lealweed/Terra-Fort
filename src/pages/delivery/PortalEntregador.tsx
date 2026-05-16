import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MapPin, Navigation, Package, Phone, Plus, Save, Trash2, Truck, MessageCircle, ArrowLeft, RadioReceiver, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

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
  
  // New States
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [adminMessage, setAdminMessage] = useState('');

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

  // GPS Tracking simulation
  useEffect(() => {
    let watchId: number;
    if (isTracking && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          // Log coordinates to order_events if there is an active delivery selected
          if (selectedId) {
             await supabase.from('order_events').insert({
               order_id: selectedId,
               event_type: 'location_update',
               description: `Coordenadas atualizadas: ${pos.coords.latitude}, ${pos.coords.longitude}`,
               actor_role: 'delivery'
             });
          }
        },
        (err) => console.error("Erro de GPS", err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking, selectedId]);

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

  const sendToAdmin = async () => {
    if (!adminMessage || !selected) return;
    setSaving(true);
    await supabase.from('order_events').insert({
      order_id: selected.id,
      event_type: 'driver_message',
      description: `Mensagem do entregador: ${adminMessage}`,
      actor_role: 'delivery'
    });
    setAdminMessage('');
    setSaving(false);
    alert('Mensagem enviada ao administrador e salva no histórico do pedido!');
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
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* Header com botão de voltar */}
      <header className="bg-brand-black text-white px-4 py-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-gray-800 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-black">Portal do Entregador</h1>
              <p className="text-xs text-gray-400">Terra-Fort Logística</p>
            </div>
          </div>
          <button
            onClick={() => setIsTracking(!isTracking)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors ${isTracking ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-gray-800 text-gray-300'}`}
          >
            <RadioReceiver className={`w-4 h-4 ${isTracking ? 'animate-pulse' : ''}`} />
            {isTracking ? 'GPS Ativo' : 'Ligar GPS'}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Dados do Entregador Mockados para Visualização */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Operador Logístico</p>
              <h2 className="text-xl font-black text-gray-900">Entregador Responsável</h2>
              <p className="text-sm text-gray-600 mt-0.5">Veículo: Furgão Padrão • {isTracking ? 'Status: Transmitindo Rota' : 'Status: Aguardando Inicio'}</p>
            </div>
          </div>
          <button onClick={createEntrega} disabled={saving} className="bg-brand-orange hover:bg-orange-600 text-white rounded-xl px-5 py-3 text-sm font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50">
            <Plus className="w-5 h-5" /> Nova Entrega Avulsa
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Stat title="Rotas do Dia" value={String(stats.total)} icon={<Navigation className="w-6 h-6" />} tone="blue" />
          <Stat title="Concluídas" value={String(stats.done)} icon={<CheckCircle2 className="w-6 h-6" />} tone="green" />
          <Stat title="Pendentes" value={String(stats.pending)} icon={<Package className="w-6 h-6" />} tone="orange" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Lista de Entregas */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm h-[600px] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-black text-gray-900">Suas Entregas</h3>
              <p className="text-xs text-gray-500">Selecione para ver detalhes</p>
            </div>
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="p-5 text-sm font-bold text-gray-400 text-center mt-10">Carregando mapa de rotas...</div>
              ) : items.length === 0 ? (
                <div className="p-5 text-sm font-bold text-gray-400 text-center mt-10">Sem entregas cadastradas.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {items.map((r) => (
                    <button key={r.id} onClick={() => setSelectedId(r.id)} className={`w-full text-left p-4 transition-colors ${selectedId === r.id ? 'bg-orange-50 border-l-4 border-brand-orange' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <p className="font-black text-gray-900 text-sm">{r.orderCode}</p>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${r.status === 'Concluído' ? 'bg-green-100 text-green-700' : r.status === 'Em rota' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-700">{r.customerName}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{r.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detalhes da Entrega */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={saveEntrega} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-5 h-5 text-gray-400" />
                <h2 className="font-black text-xl text-gray-900">Ficha da Entrega</h2>
              </div>

              {!selected ? (
                <p className="text-sm font-bold text-gray-400 text-center py-10">Nenhuma entrega selecionada.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Pedido" value={selected.orderCode} readOnly />
                    <Field label="Cliente" value={selected.customerName} onChange={(v) => updateSelected('customerName', v)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Telefone" value={selected.customerPhone} onChange={(v) => updateSelected('customerPhone', v)} />
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Status Atual</label>
                      <select value={selected.status} onChange={(e) => updateSelected('status', e.target.value as EntregaStatus)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-brand-orange bg-gray-50">
                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <Field label="Endereço Completo" value={selected.address} onChange={(v) => updateSelected('address', v)} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Ocorrência (Motivo de atraso/falha)" value={selected.occurrence || ''} onChange={(v) => updateSelected('occurrence', v)} />
                    <Field label="Link da Foto/Comprovante" value={selected.proofUrl || ''} onChange={(v) => updateSelected('proofUrl', v)} />
                  </div>

                  {/* Ações Rápidas */}
                  <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-3">
                    <button type="submit" disabled={saving} className="bg-brand-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors flex-1 min-w-[140px] disabled:opacity-50">
                      <Save className="w-4 h-4" /> Salvar Ficha
                    </button>
                    
                    {selected.customerPhone && (
                      <a href={`https://wa.me/55${selected.customerPhone.replace(/\\D/g, '')}?text=Olá! Sou o entregador da Terra-Fort.`} target="_blank" rel="noreferrer" className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors flex-1 min-w-[140px]">
                        <MessageCircle className="w-4 h-4" /> WhatsApp Cliente
                      </a>
                    )}
                    
                    {selected.status === 'Em rota' && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.address)}`} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors flex-1 min-w-[140px]">
                        <Truck className="w-4 h-4" /> Navegar (GPS)
                      </a>
                    )}
                  </div>
                </>
              )}
            </form>

            {/* Painel de Comunicação Interna */}
            {selected && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-black text-lg text-gray-900 mb-1">Comunicação Interna</h3>
                <p className="text-xs text-gray-500 mb-4">Envie uma notificação diretamente para os administradores (Log do sistema).</p>
                
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={adminMessage} 
                    onChange={(e) => setAdminMessage(e.target.value)} 
                    placeholder="Ex: Cliente não estava em casa..." 
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-orange"
                  />
                  <button onClick={sendToAdmin} disabled={saving || !adminMessage} className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-6 py-3 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50">
                    <Send className="w-4 h-4" /> Enviar Adm
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function Stat({ title, value, icon, tone = 'blue' }: { title: string; value: string; icon: ReactNode, tone?: 'blue'|'green'|'orange' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
  };
  
  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]} shadow-sm`}>
      <div className="flex items-center justify-between opacity-80 text-sm font-bold uppercase tracking-wider mb-2">
        <span>{title}</span>
        {icon}
      </div>
      <p className="text-3xl font-black">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, readOnly }: { label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${readOnly ? 'bg-gray-50 border-gray-100 text-gray-600' : 'border-gray-200 focus:border-brand-orange bg-white'}`}
      />
    </div>
  );
}
