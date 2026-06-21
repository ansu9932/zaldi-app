/**
 * Live order API for the Customer app.
 * Writes the order to Supabase so it appears in the Merchant + Rider apps.
 * Falls back gracefully (demo) when Supabase keys are not set.
 */
import { supabase, DEMO_MODE } from './supabase';
import { CartLine, Address } from './store';

// Map local catalog shop ids -> the real shop UUIDs from seed.sql
const SHOP_UUID: Record<string, string> = {
  s1: '11111111-1111-1111-1111-111111111111',
  s2: '22222222-2222-2222-2222-222222222222',
  s3: '33333333-3333-3333-3333-333333333333',
};

export interface CreateOrderParams {
  items: CartLine[];
  shopLocalId: string;
  name: string;
  phone: string;
  address: Address;
  distanceKm: number;
  subtotal: number;
  deliveryFee: number;
  rainFee: number;
  surgeFee: number;
  total: number;
  eta: number;
  paymentMethod: 'upi' | 'cod';
}

export async function createOrder(p: CreateOrderParams): Promise<{ ok: boolean; id: string; error?: string }> {
  const localId = 'NX' + Date.now().toString().slice(-6);
  if (DEMO_MODE) {
    // No backend configured — keep working locally.
    return { ok: true, id: localId };
  }

  try {
    const shopId = SHOP_UUID[p.shopLocalId] ?? SHOP_UUID.s1;
    const { data, error } = await supabase
      .from('orders')
      .insert({
        shop_id: shopId,
        customer_name: p.name,
        customer_phone: p.phone,
        dropoff_address: `${p.address.line}${p.address.landmark ? ', ' + p.address.landmark : ''}`,
        dropoff_lat: p.address.lat,
        dropoff_lng: p.address.lng,
        distance_km: Number(p.distanceKm.toFixed(2)),
        subtotal: p.subtotal,
        delivery_fee: p.deliveryFee,
        rain_fee: p.rainFee,
        surge_fee: p.surgeFee,
        total: p.total,
        payment_method: p.paymentMethod,
        payment_status: p.paymentMethod === 'cod' ? 'cod' : 'pending',
        status: 'placed',
        eta_min: p.eta,
      })
      .select('id')
      .single();

    if (error || !data) return { ok: false, id: localId, error: error?.message };

    const items = p.items.map((l) => ({
      order_id: data.id,
      name: l.product.name,
      price: l.product.price,
      qty: l.qty,
    }));
    await supabase.from('order_items').insert(items);

    return { ok: true, id: data.id };
  } catch (e: any) {
    return { ok: false, id: localId, error: String(e?.message ?? e) };
  }
}
