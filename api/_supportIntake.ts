import './_env.js';
import { supabaseAdmin } from './_supabaseAdmin.js';
import { randomUUID } from 'node:crypto';
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
const DEFAULT_N8N_TIMEOUT_MS = 7000;
const DEFAULT_PERSIST_TIMEOUT_MS = 5000;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_ITEMS = 50;

type SupportIntakeOptions = {
  requestId?: string;
  origin?: string;
};

function digitsOnly(value?: string) {
  return (value || '').replace(/\D/g, '');
}

function sanitizeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || 'unknown_error');
  return raw
    .replace(/(Bearer\s+)[^\s]+/gi, '$1[REDACTED]')
    .replace(/(token|secret|key|authorization)=[^\s&]+/gi, '$1=[REDACTED]')
    .slice(0, 500);
}

function getSupportWhatsappNumber() {
  return digitsOnly(process.env.VITE_SUPPORT_WHATSAPP_NUMBER || process.env.SUPPORT_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER) || DEFAULT_WHATSAPP_NUMBER;
}

function resolveTimeoutMs(rawValue: string | undefined, fallbackMs: number) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackMs;
  }

  return Math.min(Math.max(Math.floor(parsed), 1000), 20000);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeout: () => T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(onTimeout());
      }
    }, timeoutMs);

    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(onTimeout());
        }
      });
  });
}

function normalizePayload(input: Req): SupportPayload {
  const body = (input && typeof input === 'object' && !Array.isArray(input)) ? input : {};

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

function sanitizePayloadForVolume(payload: SupportPayload): { payload: SupportPayload; issues: string[] } {
  const issues: string[] = [];

  const normalizedMessage = typeof payload.message === 'string' ? payload.message : '';
  if (normalizedMessage.length > MAX_MESSAGE_LENGTH) {
    issues.push(`message_truncated_${MAX_MESSAGE_LENGTH}`);
  }

  const normalizedItems = Array.isArray(payload.items) ? payload.items : [];
  if (normalizedItems.length > MAX_ITEMS) {
    issues.push(`items_truncated_${MAX_ITEMS}`);
  }

  return {
    payload: {
      ...payload,
      message: normalizedMessage.slice(0, MAX_MESSAGE_LENGTH),
      items: normalizedItems.slice(0, MAX_ITEMS),
    },
    issues,
  };
}

function resolveRequestId(payload: SupportPayload, options?: SupportIntakeOptions) {
  const metadataRequestId = typeof payload.metadata?.requestId === 'string' ? payload.metadata.requestId.trim() : '';
  const optionRequestId = typeof options?.requestId === 'string' ? options.requestId.trim() : '';
  return metadataRequestId || optionRequestId || randomUUID();
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

async function forwardToN8n(payload: SupportPayload, whatsappUrl: string, requestId: string) {
  const webhookUrl = process.env.N8N_SUPPORT_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
  const webhookToken = process.env.N8N_SUPPORT_WEBHOOK_TOKEN || process.env.N8N_SHARED_SECRET || process.env.AGENT_API_KEY;

  if (!webhookUrl) {
    console.warn('[support-intake] n8n_webhook_missing; fallback_whatsapp_only', { requestId });
    return {
      forwardedToN8n: false,
      n8nStatus: null,
      n8nError: 'N8N_SUPPORT_WEBHOOK_URL não configurado',
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-request-id': requestId,
  };

  if (webhookToken) {
    headers['Authorization'] = `Bearer ${webhookToken}`;
    headers['x-integration-key'] = webhookToken;
  } else {
    console.warn('[support-intake] n8n_webhook_token_missing; sending request without auth header', { requestId });
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
      requestId,
      fallbackWhatsappUrl: whatsappUrl,
      requestedAt: new Date().toISOString(),
    },
  };

  const timeoutMs = resolveTimeoutMs(process.env.N8N_SUPPORT_TIMEOUT_MS, DEFAULT_N8N_TIMEOUT_MS);
  const controller = new AbortController();
  const abortTimeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Falha ao chamar webhook n8n');
      const safeErrorText = (errorText || 'Falha ao chamar webhook n8n').slice(0, 500);
      console.error('[support-intake] n8n_forward_failed', {
        requestId,
        status: response.status,
        error: sanitizeErrorMessage(safeErrorText),
      });
      return {
        forwardedToN8n: false,
        n8nStatus: response.status,
        n8nError: safeErrorText,
      };
    }

    // Alguns webhooks retornam 204/200 sem body; isso é aceitável para intake.
    const responseText = await response.text().catch(() => '');
    if (!responseText.trim()) {
      console.warn('[support-intake] n8n_forward_empty_response', {
        requestId,
        status: response.status,
      });
    }

    return {
      forwardedToN8n: true,
      n8nStatus: response.status,
      n8nError: null,
    };
  } catch (error: any) {
    const safeError = sanitizeErrorMessage(error);
    const isAbort = error?.name === 'AbortError';

    console.error('[support-intake] n8n_forward_exception', {
      requestId,
      error: safeError,
    });

    return {
      forwardedToN8n: false,
      n8nStatus: null,
      n8nError: isAbort
        ? `Timeout ao chamar webhook n8n (${timeoutMs}ms)`
        : (safeError || 'Falha ao chamar webhook n8n'),
    };
  } finally {
    clearTimeout(abortTimeout);
  }
}

