/**
 * "next" — Core business algorithms (copied from packages/shared/algorithms.ts)
 */
export const SERVICE_CENTER = { lat: 21.7781, lng: 87.7517 }; // Contai / Kanthi
export const SERVICE_RADIUS_KM = 9;
export const MIN_ORDER_AMOUNT = 150;
export const BASE_DELIVERY_FEE = 25;
export const FREE_DISTANCE_KM = 3;
export const PER_KM_FEE = 8;
export const RAIN_FEE = 15;
export const AVG_RIDER_SPEED_KMPH = 20;
export const SHOP_PREP_MIN = 8;
export const PICKUP_BUFFER_MIN = 5;

export interface LatLng {
  lat: number;
  lng: number;
}

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
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

export function isServiceable(point: LatLng): { ok: boolean; distanceKm: number } {
  const d = distanceKm(SERVICE_CENTER, point);
  return { ok: d <= SERVICE_RADIUS_KM, distanceKm: Math.round(d * 10) / 10 };
}

export function deliveryFee(shopToCustomerKm: number): number {
  if (shopToCustomerKm <= FREE_DISTANCE_KM) return BASE_DELIVERY_FEE;
  const extra = Math.ceil(shopToCustomerKm - FREE_DISTANCE_KM);
  return BASE_DELIVERY_FEE + extra * PER_KM_FEE;
}

export function surgeFee(freeRiders: number, pendingOrders: number): number {
  if (pendingOrders === 0) return 0;
  const ratio = freeRiders / pendingOrders;
  if (ratio >= 1) return 0;
  if (ratio >= 0.5) return 10;
  return 20;
}

export interface FeeBreakdown {
  subtotal: number;
  deliveryFee: number;
  rainFee: number;
  surgeFee: number;
  total: number;
  meetsMinimum: boolean;
  amountToMinimum: number;
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

export function estimatedDeliveryMin(shopToCustomerKm: number): number {
  const travel = (shopToCustomerKm / AVG_RIDER_SPEED_KMPH) * 60;
  return Math.round(SHOP_PREP_MIN + PICKUP_BUFFER_MIN + travel);
}
