import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { computeAdjustedStock, summarizeInventory } from '../inventory';

test('computeAdjustedStock soma entradas e subtrai saídas', () => {
  assert.equal(computeAdjustedStock(10, 'IN', 5), 15);
  assert.equal(computeAdjustedStock(10, 'OUT', 3), 7);
});

test('computeAdjustedStock impede estoque negativo', () => {
  assert.throws(() => computeAdjustedStock(2, 'OUT', 3), /negativo/i);
});

test('summarizeInventory calcula totais, críticos e zerados', () => {
  const summary = summarizeInventory([
    { id: '1', name: 'A', category: 'Cat', stock_level: 0, is_active: true },
    { id: '2', name: 'B', category: 'Cat', stock_level: 3, is_active: true },
    { id: '3', name: 'C', category: 'Cat', stock_level: 8, is_active: false },
  ]);

  assert.equal(summary.totalProducts, 3);
  assert.equal(summary.outOfStock, 1);
  assert.equal(summary.criticalStock, 2);
  assert.equal(summary.totalUnits, 11);
  assert.equal(summary.inactiveProducts, 1);
});
