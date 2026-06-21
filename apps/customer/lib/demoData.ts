/**
 * Demo data so the Customer app works fully even before Supabase is connected.
 * Mirrors supabase/seed.sql. Replaced by live data when DEMO_MODE is off.
 */
import { LatLng } from './algorithms';

export interface Shop {
  id: string;
  name: string;
  category: string;
  address: string;
  location: LatLng;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  emoji: string;
}

export const CATEGORIES = [
  { id: 'Groceries', label: 'Groceries', emoji: '🛒', color: '#EEF2FF' },
  { id: 'Medicines', label: 'Medicines', emoji: '💊', color: '#ECFDF5' },
  { id: 'Snacks', label: 'Snacks', emoji: '🍿', color: '#FEF3C7' },
];

export const SHOPS: Shop[] = [
  { id: 's1', name: 'Kanthi Fresh Mart', category: 'Groceries', address: 'Central Market, Contai', location: { lat: 21.779, lng: 87.752 } },
  { id: 's2', name: 'Contai Medico', category: 'Medicines', address: 'Hospital More, Contai', location: { lat: 21.7765, lng: 87.7505 } },
  { id: 's3', name: 'Snack Junction', category: 'Snacks', address: 'Station Road, Contai', location: { lat: 21.7802, lng: 87.754 } },
];

export const PRODUCTS: Product[] = [
  { id: 'p1', shopId: 's1', name: 'Aashirvaad Atta', category: 'Groceries', price: 220, unit: '5 kg', emoji: '🌾' },
  { id: 'p2', shopId: 's1', name: 'Sugar', category: 'Groceries', price: 48, unit: '1 kg', emoji: '🧂' },
  { id: 'p3', shopId: 's1', name: 'Toor Dal', category: 'Groceries', price: 150, unit: '1 kg', emoji: '🫘' },
  { id: 'p4', shopId: 's1', name: 'Fortune Oil', category: 'Groceries', price: 145, unit: '1 L', emoji: '🛢️' },
  { id: 'p5', shopId: 's1', name: 'Amul Milk', category: 'Groceries', price: 28, unit: '500 ml', emoji: '🥛' },
  { id: 'p6', shopId: 's1', name: 'Farm Eggs', category: 'Groceries', price: 72, unit: '6 pcs', emoji: '🥚' },

  { id: 'p7', shopId: 's2', name: 'Paracetamol 500', category: 'Medicines', price: 30, unit: '10 tabs', emoji: '💊' },
  { id: 'p8', shopId: 's2', name: 'ORS Packet', category: 'Medicines', price: 22, unit: '1 pc', emoji: '🧃' },
  { id: 'p9', shopId: 's2', name: 'Dettol Antiseptic', category: 'Medicines', price: 85, unit: '100 ml', emoji: '🧴' },
  { id: 'p10', shopId: 's2', name: 'Band-Aid', category: 'Medicines', price: 40, unit: '10 pcs', emoji: '🩹' },

  { id: 'p11', shopId: 's3', name: 'Lays Chips', category: 'Snacks', price: 20, unit: '52 g', emoji: '🥔' },
  { id: 'p12', shopId: 's3', name: 'Coca Cola', category: 'Snacks', price: 40, unit: '750 ml', emoji: '🥤' },
  { id: 'p13', shopId: 's3', name: 'Parle-G', category: 'Snacks', price: 10, unit: '1 pack', emoji: '🍪' },
  { id: 'p14', shopId: 's3', name: 'Maggi Noodles', category: 'Snacks', price: 14, unit: '70 g', emoji: '🍜' },
];

export function productsByCategory(category: string): Product[] {
  return PRODUCTS.filter((p) => p.category === category);
}

export function shopForCategory(category: string): Shop | undefined {
  return SHOPS.find((s) => s.category === category);
}
