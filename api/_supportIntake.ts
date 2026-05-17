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
const DEFAULT_N8N_RETRY_COUNT = 1;
const DEFAULT_N8N_RETRY_BACKOFF_MS = 250;
const DEFAULT_PERSIST_TIMEOUT_MS = 5000;
const DEFAULT_TOTAL_TIMEOUT_MS = 12000;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_ITEMS = 50;
const MAX_FALLBACK_MESSAGE_LENGTH = 2500;

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

function normalizeRequestId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/[^a-zA-Z0-9-_.]/g, '').trim();
  return normalized ? normalized.slice(0, 120) : null;
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

function toSafeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}


function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function normalizeCustomer(customer: SupportPayload['customer']) {
  if (!customer || typeof customer !== 'object') return undefined;
  return {
    name: toSafeText(customer.name, 120),
    phone: toSafeText(customer.phone, 40),
    email: toSafeText(customer.email, 160),
    address: toSafeText(customer.address, 200),
    city: toSafeText(customer.city, 120),
    neighborhood: toSafeText(customer.neighborhood, 120),
    cep: toSafeText(customer.cep, 20),
  };
}

function normalizeItems(items: SupportPayload['items']) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      id: toSafeText(item.id, 80),
      name: toSafeText(item.name, 180),
      quantity: Math.max(0, Math.floor(toSafeNumber(item.quantity, 0))),
      unitPrice: toSafeNumber(item.unitPrice, 0),
      sobConsulta: !!item.sobConsulta,
    }));
}

function summarizePayload(payload: SupportPayload) {
  return {
    source: payload.source || 'site',
    intent: payload.intent || 'quote_request',
    hasMessage: !!toSafeText(payload.message, 40),
    hasCustomer: !!payload.customer,
    itemsCount: Array.isArray(payload.items) ? payload.items.length : 0,
  };
}

function isValidHttpUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
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
  const asRecord = (value: unknown) => (value && typeof value === 'object' && !Array.isArray(value)) ? value : undefined;
  const product = asRecord(body.product) as SupportPayload['product'];

  return {
    source: toSafeText(body.source, 80) || 'site',
    intent: toSafeText(body.intent, 80) || 'quote_request',
    message: typeof body.message === 'string' ? body.message : '',
    customer: normalizeCustomer(asRecord(body.customer) as SupportPayload['customer']),
    product: product ? {
      id: toSafeText(product.id, 80),
      name: toSafeText(product.name, 180),
      category: toSafeText(product.category, 80),
      price: toSafeNumber(product.price, 0),
      original_price: toSafeNumber(product.original_price, 0),
      sob_consulta: !!product.sob_consulta,
      stock_level: Math.floor(toSafeNumber(product.stock_level, 0)),
    } : undefined,
    items: normalizeItems(body.items as SupportPayload['items']),
    totals: asRecord(body.totals) as SupportPayload['totals'],
    metadata: asRecord(body.metadata) as SupportPayload['metadata'],
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
  const metadataRequestId = normalizeRequestId(payload.metadata?.requestId);
  const optionRequestId = normalizeRequestId(options?.requestId);
  return metadataRequestId || optionRequestId || randomUUID();
}

function buildFallbackMessage(payload: SupportPayload) {
  const parts: string[] = [];
  const existing = toSafeText(payload.message, MAX_MESSAGE_LENGTH);
  if (existing) {
    parts.push(existing);
  } else {
    parts.push('Olá! Gostaria de atendimento sobre itens do catálogo da Terra Fort.');
  }

  if (payload.product?.name) {
    const rawPrice = Number(payload.product.price);
    const hasValidPrice = Number.isFinite(rawPrice) && rawPrice >= 0;
    const priceLabel = payload.product.sob_consulta
      ? 'Preço sob consulta'
      : hasValidPrice
        ? `Preço atual: R$ ${rawPrice.toFixed(2).replace('.', ',')}`
        : 'Preço sujeito a confirmação';
    parts.push('\nProduto: ' + toSafeText(payload.product.name, 180));
    parts.push(priceLabel);
  }

  if (payload.customer?.name) {
    parts.push('\nCliente: ' + toSafeText(payload.customer.name, 120));
  }

  return parts.join('\n').slice(0, MAX_FALLBACK_MESSAGE_LENGTH);
}
function buildWhatsappUrl(message: string) {
  return `https://wa.me/${getSupportWhatsappNumber()}?text=${encodeURIComponent(message)}`;
}

