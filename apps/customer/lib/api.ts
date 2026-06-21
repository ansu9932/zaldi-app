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
        status: p.paymentMethod === 'cod' ? 'placed' : 'pending_payment',
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


export interface OrderStatusRow {
  id: string;
  status: string;
  eta_min: number | null;
  rider_lat: number | null;
  rider_lng: number | null;
}

/** Read the current status of one order. */
export async function getOrder(id: string): Promise<OrderStatusRow | null> {
  if (DEMO_MODE) return null;
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, eta_min, rider_lat, rider_lng')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as OrderStatusRow;
}

/** Subscribe to live status changes for one order. */
export function subscribeOrder(id: string, cb: (row: OrderStatusRow) => void): () => void {
  if (DEMO_MODE) return () => {};
  const channel = supabase
    .channel('cust-order-' + id + '-' + Math.random().toString(36).slice(2))
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
      (payload: any) => cb(payload.new as OrderStatusRow),
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}


/** Ask our server (edge function) to create a Razorpay order. Secret stays on server. */
export async function createRazorpayOrder(amount: number, receipt: string): Promise<{ id?: string; error?: string }> {
  if (DEMO_MODE) return { error: 'demo mode' };
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  try {
    const res = await fetch(`${base}/functions/v1/create-razorpay-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anon}`,
        apikey: anon,
      },
      body: JSON.stringify({ amount, receipt: String(receipt).slice(0, 40) }),
    });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch {}
    if (!res.ok || !data?.id) return { error: `(${res.status}) ${text.slice(0, 220)}` };
    return { id: data.id };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

export async function attachRazorpayOrder(orderId: string, rzpOrderId: string): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('orders').update({ razorpay_order_id: rzpOrderId }).eq('id', orderId);
}

/** Client-side confirm (the webhook also confirms server-side as the source of truth). */
export async function markOrderPaid(orderId: string, paymentId: string): Promise<void> {
  if (DEMO_MODE) return;
  await supabase
    .from('orders')
    .update({ payment_status: 'paid', razorpay_payment_id: paymentId, status: 'placed' })
    .eq('id', orderId);
}


import { PRODUCTS, Product } from './catalog';

const UUID_TO_LOCAL: Record<string, string> = {
  '11111111-1111-1111-1111-111111111111': 's1',
  '22222222-2222-2222-2222-222222222222': 's2',
  '33333333-3333-3333-3333-333333333333': 's3',
};

/** Load the product catalog from the database (managed in Admin). Falls back to the built-in catalog. */
export async function getCatalogProducts(): Promise<Product[]> {
  if (DEMO_MODE) return PRODUCTS;
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, shop_id, name, category, price, unit, image_url, in_stock')
      .eq('in_stock', true);
    if (error || !data || data.length === 0) return PRODUCTS;
    return data.map((r: any) => ({
      id: r.id,
      shopId: UUID_TO_LOCAL[r.shop_id] ?? 's1',
      name: r.name,
      category: r.category,
      price: Number(r.price),
      unit: r.unit ?? '',
      emoji: '🛍️',
      image: r.image_url ?? undefined,
      q: r.name,
    }));
  } catch {
    return PRODUCTS;
  }
}
