type CartQuantityLike = {
  cartQuantity?: number | null;
};

export function getCartQuantityTotal(items: CartQuantityLike[] | null | undefined): number {
  return (items || []).reduce((acc, item) => {
    const quantity = Number(item?.cartQuantity);
    return acc + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
  }, 0);
}

export type StripeCheckoutAvailability = {
  available: boolean;
  reason: 'ready' | 'missing_public_key';
  operatorMessage?: string;
  customerMessage?: string;
};

export function getStripeCheckoutAvailability(publicKey: string | null | undefined): StripeCheckoutAvailability {
  const normalizedKey = publicKey?.trim();

  if (!normalizedKey) {
    return {
      available: false,
      reason: 'missing_public_key',
      operatorMessage: 'Stripe indisponível neste ambiente: configure VITE_STRIPE_PUBLIC_KEY para habilitar pagamento online.',
      customerMessage: 'Pagamento online indisponível neste ambiente. Continue pelo WhatsApp para concluir o pedido.',
    };
  }

  return {
    available: true,
    reason: 'ready',
  };
}

export function getStripeCheckoutErrorMessage(error: unknown): string {
  const fallback = 'Não foi possível iniciar o pagamento online agora. Continue pelo WhatsApp para concluir o pedido ou peça ao responsável para revisar a configuração do Stripe.';

  if (!error) return fallback;

  const message = error instanceof Error ? error.message : String(error);

  if (/VITE_STRIPE_PUBLIC_KEY/i.test(message)) {
    return 'Pagamento online indisponível neste ambiente porque a chave pública do Stripe não foi configurada. Continue pelo WhatsApp.';
  }

  if (/STRIPE_SECRET_KEY/i.test(message)) {
    return 'Pagamento online indisponível neste ambiente porque a chave secreta do Stripe não foi configurada no servidor. Continue pelo WhatsApp ou configure a integração.';
  }

  if (/Stripe is not initialized|checkout indisponível|indisponível neste ambiente/i.test(message)) {
    return 'Pagamento online indisponível neste ambiente. Continue pelo WhatsApp para concluir o pedido.';
  }

  return fallback;
}
