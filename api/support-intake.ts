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


function normalizeRequestBody(rawBody: unknown) {
  if (!rawBody) return {};
  if (typeof rawBody === 'string') {
    try {
      const parsed = JSON.parse(rawBody);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  }

  if (typeof rawBody === 'object' && !Array.isArray(rawBody)) {
    return rawBody;
  }

  return {};
}

function sanitizeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || 'unknown_error');
  return raw
    .replace(/(Bearer\s+)[^\s]+/gi, '$1[REDACTED]')
    .replace(/(token|secret|key|authorization)=[^\s&]+/gi, '$1=[REDACTED]')
    .slice(0, 400);
}


function buildSafeRequestId(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/[^a-zA-Z0-9-_.]/g, '').trim();
  return normalized ? normalized.slice(0, 120) : undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = buildSafeRequestId(req?.headers?.['x-request-id'])
    || buildSafeRequestId(req?.headers?.['x-correlation-id']);

  if (requestId) {
    res.setHeader('x-request-id', requestId);
  }

  if (req.method !== 'POST') {
    console.warn('[support-intake] method_not_allowed', {
      requestId: requestId || 'unknown',
      method: req?.method || 'unknown',
    });
    return res.status(405).json({ error: 'Method not allowed', requestId: requestId || 'unknown' });
  }


  try {
    const normalizedBody = normalizeRequestBody(req.body);

    if (!Object.keys(normalizedBody).length && req.body && typeof req.body !== 'object') {
      console.warn('[support-intake] payload_parse_failed_fallback', {
        requestId: requestId || 'unknown',
        method: req?.method || 'unknown',
        bodyType: typeof req.body,
      });
    }

    const result = await handleSupportIntake(normalizedBody, { requestId, origin: 'vercel_api' });
    if (result?.body?.requestId) {
      res.setHeader('x-request-id', result.body.requestId);
    }
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    if (requestId) {
      res.setHeader('x-request-id', requestId);
    }
    const normalizedBodyForError = normalizeRequestBody(req?.body);
    console.error('[support-intake] unhandled_error', {
      requestId: requestId || 'unknown',
      method: req?.method || 'unknown',
      hasBody: !!req?.body,
      error: sanitizeErrorMessage(error),
    });

    return res.status(500).json({
      ok: false,
      degraded: true,
      degradedReasons: ['intake_unhandled_exception'],
      error: 'Falha ao abrir atendimento. Tente novamente em instantes ou continue pelo WhatsApp.',
      requestId: requestId || 'unknown',
      whatsappUrl: buildEmergencyWhatsappUrl((normalizedBodyForError as any)?.message),
      fallbackMessage: 'Atendimento automático indisponível no momento. Continue pelo WhatsApp.',
      n8nErrorCode: 'INTAKE_UNHANDLED_EXCEPTION',
    });
  }
}

