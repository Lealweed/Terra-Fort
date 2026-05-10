type VercelRequest = any;
type VercelResponse = any;
import { getStripe } from './_stripe.js';
import { createCheckoutSession } from '../src/server-core/checkout.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const result = await createCheckoutSession(req.body || {}, {
      stripe: getStripe(),
      appUrl: process.env.APP_URL || 'http://localhost:3000',
    });

    return res.status(result.status).json(result.body);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Checkout failed' });
  }
}
