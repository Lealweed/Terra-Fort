import type { AdminCustomerDraft, AdminCustomerRow, AdminOrderRow } from '../../pages/admin/admin-types';

async function getSupabase() {
  const mod = await import('../../lib/supabase');
  return mod.supabase;
}

export function filterCustomers(customers: AdminCustomerRow[], query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return customers;

  return customers.filter((customer) => {
    const haystack = `${customer.name} ${customer.email || ''} ${customer.phone || ''}`.toLowerCase();
    return haystack.includes(term);
  });
}

export function toCustomerDraft(customer?: AdminCustomerRow | null): AdminCustomerDraft {
  return {
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    document: customer?.document || '',
    notes: customer?.notes || '',
  };
}

export function buildCustomerInsights(customer: AdminCustomerRow | null | undefined, orders: AdminOrderRow[]) {
  if (!customer) {
    return { totalOrders: 0, totalRevenue: 0, lastOrderCode: null as string | null };
  }

  const relatedOrders = orders
    .filter((order) => order.customer_email === customer.email || order.customer_name === customer.name)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    totalOrders: relatedOrders.length,
    totalRevenue: relatedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    lastOrderCode: relatedOrders[0]?.order_code || null,
  };
}

export async function listCustomers(): Promise<AdminCustomerRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) throw new Error(error.message);
  return (data || []) as AdminCustomerRow[];
}

export async function updateCustomer(id: string, draft: AdminCustomerDraft) {
  const supabase = await getSupabase();
  const payload = {
    name: draft.name,
    email: draft.email || null,
    phone: draft.phone || null,
    document: draft.document || null,
    notes: draft.notes || null,
  };
  const { error } = await supabase.from('customers').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
}
