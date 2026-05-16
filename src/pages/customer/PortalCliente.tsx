import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Clock3, PackageCheck, Truck, Wallet, MapPin, Phone, ChevronRight, CheckCircle2, ArrowLeft, RadioReceiver, Navigation } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

type Etapa = 'Recebido' | 'Em separação' | 'Em rota' | 'Entregue';

type Pedido = {
  orderId?: string;
  id: string;
  status: Etapa;
  total: number;
  previsao: string;
  endereco: string;
  motorista?: string;
  telefone?: string;
  itens: { nome: string; qtd: number }[];
  historico: { etapa: Etapa; horario: string, description?: string }[];
  location?: { lat: number, lng: number, timestamp: string };
};

const pedidosMock: Pedido[] = [
  {
    id: 'TF-1021',
    status: 'Em separação',
    total: 389.9,
    previsao: 'Hoje, 16:30',
    endereco: 'Rua A, 455 - Parauapebas',
    itens: [
      { nome: 'Cimento CP II-E 32 RS', qtd: 6 },
      { nome: 'Argamassa ACIII', qtd: 4 },
    ],
    historico: [
      { etapa: 'Recebido', horario: 'Hoje, 09:02' },
      { etapa: 'Em separação', horario: 'Hoje, 10:11' },
    ],
  },
];

const etapas: Etapa[] = ['Recebido', 'Em separação', 'Em rota', 'Entregue'];
const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const progresso = (status: Etapa) => ((etapas.indexOf(status) + 1) / etapas.length) * 100;
const dt = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

function mapStatus(status?: string): Etapa {
  if (!status) return 'Recebido';
  const s = status.toLowerCase();
  if (s.includes('rota')) return 'Em rota';
  if (s.includes('separa')) return 'Em separação';
  if (s.includes('conclu') || s.includes('entreg')) return 'Entregue';
  return 'Recebido';
}

