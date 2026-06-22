import { supabase, DEMO_MODE } from './supabase';

export type CouponType = 'flat' | 'percent' | 'freeship';

export interface Coupon {
  code: string;
  type: CouponType;
  value: number;
  min_subtotal: number;
  max_discount: number | null;
  label: string | null;
  active: boolean;
}

export async function listCoupons(): Promise<Coupon[]> {
  if (DEMO_MODE) return [];
  const { data, error } = await supabase
    .from('coupons')
    .select('code, type, value, min_subtotal, max_discount, label, active')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as Coupon[];
}

export async function addCoupon(c: Coupon): Promise<{ ok: boolean; error?: string }> {
  if (DEMO_MODE) return { ok: false, error: 'demo mode' };
  const { error } = await supabase.from('coupons').upsert({
    code: c.code.trim().toUpperCase(),
    type: c.type,
    value: c.value,
    min_subtotal: c.min_subtotal,
    max_discount: c.max_discount,
    label: c.label,
    active: c.active,
  });
  return { ok: !error, error: error?.message };
}

export async function setCouponActive(code: string, active: boolean): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('coupons').update({ active }).eq('code', code);
}

export async function deleteCoupon(code: string): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('coupons').delete().eq('code', code);
}
