import { supabaseAdmin } from './_supabaseAdmin.js';

type AgentContextParams = {
  phone?: string;
  email?: string;
  orderCode?: string;
  productQuery?: string;
};

type OrderRow = {
  id: string;
  order_code: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  updated_at: string;
  delivery_address: Record<string, unknown> | null;
  notes: string | null;
};

function assertSupabaseOk(error: { message?: string; code?: string } | null | undefined, operation: string) {
  if (error) {
    throw new Error(`Agent context failed at ${operation}: ${error.message || 'unknown Supabase error'}`);
  }
}

function isMissingRelationError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  const text = JSON.stringify(error).toLowerCase();
  return text.includes('pgrst205')
    || text.includes('schema cache')
    || text.includes('could not find the table')
    || (text.includes('relation') && text.includes('does not exist'));
}

function digitsOnly(value?: string) {
  return (value || '').replace(/\D/g, '');
}

function normalizeSearch(value?: string) {
  return (value || '').trim();
}

function normalizeAddress(address: Record<string, unknown> | null | undefined) {
  if (!address || typeof address !== 'object') return 'Endereço não informado';
  return Object.values(address).filter(Boolean).join(', ');
}

function isPromotionActive(startsAt?: string | null, endsAt?: string | null) {
  const now = Date.now();
  const starts = startsAt ? new Date(startsAt).getTime() : null;
  const ends = endsAt ? new Date(endsAt).getTime() : null;
  if (starts && starts > now) return false;
  if (ends && ends < now) return false;
  return true;
}

async function findCustomer(phone?: string, email?: string) {
  const normalizedPhone = digitsOnly(phone);
  const normalizedEmail = normalizeSearch(email).toLowerCase();

  if (normalizedEmail) {
    const byEmail = await supabaseAdmin
      .from('customers')
      .select('id,name,email,phone,document,notes,created_at,updated_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    assertSupabaseOk(byEmail.error, 'customers.byEmail');

    if (byEmail.data) return byEmail.data;
  }

  if (!normalizedPhone) return null;

  const byPhone = await supabaseAdmin
    .from('customers')
    .select('id,name,email,phone,document,notes,created_at,updated_at')
    .limit(50);

  assertSupabaseOk(byPhone.error, 'customers.byPhone');

  return (byPhone.data || []).find((customer: any) => digitsOnly(customer.phone) === normalizedPhone) || null;
}

async function findOrders({ orderCode, email, phone, customerId }: { orderCode?: string; email?: string; phone?: string; customerId?: string | null }) {
  const normalizedOrderCode = normalizeSearch(orderCode);
  const normalizedEmail = normalizeSearch(email).toLowerCase();
  const normalizedPhone = digitsOnly(phone);

  if (normalizedOrderCode) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id,order_code,customer_id,customer_name,customer_email,customer_phone,status,payment_status,total,created_at,updated_at,delivery_address,notes')
      .ilike('order_code', normalizedOrderCode)
      .limit(5);

    assertSupabaseOk(error, 'orders.byOrderCode');

    return (data || []) as OrderRow[];
  }

  let query = supabaseAdmin
    .from('orders')
    .select('id,order_code,customer_id,customer_name,customer_email,customer_phone,status,payment_status,total,created_at,updated_at,delivery_address,notes')
    .order('created_at', { ascending: false })
    .limit(5);

  if (customerId) {
    query = query.eq('customer_id', customerId);
  } else if (normalizedEmail) {
    query = query.eq('customer_email', normalizedEmail);
  }

  const { data, error } = await query;
  assertSupabaseOk(error, 'orders.list');
  const orders = ((data || []) as OrderRow[]).filter((order) => {
    if (!normalizedPhone) return true;
    return digitsOnly(order.customer_phone || '') === normalizedPhone;
  });

  return orders;
}

async function loadOrderDetails(orderIds: string[]) {
  if (!orderIds.length) {
    return { itemsByOrder: new Map<string, any[]>(), eventsByOrder: new Map<string, any[]>() };
  }

  const [{ data: items, error: itemsError }, { data: events, error: eventsError }] = await Promise.all([
    supabaseAdmin
      .from('order_items')
      .select('order_id,product_name,unit_price,quantity,line_total')
      .in('order_id', orderIds),
    supabaseAdmin
      .from('order_events')
      .select('order_id,event_type,description,actor_role,created_at')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false }),
  ]);

  assertSupabaseOk(itemsError, 'order_items.list');
  assertSupabaseOk(eventsError, 'order_events.list');

  const itemsByOrder = new Map<string, any[]>();
  const eventsByOrder = new Map<string, any[]>();

  (items || []).forEach((item: any) => {
    const current = itemsByOrder.get(item.order_id) || [];
    current.push(item);
    itemsByOrder.set(item.order_id, current);
  });

  (events || []).forEach((event: any) => {
    const current = eventsByOrder.get(event.order_id) || [];
    current.push(event);
    eventsByOrder.set(event.order_id, current);
  });

  return { itemsByOrder, eventsByOrder };
}

