/**
 * Global state: auth + location + addresses + cart + order history (Zustand).
 * Persisted to the device with AsyncStorage so nothing is lost when the app closes
 * (cart items, saved addresses, order history, and login all stay saved).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LatLng } from './algorithms';
import { Product } from './catalog';

export interface CartLine {
  product: Product;
  qty: number;
}

export interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  line: string;
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
  discount?: number;
  tip?: number;
  couponCode?: string | null;
  otp?: string | null;
}

export interface OrderItemLite { name: string; qty: number; price: number; productId?: string }

export interface PastOrder {
  id: string;
  total: number;
  paymentMethod: 'upi' | 'cod';
  createdAt: number;
  itemCount: number;
  addressLabel: string;
  status: string;
  items: OrderItemLite[];
  discount?: number;
  tip?: number;
  rated?: boolean;
  // Full snapshot of cart lines so the customer can re-order in one tap.
  reorder?: CartLine[];
}

interface AppState {
  loggedIn: boolean;
  phone: string | null;
  name: string | null;
  login: (phone: string, name?: string) => void;
  logout: () => void;

  // Age verification (for 18+ categories: wine / cigarettes)
  ageVerified: boolean;
  confirmAge: () => void;

  location: LatLng | null;
  serviceable: boolean | null;
  distanceFromCenter: number | null;
  setLocation: (loc: LatLng, serviceable: boolean, distance: number) => void;

  addresses: Address[];
  selectedAddressId: string | null;
  addAddress: (a: Omit<Address, 'id'>) => string;
  updateAddress: (a: Address) => void;
  selectAddress: (id: string) => void;
  selectedAddress: () => Address | null;

  lines: Record<string, CartLine>;
  add: (p: Product) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
  cartShopId: () => string | null;
  setCart: (lines: CartLine[]) => void;

  favorites: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;

  lastOrder: LastOrder | null;
  setLastOrder: (o: LastOrder) => void;
  clearLastOrder: () => void;
  lastOrderStatus: string | null;
  setLastOrderStatus: (s: string) => void;

  orderHistory: PastOrder[];
  addToHistory: (o: PastOrder) => void;
  markRated: (id: string) => void;
  updateOrderStatuses: (statuses: Record<string, string>) => void;

  // Deferred checkout: for online (UPI) orders we DON'T clear the cart or write
  // history until payment actually succeeds. This avoids "ghost orders" where a
  // customer abandons the payment screen but the app already showed it as placed.
  pendingCheckout: { last: LastOrder; history: PastOrder } | null;
  setPendingCheckout: (p: { last: LastOrder; history: PastOrder } | null) => void;
  commitPendingCheckout: () => void;

  pushToken: string | null;
  setPushToken: (t: string | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      loggedIn: false,
      phone: null,
      name: null,
      login: (phone, name) => set({ loggedIn: true, phone, name: name ?? null }),
      logout: () => set({ loggedIn: false, phone: null, name: null, lines: {} }),

      ageVerified: false,
      confirmAge: () => set({ ageVerified: true }),

      location: null,
      serviceable: null,
      distanceFromCenter: null,
      setLocation: (loc, serviceable, distance) =>
        set({ location: loc, serviceable, distanceFromCenter: distance }),

      addresses: [],
      selectedAddressId: null,
      addAddress: (a) => {
        const id = 'addr_' + Date.now();
        set((s) => ({ addresses: [...s.addresses, { ...a, id }], selectedAddressId: id }));
        return id;
      },
      updateAddress: (a) => set((s) => ({ addresses: s.addresses.map((x) => (x.id === a.id ? a : x)) })),
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
      cartShopId: () => {
        const first = Object.values(get().lines)[0];
        return first ? first.product.shopId : null;
      },
      setCart: (lines) => {
        const map: Record<string, CartLine> = {};
        for (const l of lines) map[l.product.id] = { product: l.product, qty: l.qty };
        set({ lines: map });
      },

      favorites: [],
      toggleFavorite: (productId) =>
        set((s) => ({
          favorites: s.favorites.includes(productId)
            ? s.favorites.filter((id) => id !== productId)
            : [...s.favorites, productId],
        })),
      isFavorite: (productId) => get().favorites.includes(productId),

      lastOrder: null,
      setLastOrder: (o) => set({ lastOrder: o, lastOrderStatus: 'placed' }),
      clearLastOrder: () => set({ lastOrder: null, lastOrderStatus: null }),
      lastOrderStatus: null,
      setLastOrderStatus: (st) => set({ lastOrderStatus: st }),

      orderHistory: [],
      addToHistory: (o) => set((s) => ({ orderHistory: [o, ...s.orderHistory] })),
      markRated: (id) => set((s) => ({ orderHistory: s.orderHistory.map((o) => (o.id === id ? { ...o, rated: true } : o)) })),
      updateOrderStatuses: (statuses) =>
        set((s) => ({
          orderHistory: s.orderHistory.map((o) =>
            statuses[o.id] && statuses[o.id] !== o.status ? { ...o, status: statuses[o.id] } : o,
          ),
        })),

      pendingCheckout: null,
      setPendingCheckout: (p) => set({ pendingCheckout: p }),
      commitPendingCheckout: () =>
        set((s) => {
          const p = s.pendingCheckout;
          if (!p) return s;
          return {
            orderHistory: [p.history, ...s.orderHistory],
            lastOrder: p.last,
            lastOrderStatus: 'placed',
            lines: {},
            pendingCheckout: null,
          };
        }),

      pushToken: null,
      setPushToken: (t) => set({ pushToken: t }),
    }),
    {
      name: 'next-customer-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        loggedIn: s.loggedIn,
        phone: s.phone,
        name: s.name,
        ageVerified: s.ageVerified,
        addresses: s.addresses,
        selectedAddressId: s.selectedAddressId,
        lines: s.lines,
        orderHistory: s.orderHistory,
        lastOrder: s.lastOrder,
        lastOrderStatus: s.lastOrderStatus,
        favorites: s.favorites,
        pushToken: s.pushToken,
      }),
    },
  ),
);
