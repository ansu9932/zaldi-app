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
  };
}

export const DEMO_JOBS: Job[] = [
  { id: 'demoj1', code: '#NX1041', customer: 'Ananya P. (demo)', dropAddress: 'Darua, Contai', dropLat: 21.77, dropLng: 87.745, distanceKm: 1.6, total: 174, items: 4, payout: 28, status: 'ready' },
];

export async function fetchJobs(): Promise<Job[]> {
  if (DEMO_MODE) return DEMO_JOBS;
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(id)')
    .in('status', ['ready', 'assigned', 'picked_up'])
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function acceptJob(id: string): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('orders').update({ status: 'assigned', updated_at: new Date().toISOString() }).eq('id', id);
}

export async function advanceJob(id: string, current: Job['status']): Promise<void> {
  if (DEMO_MODE) return;
  const next = current === 'assigned' ? 'picked_up' : 'delivered';
  await supabase.from('orders').update({ status: next, updated_at: new Date().toISOString() }).eq('id', id);
}

/** Stream the rider's live GPS to the order so the customer can track it. */
export async function updateRiderLocation(orderId: string, lat: number, lng: number): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('orders').update({ rider_lat: lat, rider_lng: lng }).eq('id', orderId);
}

export function subscribeOrders(onChange: () => void): () => void {
  if (DEMO_MODE) return () => {};
  const channel = supabase
    .channel('rider-orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