async function loadPedidos(): Promise<Pedido[]> {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  let query = supabase
    .from('orders')
    .select('id, order_code, status, total, created_at, updated_at, delivery_address, customer_phone, customer_email, notes')
    .order('created_at', { ascending: false })
    .limit(50);

  const userRole = (user?.user_metadata as any)?.role || (user?.app_metadata as any)?.role;
  if (user?.email && userRole === 'customer') {
    query = query.eq('customer_email', user.email);
  }

  const { data: orders, error } = await query;

  if (error || !orders || orders.length === 0) return pedidosMock;

  const orderIds = orders.map((o) => o.id);
  const { data: items } = await supabase
    .from('order_items')
    .select('order_id, product_name, quantity')
    .in('order_id', orderIds);

  const { data: events } = await supabase
    .from('order_events')
    .select('order_id, event_type, description, created_at')
    .in('order_id', orderIds)
    .order('created_at', { ascending: true });

  const grouped = new Map<string, { nome: string; qtd: number }[]>();
  (items || []).forEach((it) => {
    const arr = grouped.get(it.order_id) || [];
    arr.push({ nome: it.product_name, qtd: it.quantity });
    grouped.set(it.order_id, arr);
  });

  const eventsByOrder = new Map<string, { etapa: Etapa; horario: string, description?: string }[]>();
  const locationsByOrder = new Map<string, { lat: number, lng: number, timestamp: string }>();

  (events || []).forEach((ev: any) => {
    if (ev.event_type === 'location_update') {
      const match = ev.description?.match(/(-?\\d+\\.\\d+),\\s*(-?\\d+\\.\\d+)/);
      if (match) {
        locationsByOrder.set(ev.order_id, {
          lat: parseFloat(match[1]),
          lng: parseFloat(match[2]),
          timestamp: ev.created_at
        });
      }
      return; // don't add GPS pings to the visual history timeline
    }

    const txt = \`\${ev.event_type || ''} \${ev.description || ''}\`.toLowerCase();
    let etapa: Etapa = 'Recebido';
    if (txt.includes('separa')) etapa = 'Em separação';
    else if (txt.includes('rota')) etapa = 'Em rota';
    else if (txt.includes('conclu') || txt.includes('entreg')) etapa = 'Entregue';
    
    const arr = eventsByOrder.get(ev.order_id) || [];
    arr.push({ etapa, horario: dt(ev.created_at), description: ev.description });
    eventsByOrder.set(ev.order_id, arr);
  });

  return orders.map((o) => {
    const etapa = mapStatus(o.status);
    const address = (o.delivery_address && typeof o.delivery_address === 'object')
      ? Object.values(o.delivery_address as Record<string, unknown>).filter(Boolean).join(', ')
      : 'Endereço não informado';

    const historicoBase: { etapa: Etapa; horario: string }[] = [
      { etapa: 'Recebido', horario: dt(o.created_at) },
    ];
    if (etapa === 'Em separação' || etapa === 'Em rota' || etapa === 'Entregue') historicoBase.push({ etapa: 'Em separação', horario: dt(o.updated_at) });
    if (etapa === 'Em rota' || etapa === 'Entregue') historicoBase.push({ etapa: 'Em rota', horario: dt(o.updated_at) });
    if (etapa === 'Entregue') historicoBase.push({ etapa: 'Entregue', horario: dt(o.updated_at) });

    return {
      orderId: o.id,
      id: o.order_code || o.id.slice(0, 8).toUpperCase(),
      status: etapa,
      total: Number(o.total || 0),
      previsao: dt(o.updated_at),
      endereco: address,
      telefone: o.customer_phone || undefined,
      itens: grouped.get(o.id) || [],
      historico: eventsByOrder.get(o.id)?.length ? eventsByOrder.get(o.id)! : historicoBase,
      motorista: undefined,
      location: locationsByOrder.get(o.id),
    };
  });
}

export default function PortalCliente() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selecionado, setSelecionado] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      const data = await loadPedidos();
      if (!mounted) return;
      setPedidos(data);
      if (data.length > 0) {
        setSelecionado((prev) => data.find((p) => p.id === prev?.id) || data[0]);
      } else {
        setSelecionado(null);
      }
      setLoading(false);
    };

    refresh();

    // Subscribe to events so location updates trigger a refresh
    const channel = supabase
      .channel('portal-cliente-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_events' }, refresh) // specific listener for location events
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const resumo = useMemo(() => {
    const ativos = pedidos.filter((p) => p.status !== 'Entregue');
    return {
      ativos: ativos.length,
      emRota: pedidos.filter((p) => p.status === 'Em rota').length,
      aguardando: pedidos.filter((p) => p.status === 'Recebido' || p.status === 'Em separação').length,
      saldo: ativos.reduce((acc, p) => acc + p.total, 0),
    };
  }, [pedidos]);

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
              <h1 className="text-xl font-black">Portal do Cliente</h1>
              <p className="text-xs text-gray-400">Terra-Fort Materiais</p>
            </div>
          </div>
          <span className="text-xs bg-brand-orange/20 text-brand-orange font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
            <RadioReceiver className="w-3.5 h-3.5 animate-pulse" />
            {loading ? 'Sincronizando...' : 'Live Tracking'}
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="grid md:grid-cols-4 gap-4">
          <Card title="Pedidos ativos" value={String(resumo.ativos)} icon={<PackageCheck className="w-5 h-5" />} />
          <Card title="Em rota de entrega" value={String(resumo.emRota)} icon={<Truck className="w-5 h-5" />} />
          <Card title="Aguardando loja" value={String(resumo.aguardando)} icon={<Clock3 className="w-5 h-5" />} />
          <Card title="Saldo em aberto" value={fmt(resumo.saldo)} icon={<Wallet className="w-5 h-5" />} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm h-[600px] flex flex-col">
            <div className="px-5 py-4 border-b bg-gray-50/50">
              <h3 className="font-black text-gray-900">Seus Pedidos</h3>
            </div>
            <div className="flex-1 overflow-auto divide-y divide-gray-100">
              {loading ? (
                <div className="p-5 text-center text-sm font-bold text-gray-400">Procurando pedidos...</div>
              ) : pedidos.length === 0 ? (
                <div className="p-5 text-center text-sm font-bold text-gray-400">Nenhum pedido encontrado no seu e-mail.</div>
              ) : pedidos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelecionado(p)}
                  className={\`w-full text-left p-4 transition-colors \${selecionado?.id === p.id ? 'bg-orange-50 border-l-4 border-brand-orange' : 'hover:bg-gray-50 border-l-4 border-transparent'}\`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-black text-gray-900 text-sm">{p.id}</p>
                      <p className="text-xs text-gray-500 mt-1">Previsão: {p.previsao}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={\`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider \${p.status === 'Entregue' ? 'bg-green-100 text-green-700' : p.status === 'Em rota' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}\`}>
                        {p.status}
                      </span>
                      <span className="font-bold text-sm text-gray-900">{fmt(p.total)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selecionado && (
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                
                {/* Rastreamento Live Hero */}
                {selecionado.status === 'Em rota' ? (
                  <div className="bg-brand-black text-white rounded-xl p-5 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <RadioReceiver className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <span className="bg-green-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full animate-pulse inline-flex items-center gap-1 mb-2">
                          <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Ao vivo
                        </span>
                        <h2 className="text-2xl font-black">Seu pedido está a caminho!</h2>
                        <p className="text-sm text-gray-400 mt-1">O entregador ativou o GPS. Acompanhe a entrega.</p>
                      </div>
                      
                      {selecionado.location ? (
                        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-md border border-white/10 text-center">
                          <Navigation className="w-6 h-6 mx-auto text-brand-orange mb-1" />
                          <p className="text-xs font-bold uppercase tracking-wider">Localização Obtida</p>
                          <p className="text-[10px] text-gray-400">Ultima att: {dt(selecionado.location.timestamp)}</p>
                          <a href={\`https://www.google.com/maps/search/?api=1&query=\${selecionado.location.lat},\${selecionado.location.lng}\`} target="_blank" rel="noreferrer" className="text-brand-orange hover:text-orange-400 text-xs font-bold mt-2 inline-block underline">
                            Ver no Google Maps
                          </a>
                        </div>
                      ) : (
                        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-md border border-white/10 text-center">
                          <Truck className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-300">Aguardando Sinal</p>
                          <p className="text-[10px] text-gray-500">Conectando ao entregador...</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : selecionado.status === 'Entregue' ? (
                  <div className="bg-green-50 text-green-800 rounded-xl p-5 mb-6 border border-green-100 flex items-center gap-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                    <div>
                      <h2 className="text-xl font-black">Pedido Entregue!</h2>
                      <p className="text-sm text-green-700">Obrigado por comprar com a Terra-Fort.</p>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-black text-gray-900">Pedido {selecionado.id}</h2>
                    <p className="text-sm text-gray-500">Previsão: {selecionado.previsao}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2">
                    <span>Progresso da entrega</span>
                    <span>{Math.round(progresso(selecionado.status))}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-orange transition-all duration-1000" style={{ width: \`\${progresso(selecionado.status)}%\` }} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                    {etapas.map((e) => {
                      const done = etapas.indexOf(e) <= etapas.indexOf(selecionado.status);
                      const current = e === selecionado.status;
                      return (
                        <div key={e} className={\`text-xs rounded-xl px-2 py-2 font-bold text-center border transition-colors \${current ? 'bg-orange-50 border-orange-200 text-brand-orange' : done ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}\`}>
                          {e}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-8 border-t border-gray-100 pt-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Endereço de Entrega</h3>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <p className="text-sm font-medium text-gray-700">{selecionado.endereco}</p>
                    </div>

                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mt-6">Itens do pedido</h3>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                      {selecionado.itens.length > 0 ? selecionado.itens.map((i, idx) => (
                        <div key={\`\${i.nome}-\${idx}\`} className="flex justify-between text-sm">
                          <span className="text-gray-700">{i.nome}</span>
                          <span className="font-bold text-gray-900">x{i.qtd}</span>
                        </div>
                      )) : <p className="text-sm text-gray-500">Sem itens detalhados.</p>}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">Histórico de Rastreamento</h3>
                    <div className="space-y-0">
                      {selecionado.historico.map((h, i) => (
                        <div key={\`\${h.etapa}-\${i}\`} className="relative pl-6 pb-6 last:pb-0">
                          {/* Linha do tempo */}
                          {i !== selecionado.historico.length - 1 && (
                            <div className="absolute top-2 left-[9px] bottom-0 w-0.5 bg-gray-200" />
                          )}
                          <div className="absolute top-1 left-0 w-5 h-5 rounded-full bg-brand-orange border-4 border-white shadow-sm flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          </div>
                          
                          <div>
                            <p className="font-bold text-sm text-gray-900">{h.etapa}</p>
                            <p className="text-xs text-gray-500">{h.horario}</p>
                            {h.description && !h.description.includes('Coordenadas') && (
                              <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded-lg border border-gray-100">{h.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between text-gray-500 text-sm font-bold uppercase tracking-wider mb-2 opacity-80">
        <span>{title}</span>{icon}
      </div>
      <p className="text-3xl font-black text-gray-900">{value}</p>
    </div>
  );
}
