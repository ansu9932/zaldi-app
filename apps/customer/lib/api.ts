/**
 * Live order API for the Customer app.
 * Writes the order to Supabase so it appears in the Merchant + Rider apps.
 * Falls back gracefully (demo) when Supabase keys are not set.
 */
import { supabase, DEMO_MODE } from './supabase';
import { CartLine, Address } from './store';

export interface CreateOrderParams {
  items: CartLine[];
  shopId: string; // real shop UUID
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
  discount?: number;
  tip?: number;
  couponCode?: string | null;
  pushToken?: string | null;
}

export async function createOrder(p: CreateOrderParams): Promise<{ ok: boolean; id: string; error?: string }> {
  const localId = 'NX' + Date.now().toString().slice(-6);
  if (DEMO_MODE) {
    return { ok: true, id: localId };
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        shop_id: p.shopId,
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
        discount: p.discount ?? 0,
        tip_amount: p.tip ?? 0,
        coupon_code: p.couponCode ?? null,
        push_token: p.pushToken ?? null,
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

    // Fire a push to the merchant ("New order") — best-effort, never blocks.
    notifyOrder(data.id);

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

/**
 * Ask the server to send a push notification for this order. The edge function
 * decides who to notify (customer / merchant / riders) from the order's current
 * status. Best-effort: failures are swallowed so they never block the UI.
 */
export async function notifyOrder(orderId: string): Promise<void> {
  if (DEMO_MODE) return;
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  try {
    await fetch(`${base}/functions/v1/notify-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anon}`, apikey: anon },
      body: JSON.stringify({ order_id: orderId }),
    });
  } catch {
    /* ignore */
  }
}

/** Client-side confirm (the webhook also confirms server-side as the source of truth). */
export async function markOrderPaid(orderId: string, paymentId: string): Promise<void> {
  if (DEMO_MODE) return;
  await supabase
    .from('orders')
    .update({ payment_status: 'paid', razorpay_payment_id: paymentId, status: 'placed' })
    .eq('id', orderId);
}

/**
 * Customer-initiated cancellation. Only allowed before the store accepts the order
 * (status still 'placed' or 'pending_payment'); the conditional update enforces this.
 */
export async function cancelOrder(orderId: string): Promise<{ ok: boolean }> {
  if (DEMO_MODE) return { ok: true };
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .in('status', ['placed', 'pending_payment'])
    .select('id');
  return { ok: !error && !!data && data.length > 0 };
}

export interface RiderInfo { name: string; phone: string | null; vehicle: string | null }

/** Fetch the real assigned rider's name + phone + vehicle for an order (null until assigned). */
export async function getOrderRider(orderId: string): Promise<RiderInfo | null> {
  if (DEMO_MODE) return null;
  const { data: order } = await supabase.from('orders').select('rider_id').eq('id', orderId).single();
  if (!order?.rider_id) return null;
  // Prefer the safe public view (works after secure_setup.sql); fall back to staff.
  const pub = await supabase.from('staff_public').select('name, phone, vehicle_no').eq('id', order.rider_id).maybeSingle();
  if (!pub.error && pub.data) return { name: pub.data.name, phone: pub.data.phone ?? null, vehicle: pub.data.vehicle_no ?? null };
  const { data: rider } = await supabase.from('staff').select('name, phone, vehicle_no').eq('id', order.rider_id).maybeSingle();
  if (!rider) return null;
  return { name: rider.name, phone: rider.phone ?? null, vehicle: rider.vehicle_no ?? null };
}

/** Save a customer rating (1-5) + optional comment for a delivered order. */
export async function rateOrder(orderId: string, rating: number, comment?: string): Promise<{ ok: boolean }> {
  if (DEMO_MODE) return { ok: true };
  const { error } = await supabase.from('ratings').insert({ order_id: orderId, rating, comment: comment ?? null });
  return { ok: !error };
}


import { Product, PRODUCTS, shopById } from './catalog';

/**
 * Load the product catalog.
 * - DEMO_MODE: returns the bundled sample Contai catalog (so the app is fully usable offline).
 * - LIVE: returns in-stock products from the database (managed in Admin).
 */
export async function getCatalogProducts(): Promise<Product[]> {
  if (DEMO_MODE) {
    // Enrich demo products with their shop coordinates so distance/ETA work.
    return PRODUCTS.map((p) => {
      const shop = shopById(p.shopId);
      return { ...p, shopLat: shop?.location.lat, shopLng: shop?.location.lng };
    });
  }
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, shop_id, name, category, price, unit, image_url, in_stock, shops(lat,lng)')
      .eq('in_stock', true);
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      shopId: r.shop_id,
      name: r.name,
      category: r.category,
      price: Number(r.price),
      unit: r.unit ?? '',
      emoji: '🛍️',
      image: r.image_url ?? undefined,
      q: r.name,
      shopLat: r.shops?.lat ?? null,
      shopLng: r.shops?.lng ?? null,
    }));
  } catch {
    return [];
  }
}


/** Live-refresh the catalog when Admin adds/edits/removes products (realtime). */
export function subscribeCatalog(onChange: () => void): () => void {
  if (DEMO_MODE) return () => {};
  const channel = supabase
    .channel('catalog-' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
