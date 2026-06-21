import { supabase, DEMO_MODE } from './supabase';

export interface LiveOrder {
  id: string;
  code: string;
  customer: string;
  area: string;
  rider: string;
  total: number;
  status: string;
  payment: string;
  ago: string;
}

function ago(ts: string): string {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} hr` : `${Math.floor(h / 24)} d`;
}

export async function listLiveOrders(): Promise<LiveOrder[]> {
  if (DEMO_MODE) return [];
  const { data, error } = await supabase
    .from('orders')
    .select('id, customer_name, dropoff_address, total, status, payment_method, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    code: '#' + String(r.id).replace(/-/g, '').slice(0, 6).toUpperCase(),
    customer: r.customer_name ?? 'Customer',
    area: r.dropoff_address ?? '—',
    rider: '—',
    total: Number(r.total),
    status: r.status,
    payment: r.payment_method ?? 'cod',
    ago: ago(r.created_at),
  }));
}