async function forwardToN8n(payload: SupportPayload, whatsappUrl: string, requestId: string) {
  const webhookUrl = (process.env.N8N_SUPPORT_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL || '').trim();
  const webhookToken = process.env.N8N_SUPPORT_WEBHOOK_TOKEN || process.env.N8N_SHARED_SECRET || process.env.AGENT_API_KEY;

  if (!webhookUrl) {
    console.warn('[support-intake] n8n_webhook_missing; fallback_whatsapp_only', { requestId });
    return {
      forwardedToN8n: false,
      n8nStatus: null,
      n8nError: 'N8N_SUPPORT_WEBHOOK_URL não configurado',
      n8nErrorCode: 'N8N_WEBHOOK_MISSING',
    };
  }

  if (!isValidHttpUrl(webhookUrl)) {
    console.error('[support-intake] n8n_webhook_invalid_url; fallback_whatsapp_only', { requestId });
    return {
      forwardedToN8n: false,
      n8nStatus: null,
      n8nError: 'N8N_SUPPORT_WEBHOOK_URL inválida',
      n8nErrorCode: 'N8N_WEBHOOK_INVALID_URL',
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
  const retryCountRaw = Number(process.env.N8N_SUPPORT_RETRY_COUNT);
  const retryCount = Number.isFinite(retryCountRaw)
    ? Math.min(Math.max(Math.floor(retryCountRaw), 0), 2)
    : DEFAULT_N8N_RETRY_COUNT;
  const retryBackoffRaw = Number(process.env.N8N_SUPPORT_RETRY_BACKOFF_MS);
  const retryBackoffMs = Number.isFinite(retryBackoffRaw)
    ? Math.min(Math.max(Math.floor(retryBackoffRaw), 0), 2000)
    : DEFAULT_N8N_RETRY_BACKOFF_MS;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
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
        const canRetry = (response.status >= 500 || response.status === 429) && attempt < retryCount;

        if (canRetry) {
          console.warn('[support-intake] n8n_forward_retry', {
            requestId,
            attempt: attempt + 1,
            status: response.status,
          });
          await new Promise((resolve) => setTimeout(resolve, retryBackoffMs));
          continue;
        }

        console.error('[support-intake] n8n_forward_failed', {
          requestId,
          status: response.status,
          error: sanitizeErrorMessage(safeErrorText),
          attempt: attempt + 1,
        });
        return {
          forwardedToN8n: false,
          n8nStatus: response.status,
          n8nError: safeErrorText,
          n8nErrorCode: `N8N_HTTP_${response.status}`,
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
        n8nErrorCode: null,
      };
    } catch (error: any) {
      const safeError = sanitizeErrorMessage(error);
      const isAbort = error?.name === 'AbortError';
      const canRetry = attempt < retryCount;

      if (canRetry) {
        console.warn('[support-intake] n8n_forward_retry_exception', {
          requestId,
          attempt: attempt + 1,
          error: safeError,
        });
        await new Promise((resolve) => setTimeout(resolve, retryBackoffMs));
        continue;
      }

      console.error('[support-intake] n8n_forward_exception', {
        requestId,
        error: safeError,
        attempt: attempt + 1,
      });

      return {
        forwardedToN8n: false,
        n8nStatus: null,
        n8nError: isAbort
          ? `Timeout ao chamar webhook n8n (${timeoutMs}ms)`
          : (safeError || 'Falha ao chamar webhook n8n'),
        n8nErrorCode: isAbort ? 'N8N_TIMEOUT' : 'N8N_REQUEST_EXCEPTION',
      };
    } finally {
      clearTimeout(abortTimeout);
    }
  }

  return {
    forwardedToN8n: false,
    n8nStatus: null,
    n8nError: 'Falha ao chamar webhook n8n',
    n8nErrorCode: 'N8N_REQUEST_FAILED',
  };
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
      const safeError = sanitizeErrorMessage(error.message);
      return {
        persisted: false,
        ticketId: null,
        persistenceError: safeError || 'Falha ao persistir ticket',
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
  const startedAt = Date.now();
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

  const totalTimeoutMs = resolveTimeoutMs(process.env.SUPPORT_INTAKE_TOTAL_TIMEOUT_MS, DEFAULT_TOTAL_TIMEOUT_MS);

  console.info('[support-intake] received', {
    requestId,
    origin: options?.origin || 'unknown',
    ...summarizePayload(payload),
  });

  const [persistence, n8n] = await withTimeout(
    Promise.all([
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
    ]),
    totalTimeoutMs,
    () => {
      console.error('[support-intake] total_timeout', {
        requestId,
        timeoutMs: totalTimeoutMs,
      });

      return [
        {
          persisted: false,
          ticketId: null,
          persistenceError: `Timeout geral no intake (${totalTimeoutMs}ms)`,
        },
        {
          forwardedToN8n: false,
          n8nStatus: null,
          n8nError: `Timeout geral no intake (${totalTimeoutMs}ms)`,
          n8nErrorCode: 'SUPPORT_INTAKE_TOTAL_TIMEOUT',
        },
      ] as const;
    },
  );

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
  const degradedReasons = [
    !n8n.forwardedToN8n ? 'n8n_unavailable' : null,
    !persistence.persisted ? 'persistence_failed' : null,
  ].filter(Boolean);
  const finalMessage = !n8n.forwardedToN8n
    ? 'Atendimento automático indisponível no momento. Continue pelo WhatsApp.'
    : degraded
      ? 'Recebemos sua solicitação. Se necessário, continue pelo WhatsApp para agilizar.'
      : 'Solicitação recebida com sucesso. Você pode continuar pelo WhatsApp se preferir.';

  console.info('[support-intake] completed', {
    requestId,
    origin: options?.origin || 'unknown',
    source: payload.source || 'site',
    intent: payload.intent || 'quote_request',
    durationMs: Date.now() - startedAt,
    degraded,
    degradedReasons,
  });

  return {
    status: 200,
    body: {
      ok: true,
      degraded,
      degradedReasons,
      requestId,
      forwardedToN8n: n8n.forwardedToN8n,
      n8nStatus: n8n.n8nStatus,
      n8nError: !n8n.forwardedToN8n ? 'Atendimento automático temporariamente indisponível.' : null,
      n8nErrorCode: !n8n.forwardedToN8n ? (n8n.n8nErrorCode || 'N8N_UNAVAILABLE') : null,
      persisted: persistence.persisted,
      ticketId: persistence.ticketId,
      persistenceError: !persistence.persisted ? 'Não foi possível registrar o atendimento automaticamente.' : null,
      persistenceErrorCode: !persistence.persisted ? 'PERSISTENCE_FAILED' : null,
      whatsappUrl,
      fallbackMessage: !n8n.forwardedToN8n
        ? 'Atendimento automático indisponível no momento. Continue pelo WhatsApp.'
        : null,
      finalMessage,
    },
  };
}
