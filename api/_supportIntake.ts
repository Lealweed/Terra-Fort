import './_env.js';
import { supabaseAdmin } from './_supabaseAdmin.js';
type Req = any;

type SupportPayload = {
  source?: string;
  intent?: string;
  message?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    neighborhood?: string;
    cep?: string;
  };
  product?: {
    id?: string;
    name?: string;
    category?: string;
    price?: number;
    original_price?: number;
    sob_consulta?: boolean;
    stock_level?: number;
  };
  items?: Array<{
    id?: string;
    name?: string;
    quantity?: number;
    unitPrice?: number;
    sobConsulta?: boolean;
  }>;
  totals?: {
    subtotal?: number;
    hasSobConsulta?: boolean;
  };
  metadata?: Record<string, unknown>;
};

const DEFAULT_WHATSAPP_NUMBER = '5594999346107';

function digitsOnly(value?: string) {
  return (value || '').replace(/\D/g, '');
}

function getSupportWhatsappNumber() {
  return digitsOnly(process.env.VITE_SUPPORT_WHATSAPP_NUMBER || process.env.SUPPORT_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER) || DEFAULT_WHATSAPP_NUMBER;
}

function normalizePayload(input: Req): SupportPayload {
  const body = input || {};
  return {
    source: typeof body.source === 'string' ? body.source : 'site',
    intent: typeof body.intent === 'string' ? body.intent : 'quote_request',
    message: typeof body.message === 'string' ? body.message : '',
    customer: body.customer && typeof body.customer === 'object' ? body.customer : undefined,
    product: body.product && typeof body.product === 'object' ? body.product : undefined,
    items: Array.isArray(body.items) ? body.items : [],
    totals: body.totals && typeof body.totals === 'object' ? body.totals : undefined,
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : undefined,
  };
}

function buildFallbackMessage(payload: SupportPayload) {
  const parts: string[] = [];
  const existing = (payload.message || '').trim();
  if (existing) {
    parts.push(existing);
  } else {
    parts.push('Olá! Gostaria de atendimento sobre itens do catálogo da Terra Fort.');
  }

  if (payload.product?.name) {
    const price = Number(payload.product.price || 0);
    const priceLabel = payload.product.sob_consulta ? 'Preço sob consulta' : `Preço atual: R$ ${price.toFixed(2).replace('.', ',')}`;
    parts.push(`\nProduto: ${payload.product.name}`);
    parts.push(priceLabel);
  }

  if (payload.customer?.name) {
    parts.push(`\nCliente: ${payload.customer.name}`);
  }

  return parts.join('\n');
}

function buildWhatsappUrl(message: string) {
  return `https://wa.me/${getSupportWhatsappNumber()}?text=${encodeURIComponent(message)}`;
}

async function forwardToN8n(payload: SupportPayload, whatsappUrl: string) {
  const webhookUrl = process.env.N8N_SUPPORT_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
  const webhookToken = process.env.N8N_SUPPORT_WEBHOOK_TOKEN || process.env.N8N_SHARED_SECRET || process.env.AGENT_API_KEY;

  if (!webhookUrl) {
    return {
      forwardedToN8n: false,
      n8nStatus: null,
      n8nError: 'N8N_SUPPORT_WEBHOOK_URL não configurado',
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (webhookToken) {
    headers['Authorization'] = `Bearer ${webhookToken}`;
    headers['x-integration-key'] = webhookToken;
  }

  const requestBody = {
    event: 'terrafort.support_intake',
    source: payload.source || 'site',
    intent: payload.intent || 'quote_request',
    message: payload.message || '',
    customer: payload.customer || null,
    product: payload.product || null,
    items: payload.items || [],
    totals: payload.totals || null,
    metadata: {
      ...(payload.metadata || {}),
      fallbackWhatsappUrl: whatsappUrl,
      requestedAt: new Date().toISOString(),
    },
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Falha ao chamar webhook n8n');
      return {
        forwardedToN8n: false,
        n8nStatus: response.status,
        n8nError: errorText.slice(0, 500),
      };
    }

    return {
      forwardedToN8n: true,
      n8nStatus: response.status,
      n8nError: null,
    };
  } catch (error: any) {
    return {
      forwardedToN8n: false,
      n8nStatus: null,
      n8nError: error?.message || 'Falha ao chamar webhook n8n',
    };
  }
}

async function persistSupportTicket(payload: SupportPayload, whatsappUrl: string) {
  const handoffRequested =
    payload.intent === 'human_handoff'
    || payload.intent === 'talk_to_human'
    || payload.metadata?.handoffRequested === true
    || payload.metadata?.requestHuman === true;

  try {
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        customer_name: payload.customer?.name?.trim() || 'Cliente do site',
        customer_phone: payload.customer?.phone?.trim() || null,
        customer_email: payload.customer?.email?.trim() || null,
        source: payload.source || 'site',
        intent: payload.intent || 'quote_request',
        status: handoffRequested ? 'waiting_human' : 'new',
        handoff_requested: handoffRequested,
        last_message: (payload.message || '').trim() || null,
        metadata: {
          ...(payload.metadata || {}),
          whatsappUrl,
          product: payload.product || null,
          items: payload.items || [],
          totals: payload.totals || null,
        },
        context: {
          customer: payload.customer || null,
          product: payload.product || null,
          items: payload.items || [],
          totals: payload.totals || null,
        },
      })
      .select('id,status,handoff_requested')
      .single();

    if (error) {
      return {
        persisted: false,
        ticketId: null,
        persistenceError: error.message,
      };
    }

    return {
      persisted: true,
      ticketId: data?.id || null,
      persistenceError: null,
    };
  } catch (error: any) {
    return {
      persisted: false,
      ticketId: null,
      persistenceError: error?.message || 'Falha ao persistir ticket',
    };
  }
}

export async function handleSupportIntake(body: Req) {
  const payload = normalizePayload(body);
  const message = buildFallbackMessage(payload);
  const whatsappUrl = buildWhatsappUrl(message);
  const persistence = await persistSupportTicket(payload, whatsappUrl);
  const n8n = await forwardToN8n(payload, whatsappUrl);

  return {
    status: 200,
    body: {
      ok: true,
      forwardedToN8n: n8n.forwardedToN8n,
      n8nStatus: n8n.n8nStatus,
      n8nError: n8n.n8nError,
      persisted: persistence.persisted,
      ticketId: persistence.ticketId,
      persistenceError: persistence.persistenceError,
      whatsappUrl,
    },
  };
}
