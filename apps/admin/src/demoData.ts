// Demo data for the admin dashboard. Replaced by live Supabase queries in Stage 8.

export interface AdminOrder {
  code: string;
  customer: string;
  shop: string;
  rider: string;
  area: string;
  total: number;
  status: 'placed' | 'accepted' | 'ready' | 'assigned' | 'delivered';
  ago: string;
}

export const orders: AdminOrder[] = [
  { code: '#NX1043', customer: 'Priya S.', shop: 'Kanthi Fresh Mart', rider: '—', area: 'Majna', total: 198, status: 'placed', ago: '1 min' },
  { code: '#NX1042', customer: 'Rahul D.', shop: 'Kanthi Fresh Mart', rider: '—', area: 'Darua', total: 348, status: 'accepted', ago: '3 min' },
  { code: '#NX1041', customer: 'Ananya P.', shop: 'Snack Junction', rider: 'Biswajit', area: 'Darua', total: 174, status: 'assigned', ago: '8 min' },
  { code: '#NX1039', customer: 'Sk. Imran', shop: 'Kanthi Fresh Mart', rider: 'Biswajit', area: 'Hugli', total: 193, status: 'delivered', ago: '22 min' },
  { code: '#NX1038', customer: 'Mou G.', shop: 'Contai Medico', rider: 'Sourav', area: 'Tengunia', total: 167, status: 'delivered', ago: '35 min' },
];

export const shops = [
  { name: 'Kanthi Fresh Mart', category: 'Groceries', area: 'Central Market', online: true, orders: 38 },
  { name: 'Contai Medico', category: 'Medicines', area: 'Hospital More', online: true, orders: 12 },
  { name: 'Snack Junction', category: 'Snacks', area: 'Station Road', online: false, orders: 21 },
];

export const riders = [
  { name: 'Biswajit', online: true, deliveries: 7, earnings: 214 },
  { name: 'Sourav', online: true, deliveries: 5, earnings: 168 },
  { name: 'Tanmoy', online: false, deliveries: 3, earnings: 96 },
];

export const payouts = [
  { payee: 'Kanthi Fresh Mart', type: 'Shop', amount: 4280, status: 'pending' },
  { payee: 'Contai Medico', type: 'Shop', amount: 1340, status: 'paid' },
  { payee: 'Biswajit', type: 'Rider', amount: 214, status: 'pending' },
  { payee: 'Sourav', type: 'Rider', amount: 168, status: 'pending' },
];
