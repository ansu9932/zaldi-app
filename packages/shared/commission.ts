/**
 * Zaldi — Commission & profit engine ("everyone wins" split).
 *
 * This is the single source of truth on the CLIENT for how an order's money is
 * split between the merchant, the rider and the platform. The authoritative copy
 * runs server-side in supabase/commission_and_assignment.sql (the client values
 * are for display only — the server re-computes everything when the order is
 * created so nobody can tamper with the numbers).
 *
 * See BUSINESS_MODEL.md for the research and the worked example behind these rates.
 */

// ---------- Tunable rates (match the SQL constants) ----------
/** Platform's cut of the item subtotal. Merchant keeps (1 - this). 12% < the
 *  15-18% industry take rate, so merchants stay happy. */
export const MERCHANT_COMMISSION_RATE = 0.12;
/** Small flat handling fee charged to the customer (covers payment + support). */
export const PLATFORM_FEE = 7;
/** Guaranteed rider payout per delivery, plus per-km. (Matches the rider app.) */
export const RIDER_BASE_PAYOUT = 18;
export const RIDER_PER_KM = 6;
/** Payment-gateway cost on online (UPI) orders, taken from the PLATFORM's profit. */
export const PAYMENT_GATEWAY_RATE = 0.02;
/** Free delivery above this item subtotal — nudges bigger, more profitable baskets. */
export const FREE_DELIVERY_SUBTOTAL = 399;

export interface CommissionInput {
  itemSubtotal: number;
  deliveryFee: number;
  rainFee?: number;
  surgeFee?: number;
  discount?: number; // coupon discount (funded by the platform)
  tip?: number; // 100% goes to the rider
  distanceKm: number;
  paymentMethod?: 'upi' | 'cod';
  /** Optional: total saved vs MRP across the cart (for the "you save" line). */
  mrpSavings?: number;
}

export interface CommissionBreakdown {
  // What the customer pays
  itemSubtotal: number;
  deliveryFee: number;
  platformFee: number;
  rainFee: number;
  surgeFee: number;
  discount: number;
  tip: number;
  customerTotal: number;
  customerSavings: number; // mrp savings + coupon discount

  // What each party earns
  merchantCommissionRate: number;
  merchantCommission: number;
  merchantPayout: number;

  riderPayout: number; // base + per-km (tip is added on delivery, paid 100%)
  riderTip: number;

  platformGross: number; // commission + platform fee + delivery fee
  paymentGatewayFee: number;
  platformNet: number; // what the platform actually keeps after costs
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Rider payout for a trip of `km` kilometres (excludes tip, which is paid 100%). */
export function riderPayout(km: number): number {
  return Math.round(RIDER_BASE_PAYOUT + RIDER_PER_KM * Math.max(0, km));
}

/** Is delivery free for this basket size? */
export function isFreeDelivery(itemSubtotal: number): boolean {
  return itemSubtotal >= FREE_DELIVERY_SUBTOTAL;
}

/**
 * Compute the full money split for an order. Pure function — no side effects.
 */
export function computeCommission(input: CommissionInput): CommissionBreakdown {
  const itemSubtotal = Math.max(0, input.itemSubtotal);
  const rainFee = Math.max(0, input.rainFee ?? 0);
  const surgeFee = Math.max(0, input.surgeFee ?? 0);
  const discount = Math.max(0, input.discount ?? 0);
  const tip = Math.max(0, input.tip ?? 0);
  const mrpSavings = Math.max(0, input.mrpSavings ?? 0);

  // Free delivery above the threshold keeps big baskets attractive.
  const deliveryFee = isFreeDelivery(itemSubtotal) ? 0 : Math.max(0, input.deliveryFee);
  const platformFee = itemSubtotal > 0 ? PLATFORM_FEE : 0;

  const customerTotal = round2(
    itemSubtotal + deliveryFee + platformFee + rainFee + surgeFee - discount + tip,
  );

  // Merchant: keeps subtotal minus our commission.
  const merchantCommission = round2(itemSubtotal * MERCHANT_COMMISSION_RATE);
  const merchantPayout = round2(itemSubtotal - merchantCommission);

  // Rider: guaranteed base + per-km, plus 100% of the tip.
  const ridePay = riderPayout(input.distanceKm);

  // Platform: commission + handling fee + delivery fee collected.
  const platformGross = round2(merchantCommission + platformFee + deliveryFee + rainFee + surgeFee);
  const paymentGatewayFee =
    (input.paymentMethod ?? 'cod') === 'upi' ? round2(customerTotal * PAYMENT_GATEWAY_RATE) : 0;
  // Platform pays the rider's base+km out of what it collects, funds the coupon,
  // and absorbs the gateway fee. (Tip is pass-through, excluded from both sides.)
  const platformNet = round2(platformGross - ridePay - discount - paymentGatewayFee);

  return {
    itemSubtotal,
    deliveryFee,
    platformFee,
    rainFee,
    surgeFee,
    discount,
    tip,
    customerTotal,
    customerSavings: round2(mrpSavings + discount),

    merchantCommissionRate: MERCHANT_COMMISSION_RATE,
    merchantCommission,
    merchantPayout,

    riderPayout: ridePay,
    riderTip: tip,

    platformGross,
    paymentGatewayFee,
    platformNet,
  };
}
