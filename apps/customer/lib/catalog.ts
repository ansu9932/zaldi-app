/**
 * "next" — Product catalog for Contai (demo until Supabase live).
 * Blinkit/Zepto-style: categories + products. OTC medicines only (no Rx items).
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
  category: string; // category id
  price: number;
  mrp?: number;
  unit: string;
  emoji: string;
  tag?: string; // e.g. "FAST", "OFFER"
  q?: string; // optional image search keyword
}

export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { id: 'fruits', label: 'Fruits', emoji: '🍎' },
  { id: 'vegetables', label: 'Vegetables', emoji: '🥬' },
  { id: 'dairy', label: 'Dairy & Bread', emoji: '🥛' },
  { id: 'grocery', label: 'Grocery', emoji: '🛒' },
  { id: 'snacks', label: 'Snacks', emoji: '🍪' },
  { id: 'beverages', label: 'Beverages', emoji: '🥤' },
  { id: 'medicines', label: 'Pharmacy', emoji: '💊' },
  { id: 'personal', label: 'Personal Care', emoji: '🧴' },
];

export const SHOPS: Shop[] = [
  { id: 's1', name: 'Kanthi Fresh Mart', category: 'grocery', address: 'Central Market, Contai', location: { lat: 21.779, lng: 87.752 } },
  { id: 's2', name: 'Contai Medico', category: 'medicines', address: 'Hospital More, Contai', location: { lat: 21.7765, lng: 87.7505 } },
  { id: 's3', name: 'Daily Fresh Fruits', category: 'fruits', address: 'New Market, Contai', location: { lat: 21.7802, lng: 87.754 } },
];

export const PRODUCTS: Product[] = [
  // ---- Fruits ----
  { id: 'f1', shopId: 's3', name: 'Banana (Robusta)', category: 'fruits', price: 38, mrp: 50, unit: '6 pcs', emoji: '🍌', tag: 'FAST' },
  { id: 'f2', shopId: 's3', name: 'Apple Shimla', category: 'fruits', price: 95, mrp: 120, unit: '500 g', emoji: '🍎' },
  { id: 'f3', shopId: 's3', name: 'Orange', category: 'fruits', price: 60, unit: '500 g', emoji: '🍊' },
  { id: 'f4', shopId: 's3', name: 'Papaya', category: 'fruits', price: 40, unit: '1 pc', emoji: '🫐' },
  { id: 'f5', shopId: 's3', name: 'Mango Himsagar', category: 'fruits', price: 80, mrp: 100, unit: '1 kg', emoji: '🥭', tag: 'SEASON' },
  { id: 'f6', shopId: 's3', name: 'Watermelon', category: 'fruits', price: 45, unit: '1 pc', emoji: '🍉' },
  { id: 'f7', shopId: 's3', name: 'Grapes', category: 'fruits', price: 70, unit: '500 g', emoji: '🍇' },
  { id: 'f8', shopId: 's3', name: 'Pomegranate', category: 'fruits', price: 90, unit: '500 g', emoji: '🍎' },

  // ---- Vegetables ----
  { id: 'v1', shopId: 's1', name: 'Potato', category: 'vegetables', price: 28, unit: '1 kg', emoji: '🥔', tag: 'FAST' },
  { id: 'v2', shopId: 's1', name: 'Onion', category: 'vegetables', price: 35, unit: '1 kg', emoji: '🧅' },
  { id: 'v3', shopId: 's1', name: 'Tomato', category: 'vegetables', price: 30, unit: '500 g', emoji: '🍅' },
  { id: 'v4', shopId: 's1', name: 'Green Chilli', category: 'vegetables', price: 15, unit: '100 g', emoji: '🌶️' },
  { id: 'v5', shopId: 's1', name: 'Brinjal (Begun)', category: 'vegetables', price: 32, unit: '500 g', emoji: '🍆' },
  { id: 'v6', shopId: 's1', name: 'Cauliflower', category: 'vegetables', price: 30, unit: '1 pc', emoji: '🥦' },
  { id: 'v7', shopId: 's1', name: 'Spinach (Palak)', category: 'vegetables', price: 20, unit: '1 bunch', emoji: '🥬' },
  { id: 'v8', shopId: 's1', name: 'Ginger', category: 'vegetables', price: 25, unit: '200 g', emoji: '🫚' },

  // ---- Dairy & Bread ----
  { id: 'd1', shopId: 's1', name: 'Amul Milk', category: 'dairy', price: 28, unit: '500 ml', emoji: '🥛', tag: 'FAST' },
  { id: 'd2', shopId: 's1', name: 'Britannia Bread', category: 'dairy', price: 45, unit: '400 g', emoji: '🍞' },
  { id: 'd3', shopId: 's1', name: 'Farm Fresh Eggs', category: 'dairy', price: 72, unit: '6 pcs', emoji: '🥚' },
  { id: 'd4', shopId: 's1', name: 'Amul Butter', category: 'dairy', price: 56, unit: '100 g', emoji: '🧈' },
  { id: 'd5', shopId: 's1', name: 'Mother Dairy Curd', category: 'dairy', price: 35, unit: '400 g', emoji: '🥣' },
  { id: 'd6', shopId: 's1', name: 'Amul Cheese Slices', category: 'dairy', price: 130, unit: '100 g', emoji: '🧀' },
  { id: 'd7', shopId: 's1', name: 'Paneer', category: 'dairy', price: 90, unit: '200 g', emoji: '🧈' },

  // ---- Grocery / staples ----
  { id: 'g1', shopId: 's1', name: 'Aashirvaad Atta', category: 'grocery', price: 220, mrp: 245, unit: '5 kg', emoji: '🌾', tag: 'OFFER' },
  { id: 'g2', shopId: 's1', name: 'Sugar', category: 'grocery', price: 48, unit: '1 kg', emoji: '🧂' },
  { id: 'g3', shopId: 's1', name: 'Toor Dal', category: 'grocery', price: 150, unit: '1 kg', emoji: '🫘' },
  { id: 'g4', shopId: 's1', name: 'Fortune Sunflower Oil', category: 'grocery', price: 145, unit: '1 L', emoji: '🛢️' },
  { id: 'g5', shopId: 's1', name: 'Govind Bhog Rice', category: 'grocery', price: 90, unit: '1 kg', emoji: '🍚' },
  { id: 'g6', shopId: 's1', name: 'Tata Salt', category: 'grocery', price: 28, unit: '1 kg', emoji: '🧂' },
  { id: 'g7', shopId: 's1', name: 'Maggi Masala', category: 'grocery', price: 14, unit: '70 g', emoji: '🍜' },
  { id: 'g8', shopId: 's1', name: 'Tea (Tata)', category: 'grocery', price: 135, unit: '250 g', emoji: '🍵' },

  // ---- Snacks ----
  { id: 'sn1', shopId: 's1', name: 'Lays Chips', category: 'snacks', price: 20, unit: '52 g', emoji: '🥔', tag: 'FAST' },
  { id: 'sn2', shopId: 's1', name: 'Parle-G', category: 'snacks', price: 10, unit: '1 pack', emoji: '🍪' },
  { id: 'sn3', shopId: 's1', name: 'Kurkure', category: 'snacks', price: 20, unit: '90 g', emoji: '🌽' },
  { id: 'sn4', shopId: 's1', name: 'Good Day Biscuit', category: 'snacks', price: 30, unit: '150 g', emoji: '🍪' },
  { id: 'sn5', shopId: 's1', name: 'Dairy Milk', category: 'snacks', price: 45, unit: '50 g', emoji: '🍫' },
  { id: 'sn6', shopId: 's1', name: 'Haldiram Bhujia', category: 'snacks', price: 52, unit: '200 g', emoji: '🥨' },

  // ---- Beverages ----
  { id: 'b1', shopId: 's1', name: 'Coca Cola', category: 'beverages', price: 40, unit: '750 ml', emoji: '🥤', tag: 'FAST' },
  { id: 'b2', shopId: 's1', name: 'Frooti', category: 'beverages', price: 20, unit: '250 ml', emoji: '🧃' },
  { id: 'b3', shopId: 's1', name: 'Bisleri Water', category: 'beverages', price: 20, unit: '1 L', emoji: '💧' },
  { id: 'b4', shopId: 's1', name: 'Red Bull', category: 'beverages', price: 125, unit: '250 ml', emoji: '🪫' },
  { id: 'b5', shopId: 's1', name: 'Real Juice', category: 'beverages', price: 110, unit: '1 L', emoji: '🧃' },

  // ---- Medicines (OTC only, no prescription) ----
  { id: 'm1', shopId: 's2', name: 'Paracetamol 500', category: 'medicines', price: 30, unit: '10 tabs', emoji: '💊' },
  { id: 'm2', shopId: 's2', name: 'ORS Packet', category: 'medicines', price: 22, unit: '1 pc', emoji: '🧂' },
  { id: 'm3', shopId: 's2', name: 'Dettol Antiseptic', category: 'medicines', price: 85, unit: '100 ml', emoji: '🧴' },
  { id: 'm4', shopId: 's2', name: 'Band-Aid', category: 'medicines', price: 40, unit: '10 pcs', emoji: '🩹' },
  { id: 'm5', shopId: 's2', name: 'Vicks VapoRub', category: 'medicines', price: 65, unit: '25 g', emoji: '🫙' },
  { id: 'm6', shopId: 's2', name: 'Digene Antacid', category: 'medicines', price: 95, unit: '200 ml', emoji: '🧪' },
  { id: 'm7', shopId: 's2', name: 'Hand Sanitizer', category: 'medicines', price: 55, unit: '100 ml', emoji: '🧴' },

  // ---- Personal care ----
  { id: 'p1', shopId: 's1', name: 'Colgate Toothpaste', category: 'personal', price: 55, unit: '100 g', emoji: '🪥' },
  { id: 'p2', shopId: 's1', name: 'Lux Soap', category: 'personal', price: 35, unit: '100 g', emoji: '🧼' },
  { id: 'p3', shopId: 's1', name: 'Clinic Plus Shampoo', category: 'personal', price: 85, unit: '175 ml', emoji: '🧴' },
  { id: 'p4', shopId: 's1', name: 'Surf Excel', category: 'personal', price: 120, unit: '1 kg', emoji: '🧺' },
];

export function productsByCategory(category: string): Product[] {
  return PRODUCTS.filter((p) => p.category === category);
}

export function bestSellers(): Product[] {
  return PRODUCTS.filter((p) => p.tag === 'FAST');
}

export function searchProducts(q: string): Product[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return PRODUCTS.filter((p) => p.name.toLowerCase().includes(s));
}

export function shopById(id: string): Shop | undefined {
  return SHOPS.find((s) => s.id === id);
}

/**
 * Real product photo URL (keyword-based, stable per product).
 * Falls back to the product emoji in the UI if the image can't load.
 * In go-live, we replace this with curated photos stored in Supabase.
 */
const CAT_KEYWORD: Record<string, string> = {
  fruits: 'fruit',
  vegetables: 'vegetable',
  dairy: 'dairy',
  grocery: 'grocery',
  snacks: 'snack',
  beverages: 'drink',
  medicines: 'medicine',
  personal: 'toiletry',
};

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

export function productImageUrl(p: Product): string {
  const kw = p.q ?? p.name;
  const extra = CAT_KEYWORD[p.category] ?? '';
  const keyword = extra ? `${kw},${extra}` : kw;
  const lock = hashCode(p.id) % 1000;
  return `https://loremflickr.com/300/300/${encodeURIComponent(keyword)}?lock=${lock}`;
}
