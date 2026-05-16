import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsAppUrl, resolveSupportWhatsAppNumber } from '../../../lib/customerSupport';

test('resolveSupportWhatsAppNumber usa número configurado quando disponível', () => {
  assert.equal(resolveSupportWhatsAppNumber('+55 (94) 99123-4567'), '5594991234567');
});

test('resolveSupportWhatsAppNumber cai no padrão quando configuração está vazia', () => {
  assert.equal(resolveSupportWhatsAppNumber(''), '5594999346107');
});

test('buildWhatsAppUrl monta URL com mensagem codificada', () => {
  const url = buildWhatsAppUrl('Olá Terra-Fort');

  assert.match(url, /^https:\/\/wa\.me\/[0-9]+\?text=/);
  assert.match(url, /Ol%C3%A1%20Terra-Fort/);
});
