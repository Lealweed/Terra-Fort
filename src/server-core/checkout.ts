import type { CheckoutInput, CheckoutItemInput, HandlerResult } from './http-types.js';

type StripeLike = {
  checkout: {
    sessions: {
      create: (params: any) => Promise<{ id: string; url: string | null }>;
    };
  };
};

function isValidCheckoutItems(items: unknown): items is CheckoutItemInput[] {
  if (!Array.isArray(items) || items.length === 0) return false;

  return items.every((item) => {
    if (!item || typeof item !== 'object') return false;

    const candidate = item as CheckoutItemInput;
    return (
      typeof candidate.name === 'string' &&
      candidate.name.trim().length > 0 &&
      typeof candidate.price === 'number' &&
      Number.isFinite(candidate.price) &&
      candidate.price >= 0 &&
      (candidate.cartQuantity === undefined ||
        (Number.isInteger(candidate.cartQuantity) && candidate.cartQuantity > 0))
    );
  });
}

export async function createCheckoutSession(
  input: { items: unknown; orderRef?: unknown },
  deps: { stripe: StripeLike; appUrl: string },
): Promise<HandlerResult<{ id: string; url: string | null }>> {
  const { items, orderRef } = input;
  const { stripe, appUrl } = deps;

  if (!isValidCheckoutItems(items)) {
    return { status: 400, body: { error: 'Invalid items' } };
  }

  const payload: CheckoutInput = {
    items,
    orderRef: typeof orderRef === 'string' ? orderRef : '',
  };

  const line_items = payload.items.map((item) => ({
    price_data: {
      currency: 'brl',
      product_data: {
        name: item.name,
        images: item.image_url ? [item.image_url] : [],
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.cartQuantity || 1,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'boleto', 'pix'],
    mode: 'payment',
    line_items,
    metadata: { orderRef: payload.orderRef || '' },
    success_url: `${appUrl}/success`,
    cancel_url: `${appUrl}/`,
  });

  return {
    status: 200,
    body: {
      id: session.id,
      url: session.url,
    },
  };
}
