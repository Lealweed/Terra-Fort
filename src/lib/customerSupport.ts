/// <reference types="vite/client" />
import { Product } from '../types';

type SupportCustomer = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  cep?: string;
};

type SupportItem = {
  id?: string;
  name: string;
  quantity?: number;
  unitPrice?: number;
  sobConsulta?: boolean;
};

export type SupportPayload = {
  source: 'product_card' | 'product_details' | 'cart_checkout';
  intent: 'price_question' | 'quote_request';
  message: string;
  customer?: SupportCustomer;
  product?: Pick<Product, 'id' | 'name' | 'category' | 'price' | 'original_price' | 'sob_consulta' | 'stock_level'>;
  items?: SupportItem[];
  totals?: {
    subtotal?: number;
    hasSobConsulta?: boolean;
  };
  metadata?: Record<string, unknown>;
};

type SupportResponse = {
  ok: boolean;
  forwardedToN8n: boolean;
  whatsappUrl: string;
  n8nStatus?: number | null;
  n8nError?: string | null;
};

const DEFAULT_WHATSAPP_NUMBER = '5594999346107';
const DEFAULT_SUPPORT_REQUEST_TIMEOUT_MS = 15000;

function digitsOnly(value?: string) {
  return (value || '').replace(/\D/g, '');
}

export function resolveSupportWhatsAppNumber(configuredNumber?: string | null) {
  return digitsOnly(configuredNumber || undefined) || digitsOnly(DEFAULT_WHATSAPP_NUMBER) || DEFAULT_WHATSAPP_NUMBER;
}

function getViteEnv() {
  return (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
}

export function getSupportWhatsAppNumber() {
  const viteEnv = getViteEnv();
  return resolveSupportWhatsAppNumber(viteEnv?.VITE_SUPPORT_WHATSAPP_NUMBER);
}

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${getSupportWhatsAppNumber()}?text=${encodeURIComponent(message)}`;
}

function resolveSupportRequestTimeoutMs() {
  const viteEnv = getViteEnv();
  const parsed = Number(viteEnv?.VITE_SUPPORT_REQUEST_TIMEOUT_MS);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SUPPORT_REQUEST_TIMEOUT_MS;
  }

  return Math.min(Math.max(Math.floor(parsed), 3000), 30000);
}

function sanitizeSupportError(error: unknown) {
  if (!error) return null;
  const raw = error instanceof Error ? error.message : String(error);
  const normalized = raw.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, 240) : null;
}

function summarizePayload(payload: SupportPayload) {
  return {
    source: payload.source,
    intent: payload.intent,
    hasCustomer: !!payload.customer,
    itemsCount: Array.isArray(payload.items) ? payload.items.length : 0,
  };
}

export function getSupportUserFallbackMessage(result: Pick<SupportResponse, 'ok' | 'n8nError'>) {
  if (result.ok) return null;
  return 'Não conseguimos iniciar o atendimento automático agora. Vamos abrir o WhatsApp para você continuar.';
}

export async function submitSupportRequest(payload: SupportPayload): Promise<SupportResponse> {
  const fallbackUrl = buildWhatsAppUrl(payload.message);
  const timeoutMs = resolveSupportRequestTimeoutMs();
  const controller = new AbortController();
  const abortTimeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('/api/support-intake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.whatsappUrl) {
      console.warn('[support] fallback to whatsapp after support-intake failure', {
        status: response.status,
        hasWhatsappUrl: !!data?.whatsappUrl,
        n8nError: sanitizeSupportError(data?.error),
        ...summarizePayload(payload),
      });

      return {
        ok: false,
        forwardedToN8n: false,
        whatsappUrl: fallbackUrl,
        n8nStatus: response.status,
        n8nError: data?.error || 'Falha ao iniciar atendimento',
      };
    }

    return {
      ok: true,
      forwardedToN8n: !!data.forwardedToN8n,
      whatsappUrl: typeof data.whatsappUrl === 'string' ? data.whatsappUrl : fallbackUrl,
      n8nStatus: typeof data.n8nStatus === 'number' ? data.n8nStatus : null,
      n8nError: typeof data.n8nError === 'string' ? data.n8nError : null,
    };
  } catch (error: any) {
    const isAbort = error?.name === 'AbortError';
    console.warn('[support] fallback to whatsapp after network/timeout error', {
      isAbort,
      timeoutMs,
      error: sanitizeSupportError(error),
      ...summarizePayload(payload),
    });

    return {
      ok: false,
      forwardedToN8n: false,
      whatsappUrl: fallbackUrl,
      n8nStatus: null,
      n8nError: isAbort
        ? `Tempo de resposta excedido ao iniciar atendimento (${timeoutMs}ms)`
        : 'Falha de rede ao iniciar atendimento',
    };
  } finally {
    clearTimeout(abortTimeout);
  }
}
