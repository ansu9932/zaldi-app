import { supabase, DEMO_MODE } from './supabase';

export interface DBProduct {
  id: string;
  shop_id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  image_url: string | null;
  in_stock: boolean;
}

export const CATEGORY_OPTIONS = [
  'fruits', 'vegetables', 'dairy', 'grocery', 'snacks', 'beverages',
  'medicines', 'personal', 'wine', 'cigarettes',
];

// Legacy fallback (kept for compatibility). Real shops come from shopApi.listShops().
export const SHOP_OPTIONS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Kanthi Fresh Mart' },
];

export async function listProducts(): Promise<DBProduct[]> {
  if (DEMO_MODE) return [];
  const { data, error } = await supabase.from('products').select('*').order('category');
  if (error || !data) return [];
  return data as DBProduct[];
}

export async function addProduct(p: Omit<DBProduct, 'id'>): Promise<{ ok: boolean; error?: string }> {
  if (DEMO_MODE) return { ok: false, error: 'Not connected to Supabase' };
  const { error } = await supabase.from('products').insert(p);
  return { ok: !error, error: error?.message };
}

export async function bulkAddProducts(rows: Omit<DBProduct, 'id'>[]): Promise<{ ok: boolean; count: number; error?: string }> {
  if (DEMO_MODE) return { ok: false, count: 0, error: 'Not connected to Supabase' };
  if (rows.length === 0) return { ok: false, count: 0, error: 'No valid rows found in the file' };
  const { error } = await supabase.from('products').insert(rows);
  return { ok: !error, count: rows.length, error: error?.message };
}

export async function deleteProduct(id: string): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('products').delete().eq('id', id);
}

export async function toggleStock(id: string, inStock: boolean): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('products').update({ in_stock: inStock }).eq('id', id);
}

export const CSV_TEMPLATE =
  'name,category,price,unit,image_url,shop\n' +
  'Old Monk Rum,wine,180,180 ml,https://example.com/rum.jpg,My Wine Shop\n' +
  'Classic Cigarette,cigarettes,20,10 pcs,,My Store\n' +
  'Amul Milk,dairy,28,500 ml,,Kanthi Fresh Mart\n';
