import type { InventoryMovementRow, ProductRow } from '../../pages/admin/admin-types';

async function getSupabase() {
  const mod = await import('../../lib/supabase');
  return mod.supabase;
}

export type InventoryAdjustmentType = 'IN' | 'OUT';

export type InventorySummary = {
  totalProducts: number;
  outOfStock: number;
  criticalStock: number;
  totalUnits: number;
  inactiveProducts: number;
};

export function computeAdjustedStock(currentStock: number, movementType: InventoryAdjustmentType, quantity: number) {
  if (quantity <= 0) {
    throw new Error('Quantidade inválida para ajuste.');
  }

  const nextStock = movementType === 'OUT' ? currentStock - quantity : currentStock + quantity;
  if (nextStock < 0) {
    throw new Error('Estoque não pode ficar negativo.');
  }

  return nextStock;
}

export function summarizeInventory(products: Pick<ProductRow, 'id' | 'name' | 'category' | 'stock_level' | 'is_active'>[]): InventorySummary {
  return {
    totalProducts: products.length,
    outOfStock: products.filter((product) => product.stock_level === 0).length,
    criticalStock: products.filter((product) => product.stock_level <= 5).length,
    totalUnits: products.reduce((acc, product) => acc + Number(product.stock_level || 0), 0),
    inactiveProducts: products.filter((product) => !product.is_active).length,
  };
}

export function computeReorderSuggestions(
  products: Pick<ProductRow, 'id' | 'name' | 'category' | 'stock_level' | 'is_active'>[],
  minThreshold = 5,
  targetStock = 20
) {
  return products
    .filter((product) => product.is_active && product.stock_level <= minThreshold)
    .map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      currentStock: product.stock_level,
      suggestedReorder: Math.max(0, targetStock - product.stock_level),
    }));
}

export function summarizeCategories(
  products: Pick<ProductRow, 'id' | 'name' | 'category' | 'stock_level' | 'is_active'>[]
) {
  const map = new Map<string, { category: string; totalItems: number; outOfStock: number; totalUnits: number }>();

  for (const product of products) {
    const cat = (product.category || 'Geral').trim();
    const existing = map.get(cat) || { category: cat, totalItems: 0, outOfStock: 0, totalUnits: 0 };
    existing.totalItems += 1;
    if (product.stock_level === 0) existing.outOfStock += 1;
    existing.totalUnits += Number(product.stock_level || 0);
    map.set(cat, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.totalItems - a.totalItems);
}

export async function listInventoryMovements(productId: string): Promise<InventoryMovementRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data || []) as InventoryMovementRow[];
}

export async function saveInventoryAdjustment(params: {
  productId: string;
  currentStock: number;
  movementType: InventoryAdjustmentType;
  quantity: number;
  reason: string;
}) {
  const supabase = await getSupabase();
  const nextStock = computeAdjustedStock(params.currentStock, params.movementType, params.quantity);

  const { error: updateError } = await supabase.from('products').update({ stock_level: nextStock }).eq('id', params.productId);
  if (updateError) throw updateError;

  const { error: movementError } = await supabase.from('inventory_movements').insert({
    product_id: params.productId,
    movement_type: params.movementType,
    quantity: params.quantity,
    reason: params.reason || 'Ajuste manual pelo painel',
  });

  if (movementError) throw movementError;

  return nextStock;
}
