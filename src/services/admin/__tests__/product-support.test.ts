import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductSupportRequest } from '../../../lib/productSupport';
import type { Product } from '../../../types';

const quoteProduct: Product = {
  id: '42',
  name: 'Brita Graduada',
  description: 'Ideal para base e sub-base.',
  price: 180,
  original_price: 210,
  category: 'Agregados',
  image_url: 'https://example.com/brita.jpg',
  sob_consulta: true,
  stock_level: 12,
};

test('buildProductSupportRequest gera payload de cotação para produto sob consulta', () => {
  const payload = buildProductSupportRequest(quoteProduct, 'product_card');

  assert.equal(payload.source, 'product_card');
  assert.equal(payload.intent, 'quote_request');
  assert.match(payload.message, /Brita Graduada/);
  assert.match(payload.message, /orçamento/i);
  assert.match(payload.message, /Quantidade desejada: 1/);
  assert.equal(payload.product?.sob_consulta, true);
  assert.equal(payload.items?.[0]?.quantity, 1);
  assert.equal(payload.metadata?.requestedQuantity, 1);
  assert.equal(payload.metadata?.channel, 'site_product');
});

test('buildProductSupportRequest gera payload de dúvida de preço para produto com compra direta', () => {
  const payload = buildProductSupportRequest({ ...quoteProduct, sob_consulta: false }, 'product_details', 4);

  assert.equal(payload.source, 'product_details');
  assert.equal(payload.intent, 'price_question');
  assert.equal(payload.product?.sob_consulta, false);
  assert.equal(payload.items?.[0]?.quantity, 4);
  assert.equal(payload.metadata?.requestedQuantity, 4);
  assert.match(payload.message, /Quantidade desejada: 4/);
});
