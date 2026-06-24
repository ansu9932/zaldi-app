/**
 * Rider live API — reads ready/assigned orders from Supabase + realtime.
 * Falls back to demo data when keys are not set.
 */
import { supabase, DEMO_MODE } from './supabase';

export interface Job {
  id: string;
  code: string;
  customer: string;
  dropAddress: string;
  dropLat: number | null;
  dropLng: number | null;
  distanceKm: number;
  total: number;
  items: number;
  payout: number;
  status: 'ready' | 'assigned' | 'picked_up';
  paymentMethod: string;
  paymentStatus: string;
  shopName: string;
  shopLat: number | null;
  shopLng: number | null;
  shopAddress: string;
  preferredForMe: boolean; // this offer is reserved for me right now (nearest-rider)
}

// simple payout model (matches shared/commission.ts: base 18 + 6/km)
function payout(km: number) { return Math.round(18 + km * 6); }

// Haversine distance in km (for ranking offers by nearest pickup).
function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function mapRow(r: any, riderId?: string): Job {
  const km = Number(r.distance_km ?? 2);
  return {
    id: r.id,
    code: '#' + String(r.id).replace(/-/g, '').slice(0, 6).toUpperCase(),
    customer: r.customer_name ?? 'Customer',
    dropAddress: r.dropoff_address ?? '—',
    dropLat: r.dropoff_lat,
    dropLng: r.dropoff_lng,
    distanceKm: km,
    total: Number(r.total),
    items: (r.order_items ?? []).length,
    payout: r.rider_payout != null ? Number(r.rider_payout) : payout(km),
    status: r.status,
    paymentMethod: r.payment_method ?? 'cod',
    paymentStatus: r.payment_status ?? 'pending',
    shopName: r.shops?.name ?? 'Store',
    shopLat: r.shops?.lat ?? null,
    shopLng: r.shops?.lng ?? null,
    shopAddress: r.shops?.address ?? '',
    preferredForMe: !!riderId && r.preferred_rider_id === riderId,
  };
}

export const DEMO_JOBS: Job[] = [
  { id: 'demoj1', code: '#NX1041', customer: 'Ananya P. (demo)', dropAddress: 'Darua, Contai', dropLat: 21.77, dropLng: 87.745, distanceKm: 1.6, total: 174, items: 4, payout: 28, status: 'ready', paymentMethod: 'cod', paymentStatus: 'cod', shopName: 'Kanthi Fresh Mart', shopLat: 21.779, shopLng: 87.752, shopAddress: 'Central Market, Contai', preferredForMe: true },
];

export async function fetchJobs(riderId?: string, riderLoc?: { lat: number; lng: number } | null): Promise<Job[]> {
  if (DEMO_MODE) return DEMO_JOBS;

  // Cascade any expired nearest-rider offers to the next nearest rider first
  // (best-effort; ignored if the function isn't installed yet).
  try { await supabase.rpc('reassign_expired_offers'); } catch { /* ignore */ }

  // Offers = ready, unassigned orders that are EITHER reserved for me (I'm the
  // nearest rider) OR whose reservation window has opened up to everyone.
  let offersQ = supabase
    .from('orders')
    .select('*, order_items(id), shops(name,lat,lng,address)')
    .eq('status', 'ready')
    .is('rider_id', null)
    .order('created_at', { ascending: true });
  const nowIso = new Date().toISOString();
  if (riderId) {
    offersQ = offersQ.or(
      `preferred_rider_id.eq.${riderId},preferred_rider_id.is.null,offer_expires_at.lt.${nowIso}`,
    );
  }
  // Mine = orders this rider has accepted and is still delivering
  const mineQ = riderId
    ? supabase
        .from('orders')
        .select('*, order_items(id), shops(name,lat,lng,address)')
        .eq('rider_id', riderId)
        .in('status', ['assigned', 'picked_up'])
        .order('created_at', { ascending: true })
    : null;

  const [offers, mine] = await Promise.all([offersQ, mineQ ?? Promise.resolve({ data: [] } as any)]);
  const mineJobs = (mine?.data ?? []).map((r: any) => mapRow(r, riderId));
  let offerJobs = (offers.data ?? []).map((r: any) => mapRow(r, riderId));

  // Rank offers: orders reserved for me first, then by nearest pickup store to
  // my current location (so a fast rider near a new order sees it at the top).
  offerJobs = offerJobs.sort((a: Job, b: Job) => {
    if (a.preferredForMe !== b.preferredForMe) return a.preferredForMe ? -1 : 1;
    if (riderLoc && a.shopLat != null && b.shopLat != null) {
      const da = distKm(riderLoc, { lat: a.shopLat, lng: a.shopLng as number });
      const db = distKm(riderLoc, { lat: b.shopLat, lng: b.shopLng as number });
      return da - db;
    }
    return 0;
  });

  return [...mineJobs, ...offerJobs];
}

/**
 * Atomically lock the order to this rider. Only succeeds if the order is still
 * 'ready' and unassigned — so two riders can never grab the same order.
 */
export async function acceptJob(id: string, riderId: string): Promise<{ ok: boolean }> {
  if (DEMO_MODE) return { ok: true };
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'assigned', rider_id: riderId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'ready')
    .is('rider_id', null)
    .select('id');
  const ok = !error && !!data && data.length > 0;
  if (ok) notifyOrder(id); // tell the customer "Rider on the way"
  return { ok };
}