async function findProducts(productQuery?: string) {
  const search = normalizeSearch(productQuery);
  if (!search) return [];

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id,sku,name,category,price,original_price,stock_level,sob_consulta,is_active')
    .or(`name.ilike.%${search}%,category.ilike.%${search}%,brand.ilike.%${search}%`)
    .eq('is_active', true)
    .limit(8);

  assertSupabaseOk(error, 'products.search');

  return data || [];
}

async function findPromotions() {
  const { data, error } = await supabaseAdmin
    .from('promotions')
    .select('id,title,slug,description,badge,discount_type,discount_value,starts_at,ends_at,applies_to_all,product_ids,metadata')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(10);

  if (isMissingRelationError(error)) {
    return [];
  }

  assertSupabaseOk(error, 'promotions.list');

  return (data || []).filter((promotion: any) => isPromotionActive(promotion.starts_at, promotion.ends_at));
}

async function findIntegrationStatus() {
  const { data, error } = await supabaseAdmin
    .from('integration_connections')
    .select('id,name,provider,status,last_synced_at,metadata')
    .order('provider', { ascending: true })
    .limit(10);

  if (isMissingRelationError(error)) {
    return [];
  }

  assertSupabaseOk(error, 'integration_connections.list');

  return data || [];
}

export async function buildAgentContext(params: AgentContextParams) {
  const customer = await findCustomer(params.phone, params.email);
  const orders = await findOrders({
    orderCode: params.orderCode,
    email: params.email,
    phone: params.phone,
    customerId: customer?.id || null,
  });

  const orderIds = orders.map((order) => order.id);
  const [{ itemsByOrder, eventsByOrder }, products, promotions, integrations] = await Promise.all([
    loadOrderDetails(orderIds),
    findProducts(params.productQuery),
    findPromotions(),
    findIntegrationStatus(),
  ]);

  return {
    business: {
      company: 'Terra Fort',
      segment: 'Loja de material de construcao',
      region: 'Parauapebas - PA',
      paymentMethods: ['cartao', 'boleto', 'pix'],
      channels: ['loja online', 'portal do cliente', 'portal do entregador', 'portal administrativo', 'whatsapp'],
    },
    customer: customer
      ? {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          document: customer.document,
          notes: customer.notes,
          createdAt: customer.created_at,
        }
      : null,
    orders: orders.map((order) => ({
      id: order.id,
      orderCode: order.order_code || order.id.slice(0, 8).toUpperCase(),
      customerName: order.customer_name,
      status: order.status,
      paymentStatus: order.payment_status,
      total: Number(order.total || 0),
      address: normalizeAddress(order.delivery_address),
      notes: order.notes,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: itemsByOrder.get(order.id) || [],
      timeline: (eventsByOrder.get(order.id) || []).slice(0, 10),
    })),
    products: products.map((product: any) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      price: Number(product.price || 0),
      originalPrice: product.original_price == null ? null : Number(product.original_price),
      stockLevel: Number(product.stock_level || 0),
      sobConsulta: !!product.sob_consulta,
    })),
    promotions: promotions.map((promotion: any) => ({
      id: promotion.id,
      title: promotion.title,
      slug: promotion.slug,
      description: promotion.description,
      badge: promotion.badge,
      discountType: promotion.discount_type,
      discountValue: Number(promotion.discount_value || 0),
      startsAt: promotion.starts_at,
      endsAt: promotion.ends_at,
      appliesToAll: promotion.applies_to_all,
      productIds: Array.isArray(promotion.product_ids) ? promotion.product_ids : [],
      metadata: promotion.metadata || {},
    })),
    integrations: integrations.map((integration: any) => ({
      id: integration.id,
      name: integration.name,
      provider: integration.provider,
      status: integration.status,
      lastSyncedAt: integration.last_synced_at,
      metadata: integration.metadata || {},
    })),
    requestedAt: new Date().toISOString(),
  };
}