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
  // Money split ("everyone wins") — see BUSINESS_MODEL.md
  merchantPayout: number;
  riderPayout: number;
  platformNet: number;
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
    .select('id, customer_name, dropoff_address, total, status, payment_method, created_at, merchant_payout, rider_payout, platform_net')
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
    merchantPayout: Number(r.merchant_payout ?? 0),
    riderPayout: Number(r.rider_payout ?? 0),
    platformNet: Number(r.platform_net ?? 0),
  }));
}

/** Platform profit summary across recent orders (for an admin dashboard tile). */
export async function platformProfitSummary(): Promise<{ orders: number; revenue: number; profit: number }> {
  if (DEMO_MODE) return { orders: 0, revenue: 0, profit: 0 };
  const { data, error } = await supabase
    .from('orders')
    .select('platform_revenue, platform_net, status')
    .neq('status', 'cancelled')
    .limit(1000);
  if (error || !data) return { orders: 0, revenue: 0, profit: 0 };
  const revenue = data.reduce((s: number, r: any) => s + Number(r.platform_revenue ?? 0), 0);
  const profit = data.reduce((s: number, r: any) => s + Number(r.platform_net ?? 0), 0);
  return { orders: data.length, revenue: Math.round(revenue), profit: Math.round(profit) };
}
