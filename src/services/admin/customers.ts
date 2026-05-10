import type { AdminCustomerDraft, AdminCustomerRow, AdminOrderRow } from '../../pages/admin/admin-types';

async function getSupabase() {
  const mod = await import('../../lib/supabase');
  return mod.supabase;
}

export function filterCustomers(customers: AdminCustomerRow[], query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return customers;

  return customers.filter((customer) => {
    const haystack = `${customer.name} ${customer.contact_name || ''} ${customer.email || ''} ${customer.phone || ''} ${customer.document || ''}`.toLowerCase();
    return haystack.includes(term);
  });
}

export function toCustomerDraft(customer?: AdminCustomerRow | null): AdminCustomerDraft {
  return {
    customer_kind: customer?.customer_kind || 'person',
    name: customer?.name || '',
    contact_name: customer?.contact_name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    document: customer?.document || '',
    notes: customer?.notes || '',
  };
}

export function validateCustomerDraft(draft: AdminCustomerDraft) {
  if (!draft.name.trim()) return 'Nome do cliente é obrigatório.';
  if (!draft.email.trim() && !draft.phone.trim()) return 'Informe ao menos e-mail ou telefone do cliente.';
  if (draft.customer_kind === 'company' && !draft.contact_name.trim()) return 'Informe o nome do contato responsável pela empresa.';
  return null;
}

export function buildCreateCustomerPayload(draft: AdminCustomerDraft) {
  return {
    customer_kind: draft.customer_kind,
    name: draft.name.trim(),
    contact_name: draft.contact_name.trim() || null,
    email: draft.email.trim() || null,
    phone: draft.phone.trim() || null,
    document: draft.document.trim() || null,
    notes: draft.notes.trim() || null,
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
  const payload = buildCreateCustomerPayload(draft);
  const { error } = await supabase.from('customers').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createCustomer(draft: AdminCustomerDraft): Promise<AdminCustomerRow> {
  const supabase = await getSupabase();
  const payload = buildCreateCustomerPayload(draft);
  const { data, error } = await supabase.from('customers').insert(payload).select('*').single();
  if (error) throw new Error(error.message);
  return data as AdminCustomerRow;
}
