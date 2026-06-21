/**
 * Merchant order state (Zustand). DEMO data; live Supabase realtime added in Stage 8.
 */
import { create } from 'zustand';

export type OrderStatus = 'placed' | 'accepted' | 'ready' | 'assigned';

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  code: string;
  customer: string;
  area: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  placedAgoMin: number;
}

const seed: Order[] = [
  {
    id: 'o1', code: '#NX1042', customer: 'Rahul D.', area: 'Darua, Contai',
    items: [
      { name: 'Aashirvaad Atta', qty: 1, price: 220 },
      { name: 'Amul Milk', qty: 2, price: 28 },
      { name: 'Farm Eggs', qty: 1, price: 72 },
    ],
    total: 348, status: 'placed', placedAgoMin: 1,
  },
  {
    id: 'o2', code: '#NX1043', customer: 'Priya S.', area: 'Majna, Contai',
    items: [
      { name: 'Toor Dal', qty: 1, price: 150 },
      { name: 'Sugar', qty: 1, price: 48 },
    ],
    total: 198, status: 'placed', placedAgoMin: 3,
  },
  {
    id: 'o3', code: '#NX1039', customer: 'Sk. Imran', area: 'Hugli, Contai',
    items: [
      { name: 'Fortune Oil', qty: 1, price: 145 },
      { name: 'Sugar', qty: 1, price: 48 },
    ],
    total: 193, status: 'accepted', placedAgoMin: 6,
  },
];

interface MerchantState {
  online: boolean;
  toggleOnline: () => void;
  orders: Order[];
  accept: (id: string) => void;
  markReady: (id: string) => void;
}

export const useMerchant = create<MerchantState>((set) => ({
  online: true,
  toggleOnline: () => set((s) => ({ online: !s.online })),
  orders: seed,
  accept: (id) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'accepted' } : o)),
    })),
  markReady: (id) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'ready' } : o)),
    })),
}));