export async function advanceJob(id: string, current: Job['status']): Promise<void> {
  if (DEMO_MODE) return;
  const next = current === 'assigned' ? 'picked_up' : 'delivered';
  await supabase.from('orders').update({ status: next, updated_at: new Date().toISOString() }).eq('id', id);
  notifyOrder(id);
}

/** Stream the rider's live GPS to the order so the customer can track it. */
export async function updateRiderLocation(orderId: string, lat: number, lng: number): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('orders').update({ rider_lat: lat, rider_lng: lng }).eq('id', orderId);
}

/** Keep the rider's standalone location fresh on their staff row so the
 *  nearest-rider router can offer new orders to whoever is closest to the store. */
export async function updateRiderPresence(riderId: string | undefined, lat: number, lng: number): Promise<void> {
  if (DEMO_MODE || !riderId) return;
  try {
    await supabase.from('staff').update({ lat, lng, is_online: true }).eq('id', riderId);
  } catch {
    /* columns may not exist until commission_and_assignment.sql is run — ignore */
  }
}

/** Mark an order delivered. If paidOnline, also record UPI payment.
 *  When otp is provided, it must match the customer's delivery OTP — this is the
 *  proof-of-delivery handover check (same idea Blinkit/Zepto use). */
export async function deliverOrder(id: string, paidOnline: boolean, otp?: string): Promise<{ ok: boolean; error?: string }> {
  if (DEMO_MODE) return { ok: true };
  if (otp != null) {
    const { data, error } = await supabase.from('orders').select('delivery_otp').eq('id', id).maybeSingle();
    if (error) return { ok: false, error: 'Could not verify OTP. Check your connection.' };
    const expected = data?.delivery_otp;
    // If the order predates OTPs (no code stored), allow delivery to proceed.
    if (expected && String(expected) !== String(otp).trim()) {
      return { ok: false, error: 'Incorrect OTP. Ask the customer for the 4-digit code on their tracking screen.' };
    }
  }
  const patch: any = { status: 'delivered', updated_at: new Date().toISOString() };
  if (paidOnline) { patch.payment_status = 'paid'; patch.payment_method = 'upi'; }
  const { error } = await supabase.from('orders').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };
  notifyOrder(id); // tell the customer "Delivered"
  return { ok: true };
}

/** Ask our server to create a Razorpay UPI QR for this order's exact amount.
 *  The customer scans it; Razorpay confirms payment via webhook (auto-marks paid). */
export async function createRazorpayQr(orderId: string): Promise<{ imageUrl?: string; amount?: number; error?: string }> {
  if (DEMO_MODE) return { error: 'demo mode' };
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  try {
    const res = await fetch(`${base}/functions/v1/create-razorpay-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anon}`, apikey: anon },
      body: JSON.stringify({ order_id: orderId }),
    });
    const text = await res.text();
    let d: any = {};
    try { d = JSON.parse(text); } catch {}
    if (!res.ok || !d?.image_url) return { error: d?.error ?? `(${res.status}) ${text.slice(0, 180)}` };
    return { imageUrl: d.image_url, amount: d.amount };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

/** Current payment status of an order ('pending' | 'cod' | 'paid'). Used to poll
 *  while the Razorpay QR is on screen. */
export async function getPaymentStatus(orderId: string): Promise<string> {
  if (DEMO_MODE) return 'pending';
  const { data } = await supabase.from('orders').select('payment_status').eq('id', orderId).maybeSingle();
  return data?.payment_status ?? 'pending';
}
export async function savePushToken(riderId: string | undefined, token: string): Promise<void> {
  if (DEMO_MODE || !riderId) return;
  try { await supabase.from('staff').update({ push_token: token }).eq('id', riderId); } catch { /* column may not exist yet */ }
}

/** Ask the server to send the right push for this order's current status. */
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
  } catch { /* ignore */ }
}

export function subscribeOrders(onChange: () => void): () => void {
  if (DEMO_MODE) return () => {};
  const channel = supabase
    .channel('rider-orders-' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/** Today's delivered count + earnings for this rider (so stats survive app reloads). */
export async function fetchTodayStats(riderId?: string): Promise<{ deliveries: number; earnings: number }> {
  if (DEMO_MODE || !riderId) return { deliveries: 0, earnings: 0 };
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('distance_km')
      .eq('rider_id', riderId)
      .eq('status', 'delivered')
      .gte('updated_at', start.toISOString());
    if (error || !data) return { deliveries: 0, earnings: 0 };
    const earnings = data.reduce((s: number, r: any) => s + payout(Number(r.distance_km ?? 2)), 0);
    return { deliveries: data.length, earnings };
  } catch {
    return { deliveries: 0, earnings: 0 };
  }
}

/** Persist the rider's online/offline status (best-effort; needs staff.is_online column). */
export async function setRiderOnline(riderId: string | undefined, online: boolean): Promise<void> {
  if (DEMO_MODE || !riderId) return;
  try {
    await supabase.from('staff').update({ is_online: online }).eq('id', riderId);
  } catch {
    /* column may not exist yet — ignore */
  }
}
