type VercelRequest = any;
type VercelResponse = any;
import { getStripe } from './_stripe.js';
import { supabaseAdmin } from './_supabaseAdmin.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return res.status(500).json({ error: 'Missing STRIPE_WEBHOOK_SECRET' });

    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    const stripe = getStripe();
    const rawBody = await getRawBody(req);
    const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as any;
      const orderRef = session?.metadata?.orderRef;
      if (orderRef) {
        await supabaseAdmin.from('orders').update({ payment_status: 'Pago', status: 'Pago' }).eq('id', orderRef);
        await supabaseAdmin.from('order_events').insert({ order_id: orderRef, event_type: 'payment_confirmed', description: 'Pagamento confirmado no Stripe', actor_role: 'system' });
      }
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as any;
      const orderRef = session?.metadata?.orderRef;
      if (orderRef) {
        await supabaseAdmin.from('orders').update({ payment_status: 'Falhou' }).eq('id', orderRef);
        await supabaseAdmin.from('order_events').insert({ order_id: orderRef, event_type: 'payment_failed', description: 'Pagamento falhou no Stripe', actor_role: 'system' });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Webhook validation failed' });
  }
}
