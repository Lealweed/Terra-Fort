type VercelRequest = any;
type VercelResponse = any;
import { handleSupportIntake } from './_supportIntake.js';

const DEFAULT_WHATSAPP_NUMBER = '5594999346107';

function digitsOnly(value?: string) {
  return (value || '').replace(/\D/g, '');
}

function buildEmergencyWhatsappUrl(rawMessage: unknown) {
  const message = typeof rawMessage === 'string' && rawMessage.trim()
    ? rawMessage.trim()
    : 'Olá! Preciso de atendimento da Terra Fort.';
  const number = digitsOnly(process.env.VITE_SUPPORT_WHATSAPP_NUMBER || process.env.SUPPORT_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER) || DEFAULT_WHATSAPP_NUMBER;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function sanitizeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || 'unknown_error');
  return raw
    .replace(/(Bearer\s+)[^\s]+/gi, '$1[REDACTED]')
    .replace(/(token|secret|key|authorization)=[^\s&]+/gi, '$1=[REDACTED]')
    .slice(0, 400);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = (typeof req?.headers?.['x-request-id'] === 'string' && req.headers['x-request-id'].trim())
    || (typeof req?.headers?.['x-correlation-id'] === 'string' && req.headers['x-correlation-id'].trim())
    || undefined;

  try {
    const result = await handleSupportIntake(req.body || {}, { requestId, origin: 'vercel_api' });
    if (result?.body?.requestId) {
      res.setHeader('x-request-id', result.body.requestId);
    }
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    if (requestId) {
      res.setHeader('x-request-id', requestId);
    }
    console.error('[support-intake] unhandled_error', {
      requestId: requestId || 'unknown',
      method: req?.method || 'unknown',
      hasBody: !!req?.body,
      error: sanitizeErrorMessage(error),
    });

    return res.status(500).json({
      error: 'Falha ao abrir atendimento. Tente novamente em instantes ou continue pelo WhatsApp.',
      requestId: requestId || 'unknown',
      whatsappUrl: buildEmergencyWhatsappUrl(req?.body?.message),
    });
  }
}

