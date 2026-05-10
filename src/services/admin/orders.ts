import type { AdminOrderEventRow, AdminOrderItemRow, AdminOrderRow } from '../../pages/admin/admin-types';

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
