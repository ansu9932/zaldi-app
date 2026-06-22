import { supabase, DEMO_MODE } from './supabase';
import { SHOP_OPTIONS } from './productApi';

export { SHOP_OPTIONS };

export interface Staff {
  id: string;
  role: 'merchant' | 'rider';
  name: string;
  username: string;
  password: string;
  phone?: string | null;
  vehicle_no?: string | null;
  shop_id: string | null;
  active: boolean;
}

export async function listStaff(): Promise<Staff[]> {
  if (DEMO_MODE) return [];
  // Prefer the safe view (no password column) created by secure_setup.sql.
  const view = await supabase.from('staff_public').select('*').order('role');
  if (!view.error && view.data) return view.data as Staff[];
  // Fallback for setups that have not run secure_setup.sql yet.
  const { data, error } = await supabase.from('staff').select('*').order('role');
  if (error || !data) return [];
  return data as Staff[];
}

export async function addStaff(s: Omit<Staff, 'id'>): Promise<{ ok: boolean; error?: string }> {
  if (DEMO_MODE) return { ok: false, error: 'Not connected to Supabase' };
  const { error } = await supabase.from('staff').insert(s);
  if (error) {
    if (error.code === '23505' || /duplicate/i.test(error.message)) {
      return { ok: false, error: 'That username is already taken — please choose a different one.' };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function resetPassword(id: string, password: string): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('staff').update({ password }).eq('id', id);
}

export async function setActive(id: string, active: boolean): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('staff').update({ active }).eq('id', id);
}

export async function deleteStaff(id: string): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('staff').delete().eq('id', id);
}
