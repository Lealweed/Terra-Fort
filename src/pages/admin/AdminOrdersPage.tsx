import type { AdminOrderEventRow, AdminOrderItemRow, AdminOrderRow } from './admin-types';
import { filterOrders, summarizeOrderItems } from '../../services/admin/orders';

type Props = {
  orders: AdminOrderRow[];
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
};

export default function AdminOrdersPage({
  orders,
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
}: Props) {
  const filteredOrders = filterOrders(orders, orderSearch, orderStatusFilter);
  const itemsSummary = summarizeOrderItems(orderItems);
  const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
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
            <button key={order.id} onClick={() => onSelectOrder(order.id)} className={`w-full text-left p-4 ${selectedOrderId === order.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
              <p className="font-bold">{order.order_code || order.id.slice(0, 8).toUpperCase()} • {order.customer_name}</p>
              <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('pt-BR')} • {order.status} • {money(order.total)}</p>
            </button>
          ))}
          {filteredOrders.length === 0 && <p className="p-4 text-sm text-gray-500">Nenhum pedido encontrado.</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h3 className="font-black text-lg">Gestão do pedido</h3>
        {!selectedOrder ? <p className="text-sm text-gray-500">Selecione um pedido.</p> : (
          <>
            <p className="text-sm"><strong>Pedido:</strong> {selectedOrder.order_code || selectedOrder.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-sm"><strong>Cliente:</strong> {selectedOrder.customer_name}</p>
            <p className="text-sm"><strong>Email:</strong> {selectedOrder.customer_email || '-'}</p>
            <p className="text-sm"><strong>Pagamento:</strong> {selectedOrder.payment_status}</p>

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
  );
}
