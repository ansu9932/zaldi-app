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
  let q = supabase
    .from('orders')
    .select('*, order_items(name, qty, price)')
    .in('status', ['placed', 'accepted', 'ready', 'assigned', 'picked_up'])
    .order('created_at', { ascending: false });
  if (shopId) q = q.eq('shop_id', shopId);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function setStatus(id: string, status: Order['status']): Promise<void> {
  if (DEMO_MODE) return;
  await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
}

/** Subscribe to any order change; calls back so the screen can refresh. */
export function subscribeOrders(onChange: () => void): () => void {
  if (DEMO_MODE) return () => {};
  const channel = supabase
    .channel('merchant-orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
