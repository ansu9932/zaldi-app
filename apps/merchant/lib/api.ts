/**
 * Merchant live API — reads orders from Supabase + realtime updates.
 * Falls back to demo data when keys are not set.
 */
import { supabase, DEMO_MODE } from './supabase';

export interface OrderItem { name: string; qty: number; price: number }
export interface Order {
  id: string;
  code: string;
  customer: string;
  area: string;
  items: OrderItem[];
  total: number;
  status: 'placed' | 'accepted' | 'ready' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';
  created_at: string;
}

function mapRow(r: any): Order {
  return {
    id: r.id,
    code: '#' + String(r.id).replace(/-/g, '').slice(0, 6).toUpperCase(),
    customer: r.customer_name ?? 'Customer',
    area: r.dropoff_address ?? '—',
    items: (r.order_items ?? []).map((i: any) => ({ name: i.name, qty: i.qty, price: Number(i.price) })),
    total: Number(r.total),
    status: r.status,
    created_at: r.created_at,
  };
}

export const DEMO_ORDERS: Order[] = [
  { id: 'demo1', code: '#NX1042', customer: 'Rahul D. (demo)', area: 'Darua, Contai', items: [{ name: 'Atta', qty: 1, price: 220 }, { name: 'Milk', qty: 2, price: 28 }], total: 276, status: 'placed', created_at: new Date().toISOString() },
];

export async function fetchActiveOrders(shopId?: string | null): Promise<Order[]> {
  if (DEMO_MODE) return DEMO_ORDERS;
  if (!shopId) return []; // a merchant with no assigned shop sees nothing
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(name, qty, price)')
    .eq('shop_id', shopId)
    .in('status', ['placed', 'accepted', 'ready', 'assigned', 'picked_up'])
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function setStatus(id: string, status: Order['status']): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  notifyOrder(id);
}

/** Save this merchant's Expo push token so they get "new order" alerts. */
export async function savePushToken(staffId: string | undefined, token: string): Promise<void> {
  if (DEMO_MODE || !staffId) return;
  try { await supabase.from('staff').update({ push_token: token }).eq('id', staffId); } catch { /* column may not exist yet */ }
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

/** Subscribe to any order change; calls back so the screen can refresh. */
export function subscribeOrders(onChange: () => void): () => void {
  if (DEMO_MODE) return () => {};
  const channel = supabase
    .channel('merchant-orders-' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/** Persist the merchant's online/offline status (best-effort; needs staff.is_online column). */
export async function setMerchantOnline(staffId: string | undefined, online: boolean): Promise<void> {
  if (DEMO_MODE || !staffId) return;
  try {
    await supabase.from('staff').update({ is_online: online }).eq('id', staffId);
  } catch {
    /* column may not exist yet — ignore */
  }
}
