import type { HandlerResult } from './http-types.js';

type StripeLike = {
  checkout: {
    sessions: {
      create: (params: any) => Promise<{ url: string | null }>;
    };
  };
};

function sanitizeAmount(amount: unknown): number | null {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function createPaymentLink(
  input: { amount: unknown; description?: unknown },
  deps: { stripe: StripeLike; appUrl: string },
): Promise<HandlerResult<{ url: string | null }>> {
  const { amount, description } = input;
  const { stripe, appUrl } = deps;

  const sanitizedAmount = sanitizeAmount(amount);
  if (!sanitizedAmount) {
    return { status: 400, body: { error: 'Invalid amount' } };
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'boleto', 'pix'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: typeof description === 'string' && description.trim() ? description : 'Pagamento de Pedido',
          },
          unit_amount: Math.round(sanitizedAmount * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/success`,
    cancel_url: `${appUrl}/`,
  });

  return {
    status: 200,
    body: {
      url: session.url,
    },
  };
}
