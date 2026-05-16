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

function digitsOnly(value?: string) {
  return (value || '').replace(/\D/g, '');
}

export function resolveSupportWhatsAppNumber(configuredNumber?: string | null) {
  return digitsOnly(configuredNumber || undefined) || digitsOnly(DEFAULT_WHATSAPP_NUMBER) || DEFAULT_WHATSAPP_NUMBER;
}

export function getSupportWhatsAppNumber() {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return resolveSupportWhatsAppNumber(viteEnv?.VITE_SUPPORT_WHATSAPP_NUMBER);
}

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${getSupportWhatsAppNumber()}?text=${encodeURIComponent(message)}`;
}

export async function submitSupportRequest(payload: SupportPayload): Promise<SupportResponse> {
  const fallbackUrl = buildWhatsAppUrl(payload.message);

  try {
    const response = await fetch('/api/support-intake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.whatsappUrl) {
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
  } catch {
    return {
      ok: false,
      forwardedToN8n: false,
      whatsappUrl: fallbackUrl,
      n8nStatus: null,
      n8nError: 'Falha de rede ao iniciar atendimento',
    };
  }
}
