/**
 * Zaldi — Smart order routing algorithms.
 *
 *  1. Nearest-store routing: when a customer places an order, rank every open
 *     store that can fulfil the basket by distance to the customer and send it to
 *     the nearest first; cascade to the next nearest if it can't accept.
 *
 *  2. Nearest-rider routing: when a store marks an order ready, rank online + free
 *     riders by distance to the PICKUP store (with a small bonus for riders who
 *     just went idle) and offer it to the nearest first; cascade if not accepted.
 *
 * These are pure functions (no side effects) so they can run on the client for
 * instant UX and be mirrored server-side in SQL for the authoritative decision.
 * See BUSINESS_MODEL.md §3.
 */
import { LatLng, distanceKm } from './algorithms';

// ============================================================
//  1. NEAREST STORE
// ============================================================

export interface ShopCandidate {
  id: string;
  name?: string;
  location: LatLng;
  isOpen?: boolean;
  /** Product ids (or names) this shop currently has in stock. Optional: when
   *  omitted the shop is assumed able to fulfil (single-catalog demo mode). */
  stockKeys?: string[];
}

export interface RankedShop extends ShopCandidate {
  distanceKm: number;
}

/** Rank shops by distance to the customer (nearest first). */
export function rankShopsByDistance(shops: ShopCandidate[], customer: LatLng): RankedShop[] {
  return shops
    .map((s) => ({ ...s, distanceKm: Math.round(distanceKm(s.location, customer) * 100) / 100 }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Can this shop fulfil every requested key (product id / name)? */
function canFulfil(shop: ShopCandidate, requiredKeys: string[]): boolean {
  if (!requiredKeys.length) return true;
  if (!shop.stockKeys) return true; // unknown stock => assume yes (demo)
  const set = new Set(shop.stockKeys);
  return requiredKeys.every((k) => set.has(k));
}

/**
 * Build the ordered waterfall of stores to try for an order: only OPEN stores
 * that can fulfil the whole basket, nearest first. The order is sent to
 * candidates[0]; if it can't accept, fall through to candidates[1], etc.
 */
export function selectFulfillingShops(
  shops: ShopCandidate[],
  customer: LatLng,
  requiredKeys: string[] = [],
): RankedShop[] {
  return rankShopsByDistance(shops, customer).filter(
    (s) => s.isOpen !== false && canFulfil(s, requiredKeys),
  );
}

/** Convenience: the single nearest fulfilling store (or null). */
export function selectNearestFulfillingShop(
  shops: ShopCandidate[],
  customer: LatLng,
  requiredKeys: string[] = [],
): RankedShop | null {
  return selectFulfillingShops(shops, customer, requiredKeys)[0] ?? null;
}

// ============================================================
//  2. NEAREST RIDER
// ============================================================

export interface RiderCandidate {
  id: string;
  name?: string;
  location: LatLng | null;
  isOnline?: boolean;
  isFree?: boolean;
  /** Epoch ms of the rider's last delivery — used to give just-freed riders a nudge. */
  lastDeliveredAt?: number | null;
}

export interface RankedRider extends RiderCandidate {
  distanceKm: number;
  score: number; // lower is better
}

export interface RiderRankOptions {
  /** Riders idle for less than this many minutes get a small priority bonus. */
  recentlyFreedWindowMin?: number;
  /** Score bonus (in "km equivalent") for a recently-freed rider. */
  recentlyFreedBonusKm?: number;
  /** Ignore riders further than this from the pickup store. */
  maxPickupKm?: number;
  now?: number;
}

const DEFAULTS: Required<Omit<RiderRankOptions, 'now'>> = {
  recentlyFreedWindowMin: 10,
  recentlyFreedBonusKm: 0.8,
  maxPickupKm: 8,
};

/**
 * Rank riders to offer a pickup at `shop`. Only online + free riders with a known
 * location within `maxPickupKm` are considered. Score = distance to pickup minus a
 * small bonus for riders who *just* finished a delivery (so a fast rider who just
 * completed an order near a new order gets it first). Nearest/best first.
 */
export function rankRidersForPickup(
  riders: RiderCandidate[],
  shop: LatLng,
  opts: RiderRankOptions = {},
): RankedRider[] {
  const o = { ...DEFAULTS, ...opts };
  const now = opts.now ?? Date.now();

  return riders
    .filter((r) => r.isOnline !== false && r.isFree !== false && r.location != null)
    .map((r) => {
      const d = Math.round(distanceKm(r.location as LatLng, shop) * 100) / 100;
      const idleMin = r.lastDeliveredAt != null ? (now - r.lastDeliveredAt) / 60000 : Infinity;
      const freshBonus = idleMin <= o.recentlyFreedWindowMin ? o.recentlyFreedBonusKm : 0;
      return { ...r, distanceKm: d, score: d - freshBonus };
    })
    .filter((r) => r.distanceKm <= o.maxPickupKm)
    .sort((a, b) => a.score - b.score);
}

/** The single best rider to offer first (or null if none available). */
export function selectNearestRider(
  riders: RiderCandidate[],
  shop: LatLng,
  opts: RiderRankOptions = {},
): RankedRider | null {
  return rankRidersForPickup(riders, shop, opts)[0] ?? null;
}
