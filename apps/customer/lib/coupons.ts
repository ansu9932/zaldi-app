/**
 * Promo codes / coupons.
 * - DEMO_MODE: a small built-in list so the feature works offline.
 * - LIVE: looked up from the `coupons` table (managed in Admin / SQL).
 *
 * Discount is computed against the item subtotal; "freeship" instead waives the
 * delivery fee. Returns a positive rupee amount to subtract from the order total.
 */
import { supabase, DEMO_MODE } from './supabase';

export type CouponType = 'flat' | 'percent' | 'freeship';

export interface Coupon {
  code: string;
  type: CouponType;
  value: number; // flat: rupees, percent: 0-100, freeship: ignored
  minSubtotal: number;
  maxDiscount?: number; // cap for percent coupons
  label: string;
}

const DEMO_COUPONS: Coupon[] = [
  { code: 'NEXT50', type: 'flat', value: 50, minSubtotal: 199, label: '₹50 off orders above ₹199' },
  { code: 'SAVE10', type: 'percent', value: 10, minSubtotal: 150, maxDiscount: 60, label: '10% off (up to ₹60)' },
  { code: 'FREESHIP', type: 'freeship', value: 0, minSubtotal: 250, label: 'Free delivery above ₹250' },
];

export const PROMO_HINTS = DEMO_COUPONS.map((c) => ({ code: c.code, label: c.label }));

export function discountFor(coupon: Coupon, subtotal: number, deliveryFee: number): number {
  if (subtotal < coupon.minSubtotal) return 0;
  switch (coupon.type) {
    case 'flat':
      return Math.min(coupon.value, subtotal);
    case 'percent': {
      const raw = Math.round((subtotal * coupon.value) / 100);
      return coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
    }
    case 'freeship':
      return deliveryFee;
    default:
      return 0;
  }
}

export interface CouponResult {
  ok: boolean;
  coupon?: Coupon;
  discount?: number;
  error?: string;
}

async function lookupCoupon(code: string): Promise<Coupon | null> {
  const norm = code.trim().toUpperCase();
  if (!norm) return null;
  if (DEMO_MODE) return DEMO_COUPONS.find((c) => c.code === norm) ?? null;
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('code, type, value, min_subtotal, max_discount, active, label')
      .eq('code', norm)
      .eq('active', true)
      .maybeSingle();
    if (error || !data) return null;
    return {
      code: data.code,
      type: data.type,
      value: Number(data.value),
      minSubtotal: Number(data.min_subtotal ?? 0),
      maxDiscount: data.max_discount != null ? Number(data.max_discount) : undefined,
      label: data.label ?? data.code,
    };
  } catch {
    return null;
  }
}

export async function applyCoupon(code: string, subtotal: number, deliveryFee: number): Promise<CouponResult> {
  const coupon = await lookupCoupon(code);
  if (!coupon) return { ok: false, error: 'Invalid or expired code.' };
  if (subtotal < coupon.minSubtotal) {
    return { ok: false, error: `Add ₹${coupon.minSubtotal - subtotal} more to use ${coupon.code}.` };
  }
  const discount = discountFor(coupon, subtotal, deliveryFee);
  if (discount <= 0) return { ok: false, error: 'This code gives no discount on your cart.' };
  return { ok: true, coupon, discount };
}
