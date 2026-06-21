import { supabase, DEMO_MODE } from './supabase';

export interface DBShop {
  id: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  is_open: boolean;
}

export async function listShops(): Promise<DBShop[]> {
  if (DEMO_MODE) return [];
  const { data, error } = await supabase.from('shops').select('*').order('name');
  if (error || !data) return [];
  return data as DBShop[];
}

export async function addShop(s: Omit<DBShop, 'id' | 'is_open'>): Promise<{ ok: boolean; error?: string }> {
  if (DEMO_MODE) return { ok: false, error: 'Not connected to Supabase' };
  const { error } = await supabase.from('shops').insert({ ...s, is_open: true });
  return { ok: !error, error: error?.message };
}

export async function deleteShop(id: string): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('shops').delete().eq('id', id);
}
