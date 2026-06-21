/**
 * Global cart + location state (Zustand).
 */
import { create } from 'zustand';
import { LatLng } from './algorithms';
import { Product } from './demoData';

export interface CartLine {
  product: Product;
  qty: number;
}

interface AppState {
  // location / serviceability
  location: LatLng | null;
  serviceable: boolean | null; // null = not checked yet
  distanceFromCenter: number | null;
  setLocation: (loc: LatLng, serviceable: boolean, distance: number) => void;

  // cart
  lines: Record<string, CartLine>;
  add: (p: Product) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
}

export const useStore = create<AppState>((set, get) => ({
  location: null,
  serviceable: null,
  distanceFromCenter: null,
  setLocation: (loc, serviceable, distance) =>
    set({ location: loc, serviceable, distanceFromCenter: distance }),

  lines: {},
  add: (p) =>
    set((state) => {
      const existing = state.lines[p.id];
      return {
        lines: {
          ...state.lines,
          [p.id]: { product: p, qty: existing ? existing.qty + 1 : 1 },
        },
      };
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
  count: () =>
    Object.values(get().lines).reduce((sum, l) => sum + l.qty, 0),
  subtotal: () =>
    Object.values(get().lines).reduce(
      (sum, l) => sum + l.product.price * l.qty,
      0
    ),
}));
