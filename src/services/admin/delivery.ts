import type { AdminDriverRow, AdminOrderRow, DeliveryDraft } from '../../pages/admin/admin-types';

const deliveryStatusMap: Record<string, string> = {
  Pendente: 'Pendente',
  Pago: 'Pago',
  'Em separação': 'Pago',
  'Em rota': 'Em rota de entrega',
  'Em rota de entrega': 'Em rota de entrega',
  Concluído: 'Concluído',
  Cancelado: 'Cancelado',
};

async function getSupabase() {
  const mod = await import('../../lib/supabase');
  return mod.supabase;
}

export function buildDeliveryDraft(order?: Pick<AdminOrderRow, 'assigned_driver_id' | 'delivery_address'> | null): DeliveryDraft {
  return {
    driverId: order?.assigned_driver_id || '',
    driverName: order?.delivery_address?.driver_name || '',
    note: order?.delivery_address?.occurrence || '',
  };
}

export function summarizeDeliveryAddress(deliveryAddress: any) {
  if (!deliveryAddress) return 'Endereço não informado';
  if (typeof deliveryAddress === 'string') return deliveryAddress.trim() || 'Endereço não informado';
  if (typeof deliveryAddress !== 'object') return 'Endereço não informado';
  if (typeof deliveryAddress.raw_address === 'string' && deliveryAddress.raw_address.trim()) return deliveryAddress.raw_address.trim();

  const preferredFields = [
    deliveryAddress.street,
    deliveryAddress.number,
    deliveryAddress.complement,
    deliveryAddress.neighborhood,
    deliveryAddress.city,
    deliveryAddress.state,
  ];

  const preferred = preferredFields
    .map((value) => (typeof value === 'string' ? value.trim() : String(value || '').trim()))
    .filter(Boolean);

  if (preferred.length > 0) return preferred.join(', ');

  const fallback = Object.values(deliveryAddress)
    .map((value) => (typeof value === 'string' ? value.trim() : String(value || '').trim()))
    .filter(Boolean);

  return fallback.length > 0 ? fallback.join(', ') : 'Endereço não informado';
}

export function buildMapsSearchUrl(deliveryAddress: any) {
  const label = summarizeDeliveryAddress(deliveryAddress);
  if (!label || label === 'Endereço não informado') return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
}

export function buildPhoneHref(phone: string | null | undefined) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? `tel:${digits}` : null;
}

export function mergeDeliveryAddressMeta(base: any, driverName: string, note: string) {
  const safeBase = base && typeof base === 'object'
    ? base
    : typeof base === 'string' && base.trim()
      ? { raw_address: base.trim() }
      : {};
  return {
    ...safeBase,
    driver_name: driverName,
    occurrence: note,
  };
}

export function mapDeliveryStatusToOrderStatus(status: string) {
  return deliveryStatusMap[status] || status;
}

export function createDeliveryEventDescription(status: string) {
  return `Admin alterou logística para ${status}`;
}

export function resolveDriverName(driverId: string, drivers: AdminDriverRow[], fallbackName = '') {
  const matchedDriver = drivers.find((driver) => driver.id === driverId)?.name;
  if (matchedDriver) return matchedDriver;
  return fallbackName.trim();
}

export async function updateDeliveryStatusRecord(orderId: string, status: string) {
  const supabase = await getSupabase();
  const persistedStatus = mapDeliveryStatusToOrderStatus(status);
  const { error } = await supabase.from('orders').update({ status: persistedStatus }).eq('id', orderId);
  if (error) throw error;

  const { error: eventError } = await supabase.from('order_events').insert({
    order_id: orderId,
    event_type: 'delivery_status_changed',
    description: createDeliveryEventDescription(persistedStatus),
    actor_role: 'admin',
  });

  if (eventError) throw eventError;
}

export async function saveDeliveryMetaRecord(orderId: string, baseAddress: any, driverId: string, driverName: string, note: string) {
  const supabase = await getSupabase();
  const deliveryAddress = mergeDeliveryAddressMeta(baseAddress, driverName, note);

  const { error } = await supabase
    .from('orders')
    .update({ delivery_address: deliveryAddress, assigned_driver_id: driverId || null })
    .eq('id', orderId);

  if (error) throw error;

  const { error: eventError } = await supabase.from('order_events').insert({
    order_id: orderId,
    event_type: 'delivery_meta_updated',
    description: `Entregador: ${driverName || '-'} | Obs: ${note || '-'}`,
    actor_role: 'admin',
  });

  if (eventError) throw eventError;
}
