export function getCheckoutErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error || '');

  if (/Missing STRIPE_SECRET_KEY/i.test(message)) {
    return 503;
  }

  return 500;
}

export function getCheckoutErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '');

  if (/Missing STRIPE_SECRET_KEY/i.test(message)) {
    return 'Stripe indisponível neste ambiente: configure STRIPE_SECRET_KEY para habilitar o checkout online.';
  }

  return message || 'Failed to create checkout session';
}
