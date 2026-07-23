import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { computeAdjustedStock, summarizeInventory, computeReorderSuggestions, summarizeCategories } from '../inventory';

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

test('computeReorderSuggestions gera sugestão de compra para itens críticos ativos', () => {
  const suggestions = computeReorderSuggestions([
    { id: '1', name: 'Cimento', category: 'Básicos', stock_level: 2, is_active: true },
    { id: '2', name: 'Areia', category: 'Básicos', stock_level: 10, is_active: true },
    { id: '3', name: 'Tijolo', category: 'Alvenaria', stock_level: 0, is_active: false },
  ]);

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].name, 'Cimento');
  assert.equal(suggestions[0].suggestedReorder, 18);
});

test('summarizeCategories agrupa produtos por categoria com totais e zerados', () => {
  const categories = summarizeCategories([
    { id: '1', name: 'Cimento', category: 'Básicos', stock_level: 5, is_active: true },
    { id: '2', name: 'Areia', category: 'Básicos', stock_level: 0, is_active: true },
    { id: '3', name: 'Tinta A', category: 'Pintura', stock_level: 12, is_active: true },
  ]);

  assert.equal(categories.length, 2);
  assert.equal(categories[0].category, 'Básicos');
  assert.equal(categories[0].totalItems, 2);
  assert.equal(categories[0].outOfStock, 1);
  assert.equal(categories[1].category, 'Pintura');
  assert.equal(categories[1].totalUnits, 12);
});