async function persistSupportTicket(payload: SupportPayload, whatsappUrl: string, requestId: string) {
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
          requestId,
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
    const safeError = sanitizeErrorMessage(error);
    return {
      persisted: false,
      ticketId: null,
      persistenceError: safeError || 'Falha ao persistir ticket',
    };
  }
}

export async function handleSupportIntake(body: Req, options?: SupportIntakeOptions) {
  const initialPayload = normalizePayload(body);
  const requestId = resolveRequestId(initialPayload, options);
  const { payload, issues } = sanitizePayloadForVolume(initialPayload);
  const message = buildFallbackMessage(payload);
  const whatsappUrl = buildWhatsappUrl(message);
  const persistTimeoutMs = resolveTimeoutMs(process.env.SUPPORT_PERSIST_TIMEOUT_MS, DEFAULT_PERSIST_TIMEOUT_MS);

  if (issues.length > 0) {
    console.warn('[support-intake] payload_sanitized', {
      requestId,
      source: payload.source || 'site',
      intent: payload.intent || 'quote_request',
      issues,
    });
  }

  const [persistence, n8n] = await Promise.all([
    withTimeout(
      persistSupportTicket(payload, whatsappUrl, requestId),
      persistTimeoutMs,
      () => ({
        persisted: false,
        ticketId: null,
        persistenceError: `Timeout ao persistir ticket (${persistTimeoutMs}ms)`,
      }),
    ),
    forwardToN8n(payload, whatsappUrl, requestId),
  ]);

  if (!persistence.persisted) {
    console.error('[support-intake] persist_failed', {
      requestId,
      source: payload.source || 'site',
      intent: payload.intent || 'quote_request',
      error: sanitizeErrorMessage(persistence.persistenceError),
    });
  }

  if (!n8n.forwardedToN8n) {
    console.warn('[support-intake] n8n_unavailable; returning_whatsapp_fallback', {
      requestId,
      n8nStatus: n8n.n8nStatus,
      hasN8nError: !!n8n.n8nError,
    });
  }

  const degraded = !n8n.forwardedToN8n || !persistence.persisted;
  const finalMessage = !n8n.forwardedToN8n
    ? 'Atendimento automático indisponível no momento. Continue pelo WhatsApp.'
    : degraded
      ? 'Recebemos sua solicitação. Se necessário, continue pelo WhatsApp para agilizar.'
      : 'Solicitação recebida com sucesso. Você pode continuar pelo WhatsApp se preferir.';

  return {
    status: 200,
    body: {
      ok: true,
      degraded,
      requestId,
      forwardedToN8n: n8n.forwardedToN8n,
      n8nStatus: n8n.n8nStatus,
      n8nError: n8n.n8nError,
      persisted: persistence.persisted,
      ticketId: persistence.ticketId,
      persistenceError: persistence.persistenceError,
      whatsappUrl,
      fallbackMessage: !n8n.forwardedToN8n
        ? 'Atendimento automático indisponível no momento. Continue pelo WhatsApp.'
        : null,
      finalMessage,
    },
  };
}
