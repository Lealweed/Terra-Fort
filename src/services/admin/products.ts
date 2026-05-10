import type { ProductDraft, ProductRow } from '../../pages/admin/admin-types';

async function getSupabase() {
  const mod = await import('../../lib/supabase');
  return mod.supabase;
}

export const emptyProductDraft: ProductDraft = {
  name: '',
  description: '',
  price: 0,
  original_price: null,
  category: '',
  image_url: '',
  video_url: null,
  brand: null,
  sob_consulta: false,
  stock_level: 0,
  is_active: true,
  features: [],
  specifications: {},
};

export function toProductDraft(product: ProductRow): ProductDraft {
  const { id: _id, ...rest } = product;
  return {
    ...rest,
    features: rest.features || [],
    specifications: rest.specifications || {},
  };
}

export async function listProducts(): Promise<ProductRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ProductRow[];
}

export async function createProduct(draft: ProductDraft) {
  const supabase = await getSupabase();
  const payload = {
    ...draft,
    images: [],
    features: draft.features || [],
    specifications: draft.specifications || {},
  };
  const { error } = await supabase.from('products').insert(payload);
  if (error) throw error;
}

export async function updateProduct(productId: string, draft: ProductDraft) {
  const supabase = await getSupabase();
  const { error } = await supabase.from('products').update(draft).eq('id', productId);
  if (error) throw error;
}

export async function deleteProduct(productId: string) {
  const supabase = await getSupabase();
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw error;
}

export async function uploadProductImage(file: File) {
  const supabase = await getSupabase();
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `product-images/${fileName}`;

  const { error: uploadError } = await supabase.storage.from('products').upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('products').getPublicUrl(filePath);
  return data.publicUrl;
}
