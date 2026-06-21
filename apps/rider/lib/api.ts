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
}

// simple payout model (matches shared/algorithms)
function payout(km: number) { return Math.round(18 + km * 6); }

function mapRow(r: any): Job {
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
    payout: payout(km),
    status: r.status,
    paymentMethod: r.payment_method ?? 'cod',
    paymentStatus: r.payment_status ?? 'pending',
    shopName: r.shops?.name ?? 'Store',
    shopLat: r.shops?.lat ?? null,
    shopLng: r.shops?.lng ?? null,
    shopAddress: r.shops?.address ?? '',
  };
}

export const DEMO_JOBS: Job[] = [
  { id: 'demoj1', code: '#NX1041', customer: 'Ananya P. (demo)', dropAddress: 'Darua, Contai', dropLat: 21.77, dropLng: 87.745, distanceKm: 1.6, total: 174, items: 4, payout: 28, status: 'ready', paymentMethod: 'cod', paymentStatus: 'cod', shopName: 'Kanthi Fresh Mart', shopLat: 21.779, shopLng: 87.752, shopAddress: 'Central Market, Contai' },
];

export async function fetchJobs(riderId?: string): Promise<Job[]> {
  if (DEMO_MODE) return DEMO_JOBS;
  // Offers = ready orders not yet taken by any rider
  const offersQ = supabase
    .from('orders')
    .select('*, order_items(id), shops(name,lat,lng,address)')
    .eq('status', 'ready')
    .is('rider_id', null)
    .order('created_at', { ascending: true });
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
  const rows = [...(mine?.data ?? []), ...(offers.data ?? [])];
  return rows.map(mapRow);
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

/** Mark an order delivered. If paidOnline, also record UPI payment. */
export async function deliverOrder(id: string, paidOnline: boolean): Promise<void> {
  if (DEMO_MODE) return;
  const patch: any = { status: 'delivered', updated_at: new Date().toISOString() };
  if (paidOnline) { patch.payment_status = 'paid'; patch.payment_method = 'upi'; }
  await supabase.from('orders').update(patch).eq('id', id);
  notifyOrder(id); // tell the customer "Delivered"
}

/** Save this rider's Expo push token so they get "new job" alerts. */
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
