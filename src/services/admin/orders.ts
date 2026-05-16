import type { AdminDriverRow, AdminOrderEventRow, AdminOrderItemRow, AdminOrderRow } from '../../pages/admin/admin-types';
import { buildMapsSearchUrl, buildPhoneHref, summarizeDeliveryAddress } from './delivery';

async function getSupabase() {
  const mod = await import('../../lib/supabase');
  return mod.supabase;
}

export function filterOrders(orders: AdminOrderRow[], search: string, statusFilter: string) {
  const normalizedSearch = search.trim().toLowerCase();
  return orders.filter((order) => {
    const text = `${order.order_code || ''} ${order.customer_name || ''} ${order.customer_email || ''}`.toLowerCase();
    const matchesText = normalizedSearch ? text.includes(normalizedSearch) : true;
    const matchesStatus = statusFilter === 'todos' ? true : order.status === statusFilter;
    return matchesText && matchesStatus;
  });
}

export function summarizeOrderItems(items: AdminOrderItemRow[]) {
  return {
    itemCount: items.length,
    quantityTotal: items.reduce((acc, item) => acc + Number(item.quantity || 0), 0),
    amountTotal: items.reduce((acc, item) => acc + Number(item.line_total || 0), 0),
  };
}

export function buildOrderDeliverySnapshot(order?: AdminOrderRow | null, drivers: AdminDriverRow[] = []) {
  const meta = order?.delivery_address && typeof order.delivery_address === 'object' ? order.delivery_address : {};
  const assignedDriver = drivers.find((driver) => driver.id === order?.assigned_driver_id) || null;
  const legacyDriverName = typeof meta.driver_name === 'string' ? meta.driver_name.trim() : '';
  const occurrence = typeof meta.occurrence === 'string' ? meta.occurrence.trim() : '';
  const proofUrl = typeof meta.proofUrl === 'string' ? meta.proofUrl.trim() : '';
  const logisticsStatus = mapOrderToLogisticsStatus(order?.status);
  const driverName = assignedDriver?.name || legacyDriverName;
  const driverPhone = assignedDriver?.phone || '';

  return {
    driverName,
    driverPhone,
    occurrence,
    proofUrl,
    hasDriver: Boolean(driverName),
    hasOccurrence: Boolean(occurrence),
    addressLabel: summarizeDeliveryAddress(order?.delivery_address),
    customerPhoneHref: buildPhoneHref(order?.customer_phone),
    mapsUrl: buildMapsSearchUrl(order?.delivery_address),
    logisticsStatus,
  };
}

export function buildOrdersOperationalSummary(orders: AdminOrderRow[], drivers: AdminDriverRow[] = []) {
  return orders.reduce(
    (acc, order) => {
      const snapshot = buildOrderDeliverySnapshot(order, drivers);
      acc.total += 1;
      if ((order.status === 'Pago' || order.status === 'Pendente') && !snapshot.hasDriver) acc.awaitingAssignment += 1;
      if (snapshot.logisticsStatus === 'Em rota') acc.inTransit += 1;
      if (snapshot.hasOccurrence) acc.withOccurrence += 1;
      return acc;
    },
    { total: 0, awaitingAssignment: 0, inTransit: 0, withOccurrence: 0 },
  );
}

function mapOrderToLogisticsStatus(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('rota')) return 'Em rota';
  if (normalized.includes('conclu')) return 'Concluído';
  if (normalized.includes('cancel')) return 'Cancelado';
  if (normalized.includes('pago')) return 'Pronto para logística';
  return 'Pendente';
}

export async function listOrderEvents(orderId: string): Promise<AdminOrderEventRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('order_events')
    .select('id,event_type,description,actor_role,created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as AdminOrderEventRow[];
}

export async function listOrderItems(orderId: string): Promise<AdminOrderItemRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('order_items')
    .select('id,product_name,unit_price,quantity,line_total')
    .eq('order_id', orderId);

  if (error) throw error;
  return (data || []) as AdminOrderItemRow[];
}

export async function updateOrderStatusRecord(orderId: string, status: string) {
  const supabase = await getSupabase();
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  if (error) throw error;

  const { error: eventError } = await supabase.from('order_events').insert({
    order_id: orderId,
    event_type: 'status_changed',
    description: `Admin alterou para ${status}`,
    actor_role: 'admin',
  });

  if (eventError) throw eventError;
}

export type AdminOrderDraft = {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  payment_status: string;
  items: { product_id: string; product_name: string; unit_price: number; quantity: number }[];
};

export async function createAdminOrderRecord(draft: AdminOrderDraft) {
  const supabase = await getSupabase();
  
  const total = draft.items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);

  const { data: order, error: orderError } = await supabase.from('orders').insert({
    customer_name: draft.customer_name,
    customer_phone: draft.customer_phone,
    customer_email: draft.customer_email,
    payment_status: draft.payment_status,
    status: 'Pendente',
    total,
    subtotal: total,
    freight: 0,
    discount: 0,
    notes: 'Criado manualmente pelo Dashboard'
  }).select('id').single();

  if (orderError) throw orderError;

  const itemsPayload = draft.items.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    product_name: item.product_name,
    unit_price: item.unit_price,
    quantity: item.quantity,
  }));

  if (itemsPayload.length > 0) {
    const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
    if (itemsError) throw itemsError;
  }

  return order.id;
}
