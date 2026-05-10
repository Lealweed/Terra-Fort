import type { DeliveryDraft } from '../../pages/admin/admin-types';

async function getSupabase() {
  const mod = await import('../../lib/supabase');
  return mod.supabase;
}

export function buildDeliveryDraft(deliveryAddress: any): DeliveryDraft {
  return {
    driverName: deliveryAddress?.driver_name || '',
    note: deliveryAddress?.occurrence || '',
  };
}

export function summarizeDeliveryAddress(deliveryAddress: any) {
  if (!deliveryAddress) return 'Endereço não informado';
  if (typeof deliveryAddress === 'string') return deliveryAddress.trim() || 'Endereço não informado';
  if (typeof deliveryAddress !== 'object') return 'Endereço não informado';

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
  const safeBase = base && typeof base === 'object' ? base : {};
  return {
    ...safeBase,
    driver_name: driverName,
    occurrence: note,
  };
}

export function createDeliveryEventDescription(status: string) {
  return `Admin alterou logística para ${status}`;
}

export async function updateDeliveryStatusRecord(orderId: string, status: string) {
  const supabase = await getSupabase();
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  if (error) throw error;

  const { error: eventError } = await supabase.from('order_events').insert({
    order_id: orderId,
    event_type: 'delivery_status_changed',
    description: createDeliveryEventDescription(status),
    actor_role: 'admin',
  });

  if (eventError) throw eventError;
}

export async function saveDeliveryMetaRecord(orderId: string, baseAddress: any, driverName: string, note: string) {
  const supabase = await getSupabase();
  const deliveryAddress = mergeDeliveryAddressMeta(baseAddress, driverName, note);

  const { error } = await supabase
    .from('orders')
    .update({ delivery_address: deliveryAddress })
    .eq('id', orderId);

  if (error) throw error;

  const { error: eventError } = await supabase.from('order_events').insert({
    order_id: orderId,
    event_type: 'delivery_meta_updated',
    description: `Motorista: ${driverName || '-'} | Obs: ${note || '-'}`,
    actor_role: 'admin',
  });

  if (eventError) throw eventError;
}
