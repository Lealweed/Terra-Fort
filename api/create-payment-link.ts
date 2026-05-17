type VercelRequest = any;
type VercelResponse = any;
import { getStripe } from './_stripe.js';
import { createPaymentLink } from '../src/server-core/payment-link.js';

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
    const result = await createPaymentLink(req.body || {}, {
      stripe: getStripe(),
      appUrl: process.env.APP_URL || 'http://localhost:3000',
    });

    return res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error('[create-payment-link] failed', {
      method: req?.method || 'unknown',
      hasBody: !!req?.body,
      error: sanitizeErrorMessage(error),
    });

    return res.status(500).json({ error: 'Failed to create payment link' });
  }
}
