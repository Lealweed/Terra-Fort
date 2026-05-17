type VercelRequest = any;
type VercelResponse = any;
import { getStripe } from './_stripe.js';
import { createCheckoutSession } from '../src/server-core/checkout.js';
import { getCheckoutErrorMessage, getCheckoutErrorStatus } from '../src/server-core/stripe-error.js';

function sanitizeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || 'unknown_error');
  return raw
    .replace(/(Bearer\s+)[^\s]+/gi, '$1[REDACTED]')
    .replace(/(token|secret|key|authorization)=[^\s&]+/gi, '$1=[REDACTED]')
    .slice(0, 400);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const result = await createCheckoutSession(req.body || {}, {
      stripe: getStripe(),
      appUrl: process.env.APP_URL || 'http://localhost:3000',
    });

    return res.status(result.status).json(result.body);
  } catch (error: any) {
    const status = getCheckoutErrorStatus(error);
    console.error('[checkout] session_create_failed', {
      method: req?.method || 'unknown',
      hasBody: !!req?.body,
      status,
      error: sanitizeErrorMessage(error),
    });

    return res.status(status).json({ error: getCheckoutErrorMessage(error) });
  }
}
