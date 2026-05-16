import type { ReactNode } from 'react';
import { AlertTriangle, MapPin, PackageCheck, Phone, Truck } from 'lucide-react';
import type { AdminDriverRow, AdminOrderEventRow, AdminOrderItemRow, AdminOrderRow } from './admin-types';
import { buildOrderDeliverySnapshot, buildOrdersOperationalSummary, filterOrders, summarizeOrderItems } from '../../services/admin/orders';

type Props = {
  orders: AdminOrderRow[];
  drivers: AdminDriverRow[];
  selectedOrderId: string;
  orderSearch: string;
  orderStatusFilter: string;
  selectedOrder?: AdminOrderRow;
  orderItems: AdminOrderItemRow[];
  orderEvents: AdminOrderEventRow[];
  orderStatuses: string[];
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSelectOrder: (orderId: string) => void;
  onUpdateOrderStatus: (status: string) => Promise<void> | void;
  onOpenDeliveryTab: () => void;
};

export default function AdminOrdersPage({
  orders,
  drivers,
  selectedOrderId,
  orderSearch,
  orderStatusFilter,
  selectedOrder,
  orderItems,
  orderEvents,
  orderStatuses,
  onSearchChange,
  onStatusFilterChange,
  onSelectOrder,
  onUpdateOrderStatus,
  onOpenDeliveryTab,
}: Props) {
  const filteredOrders = filterOrders(orders, orderSearch, orderStatusFilter);
  const itemsSummary = summarizeOrderItems(orderItems);
  const summary = buildOrdersOperationalSummary(filteredOrders, drivers);
  const deliverySnapshot = buildOrderDeliverySnapshot(selectedOrder, drivers);
  const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard title="Pedidos filtrados" value={String(summary.total)} icon={<PackageCheck className="w-5 h-5" />} tone="slate" />
        <SummaryCard title="Sem entregador" value={String(summary.awaitingAssignment)} icon={<Truck className="w-5 h-5" />} tone="orange" />
        <SummaryCard title="Em rota" value={String(summary.inTransit)} icon={<MapPin className="w-5 h-5" />} tone="blue" />
        <SummaryCard title="Com ocorrência" value={String(summary.withOccurrence)} icon={<AlertTriangle className="w-5 h-5" />} tone="red" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b space-y-2">
          <p className="font-bold">Pedidos</p>
          <div className="grid md:grid-cols-2 gap-2">
            <input value={orderSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar por código, cliente ou email" className="border border-gray-200 rounded px-3 py-2 text-sm" />
            <select value={orderStatusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} className="border border-gray-200 rounded px-3 py-2 text-sm">
              <option value="todos">Todos os status</option>
              {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>
        <div className="divide-y max-h-[560px] overflow-auto">
          {filteredOrders.map((order) => (
            <OrderRowCard key={order.id} order={order} drivers={drivers} selected={selectedOrderId === order.id} money={money} onClick={() => onSelectOrder(order.id)} />
          ))}
          {filteredOrders.length === 0 && <p className="p-4 text-sm text-gray-500">Nenhum pedido encontrado.</p>}
        </div>
      </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-sm">
        <h3 className="font-black text-lg">Gestão do pedido</h3>
        {!selectedOrder ? <p className="text-sm text-gray-500">Selecione um pedido.</p> : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <InfoTile label="Pedido" value={selectedOrder.order_code || selectedOrder.id.slice(0, 8).toUpperCase()} />
              <InfoTile label="Pagamento" value={selectedOrder.payment_status} highlight />
              <InfoTile label="Cliente" value={selectedOrder.customer_name} />
              <InfoTile label="Status logístico" value={deliverySnapshot.logisticsStatus} />
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-wider text-gray-500">Operação de entrega</p>
                <button onClick={onOpenDeliveryTab} className="text-xs font-bold text-brand-orange hover:underline">Abrir logística</button>
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Telefone:</strong> {selectedOrder.customer_phone || '-'}</p>
                <p><strong>Endereço:</strong> {deliverySnapshot.addressLabel}</p>
                <p><strong>Entregador:</strong> {deliverySnapshot.driverName || 'Não atribuído'}</p>
                <p><strong>Ocorrência:</strong> {deliverySnapshot.occurrence || 'Sem ocorrência'}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <QuickActionButton href={deliverySnapshot.customerPhoneHref} icon={<Phone className="w-4 h-4" />} label="Ligar cliente" tone="green" disabled={!deliverySnapshot.customerPhoneHref} />
                <QuickActionButton href={deliverySnapshot.mapsUrl} icon={<MapPin className="w-4 h-4" />} label="Abrir rota" tone="blue" disabled={!deliverySnapshot.mapsUrl} />
                <button onClick={onOpenDeliveryTab} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-black px-3 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition-colors">
                  <Truck className="w-4 h-4" /> Ajustar entrega
                </button>
              </div>
            </div>

            {orderItems.length > 0 && (
              <div className="my-4 space-y-2">
                <p className="text-xs text-gray-500 uppercase font-bold">Itens do Pedido</p>
                <div className="space-y-2 border border-gray-100 rounded-lg p-3 bg-gray-50">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.quantity}x {item.product_name}</span>
                      <span className="font-bold">{money(item.line_total)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-2 mt-2 grid gap-1 text-sm">
                    <div className="flex justify-between"><span>Linhas</span><span>{itemsSummary.itemCount}</span></div>
                    <div className="flex justify-between"><span>Quantidade</span><span>{itemsSummary.quantityTotal}</span></div>
                    <div className="flex justify-between font-black"><span>TOTAL</span><span className="text-brand-orange">{money(selectedOrder.total)}</span></div>
                  </div>
                </div>
              </div>
            )}

            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={selectedOrder.status} onChange={(e) => onUpdateOrderStatus(e.target.value)}>
              {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>

            <div>
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">Timeline</p>
              <div className="max-h-52 overflow-auto space-y-2">
                {orderEvents.map((event) => (
                  <div key={event.id} className="text-xs border rounded p-2">
                    <p className="font-semibold">{event.event_type} {event.actor_role ? `• ${event.actor_role}` : ''}</p>
                    <p className="text-gray-500">{event.description || '-'}</p>
                  </div>
                ))}
                {orderEvents.length === 0 && <p className="text-sm text-gray-500">Sem eventos registrados.</p>}
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

function OrderRowCard({ order, drivers, selected, money, onClick }: { order: AdminOrderRow; drivers: AdminDriverRow[]; selected: boolean; money: (value: number) => string; onClick: () => void }) {
  const delivery = buildOrderDeliverySnapshot(order, drivers);

  return (
    <button onClick={onClick} className={`w-full text-left p-4 transition-colors ${selected ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{order.order_code || order.id.slice(0, 8).toUpperCase()} • {order.customer_name}</p>
          <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString('pt-BR')} • {order.status} • {money(order.total)}</p>
          <p className="text-xs text-gray-500 mt-2">{delivery.addressLabel}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge tone={delivery.hasDriver ? 'blue' : 'orange'}>{delivery.hasDriver ? delivery.driverName : 'Sem entregador'}</Badge>
          {delivery.hasOccurrence && <Badge tone="red">Ocorrência</Badge>}
        </div>
      </div>
    </button>
  );
}

function SummaryCard({ title, value, icon, tone }: { title: string; value: string; icon: ReactNode; tone: 'slate' | 'orange' | 'blue' | 'red' }) {
  const tones = {
    slate: 'border-gray-100 bg-white text-gray-800',
    orange: 'border-orange-100 bg-orange-50 text-orange-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    red: 'border-red-100 bg-red-50 text-red-700',
  } as const;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
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

function Badge({ children, tone }: { children: string; tone: 'orange' | 'blue' | 'red' }) {
  const tones = {
    orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
  } as const;
  return <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

function InfoTile({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${highlight ? 'border-orange-100 bg-orange-50' : 'border-gray-100 bg-gray-50/70'}`}>
      <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-1">{value || '-'}</p>
    </div>
  );
}

function QuickActionButton({ href, icon, label, tone, disabled }: { href: string | null; icon: ReactNode; label: string; tone: 'green' | 'blue'; disabled?: boolean }) {
  const tones = {
    green: 'bg-green-600 hover:bg-green-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
  } as const;

  if (disabled || !href) {
    return <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5 text-sm font-bold text-gray-400">{icon} {label}</span>;
  }

  return (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-white transition-colors ${tones[tone]}`}>
      {icon} {label}
    </a>
  );
}
