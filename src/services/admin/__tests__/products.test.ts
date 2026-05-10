import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProductDraft, toProductDraft } from '../products';

test('toProductDraft hidrata features e specifications vazios quando o produto vem incompleto', () => {
  const draft = toProductDraft({
    id: 'p1',
    name: 'Cimento',
    description: 'CP II',
    price: 39.9,
    original_price: null,
    category: 'Construção',
    image_url: '',
    video_url: null,
    brand: null,
    sob_consulta: false,
    stock_level: 4,
    is_active: true,
  });

  assert.deepEqual(draft.features, []);
  assert.deepEqual(draft.specifications, {});
  assert.equal(draft.stock_level, 4);
});

test('emptyProductDraft mantém defaults seguros para criação de produto', () => {
  assert.equal(emptyProductDraft.name, '');
  assert.equal(emptyProductDraft.price, 0);
  assert.equal(emptyProductDraft.stock_level, 0);
  assert.equal(emptyProductDraft.is_active, true);
  assert.deepEqual(emptyProductDraft.features, []);
  assert.deepEqual(emptyProductDraft.specifications, {});
});
