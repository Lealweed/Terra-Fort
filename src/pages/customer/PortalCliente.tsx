import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Clock3, PackageCheck, Truck, Wallet, MapPin, Phone, ChevronRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
  historico: { etapa: Etapa; horario: string }[];
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
  {
    id: 'TF-1018',
    status: 'Em rota',
    total: 1240,
    previsao: 'Hoje, 14:10',
    endereco: 'Bairro Cidade Nova, QD 12',
    motorista: 'Carlos',
    telefone: '(94) 99999-3412',
    itens: [
      { nome: 'Porcelanato Calacata 84x84', qtd: 12 },
      { nome: 'Rejunte Flexível', qtd: 8 },
    ],
    historico: [
      { etapa: 'Recebido', horario: 'Hoje, 08:20' },
      { etapa: 'Em separação', horario: 'Hoje, 09:00' },
      { etapa: 'Em rota', horario: 'Hoje, 12:52' },
    ],
  },
  {
    id: 'TF-1003',
    status: 'Entregue',
    total: 212.5,
    previsao: '02/05 10:45',
    endereco: 'Av. Liberdade, 2200',
    itens: [{ nome: 'Tubo PVC 25mm', qtd: 10 }],
    historico: [
      { etapa: 'Recebido', horario: '02/05 08:10' },
      { etapa: 'Em separação', horario: '02/05 08:40' },
      { etapa: 'Em rota', horario: '02/05 09:30' },
      { etapa: 'Entregue', horario: '02/05 10:45' },
    ],
  },
];

const etapas: Etapa[] = ['Recebido', 'Em separação', 'Em rota', 'Entregue'];
const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const progresso = (status: Etapa) => ((etapas.indexOf(status) + 1) / etapas.length) * 100;
const dt = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
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

  const eventsByOrder = new Map<string, { etapa: Etapa; horario: string }[]>();
  (events || []).forEach((ev: any) => {
    const txt = `${ev.event_type || ''} ${ev.description || ''}`.toLowerCase();
    let etapa: Etapa = 'Recebido';
    if (txt.includes('separa')) etapa = 'Em separação';
    else if (txt.includes('rota')) etapa = 'Em rota';
    else if (txt.includes('conclu') || txt.includes('entreg')) etapa = 'Entregue';
    const arr = eventsByOrder.get(ev.order_id) || [];
    arr.push({ etapa, horario: dt(ev.created_at) });
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
    };
  });
}

export default function PortalCliente() {
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosMock);
  const [selecionado, setSelecionado] = useState<Pedido>(pedidosMock[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      const data = await loadPedidos();
      if (!mounted) return;
      setPedidos(data);
      setSelecionado((prev) => data.find((p) => p.id === prev.id) || data[0]);
      setLoading(false);
    };

    refresh();

    const channel = supabase
      .channel('portal-cliente-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, refresh)
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-black">Portal do Cliente</h1>
        <span className="text-sm bg-brand-orange/15 text-brand-black font-bold px-3 py-1.5 rounded-full">
          {loading ? 'Carregando...' : 'Rastreamento em tempo real'}
        </span>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card title="Pedidos ativos" value={String(resumo.ativos)} icon={<PackageCheck className="w-5 h-5" />} />
        <Card title="Em rota" value={String(resumo.emRota)} icon={<Truck className="w-5 h-5" />} />
        <Card title="Aguardando" value={String(resumo.aguardando)} icon={<Clock3 className="w-5 h-5" />} />
        <Card title="Saldo em aberto" value={fmt(resumo.saldo)} icon={<Wallet className="w-5 h-5" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b font-bold">Meus pedidos</div>
          <div className="divide-y">
            {pedidos.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelecionado(p)}
                className={`w-full text-left px-5 py-4 transition hover:bg-gray-50 ${selecionado?.id === p.id ? 'bg-orange-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-black text-brand-black">{p.id}</p>
                    <p className="text-xs text-gray-500 mt-1">Previsão: {p.previsao}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100">{p.status}</span>
                    <span className="font-bold">{fmt(p.total)}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selecionado && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Pedido selecionado</p>
              <h2 className="text-xl font-black mt-1">{selecionado.id}</h2>
              <p className="text-sm text-gray-500">Previsão: {selecionado.previsao}</p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2">
                <span>Progresso da entrega</span>
                <span>{Math.round(progresso(selecionado.status))}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-orange transition-all" style={{ width: `${progresso(selecionado.status)}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {etapas.map((e) => {
                  const done = etapas.indexOf(e) <= etapas.indexOf(selecionado.status);
                  return (
                    <div key={e} className={`text-xs rounded-lg px-2 py-1.5 font-bold ${done ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {done ? '✓ ' : ''}{e}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase font-bold">Entrega</p>
              <p className="text-sm font-medium flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 text-gray-500" />{selecionado.endereco}</p>
              {selecionado.motorista && <p className="text-sm">Motorista: <strong>{selecionado.motorista}</strong></p>}
              {selecionado.telefone && (
                <a
                  href={`tel:${selecionado.telefone.replace(/\D/g, '')}`}
                  className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" /> Ligar para entrega
                </a>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">Itens do pedido</p>
              <div className="space-y-1 text-sm">
                {selecionado.itens.length > 0 ? selecionado.itens.map((i, idx) => (
                  <p key={`${i.nome}-${idx}`}>• {i.nome} <strong>x{i.qtd}</strong></p>
                )) : <p className="text-gray-500">Sem itens detalhados.</p>}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">Histórico</p>
              <div className="space-y-2">
                {selecionado.historico.map((h, i) => (
                  <div key={`${h.etapa}-${i}`} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="font-medium">{h.etapa}</span>
                    <span className="text-gray-500">• {h.horario}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between text-gray-500 text-sm">
        <span>{title}</span>{icon}
      </div>
      <p className="text-2xl font-black mt-2">{value}</p>
    </div>
  );
}
