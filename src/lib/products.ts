import { supabase } from './supabase';
import { mockProducts } from './mockData';
import { Product } from '../types';

type ProductRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number | null;
  category: string;
  image_url: string;
  images?: unknown;
  video_url?: string | null;
  brand?: string | null;
  features?: unknown;
  specifications?: unknown;
  sob_consulta: boolean;
  stock_level: number;
  is_active: boolean;
};

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function parseSpecMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')])
  );
}

function mapRowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price || 0),
    original_price: row.original_price ? Number(row.original_price) : undefined,
    category: row.category,
    image_url: row.image_url || '',
    images: parseStringArray(row.images),
    video_url: row.video_url || undefined,
    brand: row.brand || undefined,
    features: parseStringArray(row.features),
    specifications: parseSpecMap(row.specifications),
    sob_consulta: !!row.sob_consulta,
    stock_level: Number(row.stock_level || 0),
  };
}

export async function getProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return mockProducts;

    return (data as ProductRow[]).map(mapRowToProduct);
  } catch {
    return mockProducts;
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      return mockProducts.find((p) => p.id === id) || null;
    }

    return mapRowToProduct(data as ProductRow);
  } catch {
    return mockProducts.find((p) => p.id === id) || null;
  }
}
