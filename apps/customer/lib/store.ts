/**
 * Global state: auth + location + addresses + cart + last order (Zustand).
 */
import { create } from 'zustand';
import { LatLng } from './algorithms';
import { Product } from './catalog';

export interface CartLine {
  product: Product;
  qty: number;
}

export interface Address {
  id: string;
  label: string; // Home / Work / Other
  name: string;
  phone: string;
  line: string; // house / flat / building / street
  landmark: string;
  lat: number;
  lng: number;
}

export interface LastOrder {
  id: string;
  total: number;
  eta: number;
  paymentMethod: 'upi' | 'cod';
  address: Address;
  shop: LatLng;
}

interface AppState {
  // auth
  loggedIn: boolean;
  phone: string | null;
  name: string | null;
  login: (phone: string, name?: string) => void;
  logout: () => void;

  // current device location / serviceability
  location: LatLng | null;
  serviceable: boolean | null;
  distanceFromCenter: number | null;
  setLocation: (loc: LatLng, serviceable: boolean, distance: number) => void;

  // saved delivery addresses
  addresses: Address[];
  selectedAddressId: string | null;
  addAddress: (a: Omit<Address, 'id'>) => string;
  updateAddress: (a: Address) => void;
  selectAddress: (id: string) => void;
  selectedAddress: () => Address | null;

  // cart
  lines: Record<string, CartLine>;
  add: (p: Product) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;

  // last placed order (for tracking screen)
  lastOrder: LastOrder | null;
  setLastOrder: (o: LastOrder) => void;
}

export const useStore = create<AppState>((set, get) => ({
  loggedIn: false,
  phone: null,
  name: null,
  login: (phone, name) => set({ loggedIn: true, phone, name: name ?? null }),
  logout: () =>
    set({ loggedIn: false, phone: null, name: null, lines: {}, addresses: [], selectedAddressId: null }),

  location: null,
  serviceable: null,
  distanceFromCenter: null,
  setLocation: (loc, serviceable, distance) =>
    set({ location: loc, serviceable, distanceFromCenter: distance }),

  addresses: [],
  selectedAddressId: null,
  addAddress: (a) => {
    const id = 'addr_' + Date.now();
    set((s) => ({
      addresses: [...s.addresses, { ...a, id }],
      selectedAddressId: id,
    }));
    return id;
  },
  updateAddress: (a) =>
    set((s) => ({ addresses: s.addresses.map((x) => (x.id === a.id ? a : x)) })),
  selectAddress: (id) => set({ selectedAddressId: id }),
  selectedAddress: () => {
    const s = get();
    return s.addresses.find((a) => a.id === s.selectedAddressId) ?? null;
  },

  lines: {},
  add: (p) =>
    set((state) => {
      const existing = state.lines[p.id];
      return { lines: { ...state.lines, [p.id]: { product: p, qty: existing ? existing.qty + 1 : 1 } } };
    }),
  remove: (productId) =>
    set((state) => {
      const existing = state.lines[productId];
      if (!existing) return state;
      const next = { ...state.lines };
      if (existing.qty <= 1) delete next[productId];
      else next[productId] = { ...existing, qty: existing.qty - 1 };
      return { lines: next };
    }),
  clear: () => set({ lines: {} }),
  count: () => Object.values(get().lines).reduce((s, l) => s + l.qty, 0),
  subtotal: () => Object.values(get().lines).reduce((s, l) => s + l.product.price * l.qty, 0),

  lastOrder: null,
  setLastOrder: (o) => set({ lastOrder: o }),
}));
