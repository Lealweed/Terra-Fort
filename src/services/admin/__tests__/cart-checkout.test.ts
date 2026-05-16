import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  getCartQuantityTotal,
  getStripeCheckoutAvailability,
  getStripeCheckoutErrorMessage,
} from '../../../lib/cartCheckout';
import { getCheckoutErrorMessage, getCheckoutErrorStatus } from '../../../server-core/stripe-error';

test('getCartQuantityTotal soma quantidades válidas do carrinho', () => {
  assert.equal(
    getCartQuantityTotal([
      { cartQuantity: 2 },
      { cartQuantity: 3 },
      { cartQuantity: 0 },
      { cartQuantity: Number.NaN },
      {},
    ]),
    5,
  );
});

test('getStripeCheckoutAvailability sinaliza ausência de chave pública com fallback operacional', () => {
  assert.deepEqual(getStripeCheckoutAvailability('   '), {
    available: false,
    reason: 'missing_public_key',
    operatorMessage: 'Stripe indisponível neste ambiente: configure VITE_STRIPE_PUBLIC_KEY para habilitar pagamento online.',
    customerMessage: 'Pagamento online indisponível neste ambiente. Continue pelo WhatsApp para concluir o pedido.',
  });
});

test('getStripeCheckoutErrorMessage traduz erros de configuração do Stripe para mensagem acionável', () => {
  assert.match(
    getStripeCheckoutErrorMessage(new Error('Missing STRIPE_SECRET_KEY')),
    /chave secreta do Stripe não foi configurada/i,
  );

  assert.match(
    getStripeCheckoutErrorMessage(new Error('Stripe is not initialized: missing VITE_STRIPE_PUBLIC_KEY')),
    /Pagamento online indisponível neste ambiente/i,
  );
});

test('helpers do backend retornam 503 com mensagem clara quando falta STRIPE_SECRET_KEY', () => {
  const error = new Error('Missing STRIPE_SECRET_KEY');

  assert.equal(getCheckoutErrorStatus(error), 503);
  assert.match(getCheckoutErrorMessage(error), /configure STRIPE_SECRET_KEY/i);
});
