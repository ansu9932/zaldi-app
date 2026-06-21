/**
 * "next" — Core business algorithms (single source of truth)
 *
 * These functions are pure (no side effects) so they can run on the phone,
 * on the web admin, AND on the Supabase server and always give the same result.
 */

// ----- Config (matches .env) -----
export const SERVICE_CENTER = { lat: 21.7781, lng: 87.7517 }; // Contai / Kanthi
export const SERVICE_RADIUS_KM = 9;

export const MIN_ORDER_AMOUNT = 150; // rupees
export const BASE_DELIVERY_FEE = 25; // rupees, covers first 3 km
export const FREE_DISTANCE_KM = 3;
export const PER_KM_FEE = 8; // rupees per extra km beyond FREE_DISTANCE_KM
export const RAIN_FEE = 15; // rupees, added automatically when raining
export const AVG_RIDER_SPEED_KMPH = 20; // realistic town speed
export const SHOP_PREP_MIN = 8; // average shop preparation time
export const PICKUP_BUFFER_MIN = 5; // rider reaching shop + handover

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Haversine distance in kilometers between two GPS points.
 */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371; // earth radius km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Is a customer location within the serviceable 9 km radius of Contai?
 */
export function isServiceable(point: LatLng): {
  ok: boolean;
  distanceKm: number;
} {
  const d = distanceKm(SERVICE_CENTER, point);
  return { ok: d <= SERVICE_RADIUS_KM, distanceKm: Math.round(d * 10) / 10 };
}

/**
 * Distance-based delivery fee (shop -> customer).
 */
export function deliveryFee(shopToCustomerKm: number): number {
  if (shopToCustomerKm <= FREE_DISTANCE_KM) return BASE_DELIVERY_FEE;
  const extra = Math.ceil(shopToCustomerKm - FREE_DISTANCE_KM);
  return BASE_DELIVERY_FEE + extra * PER_KM_FEE;
}

/**
 * Surge fee based on how many riders are free vs. orders waiting.
 * Fewer free riders => higher surge.
 */
export function surgeFee(freeRiders: number, pendingOrders: number): number {
  if (pendingOrders === 0) return 0;
  const ratio = freeRiders / pendingOrders;
  if (ratio >= 1) return 0;
  if (ratio >= 0.5) return 10;
  return 20;
}

/**
 * Full fee breakdown for an order.
 */
export interface FeeBreakdown {
  subtotal: number;
  deliveryFee: number;
  rainFee: number;
  surgeFee: number;
  total: number;
  meetsMinimum: boolean;
  amountToMinimum: number; // how much more to reach MIN_ORDER_AMOUNT
}

export function computeFees(params: {
  subtotal: number;
  shopToCustomerKm: number;
  isRaining: boolean;
  freeRiders?: number;
  pendingOrders?: number;
}): FeeBreakdown {
  const { subtotal, shopToCustomerKm, isRaining } = params;
  const delivery = deliveryFee(shopToCustomerKm);
  const rain = isRaining ? RAIN_FEE : 0;
  const surge = surgeFee(params.freeRiders ?? 5, params.pendingOrders ?? 0);
  const meetsMinimum = subtotal >= MIN_ORDER_AMOUNT;

  return {
    subtotal,
    deliveryFee: delivery,
    rainFee: rain,
    surgeFee: surge,
    total: subtotal + delivery + rain + surge,
    meetsMinimum,
    amountToMinimum: meetsMinimum ? 0 : MIN_ORDER_AMOUNT - subtotal,
  };
}

/**
 * Estimated delivery time in minutes.
 * = shop prep + pickup buffer + travel time (shop -> customer)
 */
export function estimatedDeliveryMin(shopToCustomerKm: number): number {
  const travel = (shopToCustomerKm / AVG_RIDER_SPEED_KMPH) * 60;
  return Math.round(SHOP_PREP_MIN + PICKUP_BUFFER_MIN + travel);
}

/**
 * Pick the nearest FREE rider to a shop. Returns the rider id or null.
 */
export function nearestRider(
  shop: LatLng,
  riders: { id: string; location: LatLng; isFree: boolean }[]
): string | null {
  const free = riders.filter((r) => r.isFree);
  if (free.length === 0) return null;
  let best = free[0];
  let bestD = distanceKm(shop, best.location);
  for (const r of free.slice(1)) {
    const d = distanceKm(shop, r.location);
    if (d < bestD) {
      best = r;
      bestD = d;
    }
  }
  return best.id;
}

/**
 * Owner earnings on a delivered order.
 * Commission (10% of subtotal) + delivery fee + any surge/rain kept by platform.
 */
export const COMMISSION_RATE = 0.1;

export function ownerEarnings(fees: FeeBreakdown): number {
  const commission = fees.subtotal * COMMISSION_RATE;
  return Math.round(commission + fees.deliveryFee + fees.surgeFee + fees.rainFee);
}

/**
 * Rider payout for a delivery (simple model: base + per km).
 */
export const RIDER_BASE_PAY = 18;
export const RIDER_PER_KM = 6;

export function riderPayout(shopToCustomerKm: number, isRaining: boolean): number {
  const rainBonus = isRaining ? 10 : 0;
  return Math.round(RIDER_BASE_PAY + shopToCustomerKm * RIDER_PER_KM + rainBonus);
}
