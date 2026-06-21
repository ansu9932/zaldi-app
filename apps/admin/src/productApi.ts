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
  'fruits', 'vegetables', 'dairy', 'grocery', 'snacks', 'beverages', 'medicines', 'personal',
];

export const SHOP_OPTIONS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Kanthi Fresh Mart' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Contai Medico' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Daily Fresh Fruits' },
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

export async function deleteProduct(id: string): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('products').delete().eq('id', id);
}

export async function toggleStock(id: string, inStock: boolean): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('products').update({ in_stock: inStock }).eq('id', id);
}

// One-click starter catalog so the customer app isn't empty.
const STARTER: Omit<DBProduct, 'id'>[] = [
  { shop_id: SHOP_OPTIONS[2].id, name: 'Banana (Robusta)', category: 'fruits', price: 38, unit: '6 pcs', image_url: 'https://loremflickr.com/300/300/banana,fruit', in_stock: true },
  { shop_id: SHOP_OPTIONS[2].id, name: 'Apple Shimla', category: 'fruits', price: 95, unit: '500 g', image_url: 'https://loremflickr.com/300/300/apple,fruit', in_stock: true },
  { shop_id: SHOP_OPTIONS[2].id, name: 'Orange', category: 'fruits', price: 60, unit: '500 g', image_url: 'https://loremflickr.com/300/300/orange,fruit', in_stock: true },
  { shop_id: SHOP_OPTIONS[0].id, name: 'Potato', category: 'vegetables', price: 28, unit: '1 kg', image_url: 'https://loremflickr.com/300/300/potato', in_stock: true },
  { shop_id: SHOP_OPTIONS[0].id, name: 'Onion', category: 'vegetables', price: 35, unit: '1 kg', image_url: 'https://loremflickr.com/300/300/onion', in_stock: true },
  { shop_id: SHOP_OPTIONS[0].id, name: 'Tomato', category: 'vegetables', price: 30, unit: '500 g', image_url: 'https://loremflickr.com/300/300/tomato', in_stock: true },
  { shop_id: SHOP_OPTIONS[0].id, name: 'Amul Milk', category: 'dairy', price: 28, unit: '500 ml', image_url: 'https://loremflickr.com/300/300/milk', in_stock: true },
  { shop_id: SHOP_OPTIONS[0].id, name: 'Britannia Bread', category: 'dairy', price: 45, unit: '400 g', image_url: 'https://loremflickr.com/300/300/bread', in_stock: true },
  { shop_id: SHOP_OPTIONS[0].id, name: 'Farm Fresh Eggs', category: 'dairy', price: 72, unit: '6 pcs', image_url: 'https://loremflickr.com/300/300/eggs', in_stock: true },
  { shop_id: SHOP_OPTIONS[0].id, name: 'Aashirvaad Atta', category: 'grocery', price: 220, unit: '5 kg', image_url: 'https://loremflickr.com/300/300/flour', in_stock: true },
  { shop_id: SHOP_OPTIONS[0].id, name: 'Fortune Oil', category: 'grocery', price: 145, unit: '1 L', image_url: 'https://loremflickr.com/300/300/cooking,oil', in_stock: true },
  { shop_id: SHOP_OPTIONS[0].id, name: 'Lays Chips', category: 'snacks', price: 20, unit: '52 g', image_url: 'https://loremflickr.com/300/300/chips', in_stock: true },
  { shop_id: SHOP_OPTIONS[0].id, name: 'Coca Cola', category: 'beverages', price: 40, unit: '750 ml', image_url: 'https://loremflickr.com/300/300/cola,drink', in_stock: true },
  { shop_id: SHOP_OPTIONS[1].id, name: 'Paracetamol 500', category: 'medicines', price: 30, unit: '10 tabs', image_url: 'https://loremflickr.com/300/300/medicine', in_stock: true },
  { shop_id: SHOP_OPTIONS[1].id, name: 'Dettol Antiseptic', category: 'medicines', price: 85, unit: '100 ml', image_url: 'https://loremflickr.com/300/300/antiseptic', in_stock: true },
  { shop_id: SHOP_OPTIONS[0].id, name: 'Colgate Toothpaste', category: 'personal', price: 55, unit: '100 g', image_url: 'https://loremflickr.com/300/300/toothpaste', in_stock: true },
];

export async function loadStarterCatalog(): Promise<{ ok: boolean; count: number; error?: string }> {
  if (DEMO_MODE) return { ok: false, count: 0, error: 'Not connected to Supabase' };
  const { error } = await supabase.from('products').insert(STARTER);
  return { ok: !error, count: STARTER.length, error: error?.message };
}
