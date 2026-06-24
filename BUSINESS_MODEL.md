# Zaldi — Business Model & Fair Commission System

This document explains **how Blinkit and Zepto actually make money**, and the
**"everyone wins" commission system** we built for Zaldi so that the platform, the
merchant, the rider *and* the customer all get a good deal.

> Research note: figures below are summarised and rephrased from public reporting
> for compliance with licensing restrictions. Sources are linked inline.

---

## 1. How Blinkit & Zepto make money (research summary)

Quick-commerce (10–20 minute delivery) apps do **not** make money from a single fee.
They stack up several small revenue streams on top of a high *frequency* of orders.
The key insight: if delivery is fast and cheap, people stop shopping weekly and start
shopping several times a week — turning a thin-margin basket into a high-frequency,
compounding relationship ([Finixschool / Inside Zepto](https://finixschool.substack.com/p/inside-zepto-how-the-business-actually)).

### The revenue streams

| Stream | What it is | Rough size |
|---|---|---|
| **Take rate / commission** | A cut of the order value, charged before discounts (on "Net Order Value"). This is the biggest lever. | ~**15–18%** of order value ([CNBC-TV18](https://www.cnbctv18.com/business/quick-commerce-gig-worker-anatomy-of-business-zepto-blinkit-ws-el-19813792.htm)); Zepto product sales ~15–20% ([GrowthJockey](https://www.growthjockey.com/blogs/zepto-business-model)) |
| **Delivery & handling fees** | Small fees from the customer, higher for tiny or priority orders; waived above a minimum basket value to push bigger carts. | ₹40–60 delivery cost per order ([base.com](https://base.com/en-EN/blog/quick-commerce-unit-economics-why-most-brands-get-the-math-wrong/)) |
| **Subscriptions** | E.g. Zepto Pass at ~₹99/month for free/cheaper delivery — locks in loyalty. | ([GrowthJockey](https://www.growthjockey.com/blogs/zepto-business-model)) |
| **Advertising** | Brands pay to rank higher / be featured in the app. Very high margin. | Industry q-commerce ad revenue ~₹4,900 cr by 2026 ([BrandShark](https://brandshark.com/is-quick-commerce-profitable-for-d2c-brands-the-hidden-costs/)) |
| **Private-label margins** | Their own brands sold at better margins than third-party goods. | ([GrowthJockey](https://www.growthjockey.com/blogs/zepto-business-model)) |

### The hard truth about profit

Per-order margins are **razor thin**. In FY26 reporting, Blinkit was roughly break-even
(a loss of about ₹3 per order) while competitors lost far more per order
([IND Money](https://www.indmoney.com/blog/stocks/zepto-blinkit-instamart-loss-per-order-profitability)).
Blinkit's operating margin was around **0.3% of net order value**
([Lapaas / Blinkit model](https://litmus.lapaas.com/learn/blinkit-business-model)).

**Lesson for Zaldi:** profit comes from a *small, sustainable* cut per order multiplied
by *high order frequency* — not from squeezing any single party. The biggest risk is
attaching a full delivery rider to a tiny ₹200 basket, which destroys the economics
([Finixschool](https://finixschool.substack.com/p/inside-zepto-how-the-business-actually)).
So we (a) keep a small commission, (b) charge a tiny handling fee, (c) set a minimum
order value, and (d) make rider assignment efficient (nearest store + nearest rider) to
keep delivery cost low.

*Content above was rephrased for compliance with licensing restrictions.*

---

## 2. The Zaldi "everyone wins" commission model

We split every order so each party comes out ahead. All rates live in
`apps/customer/lib/commission.ts` (and the authoritative copy runs server-side in
`supabase/commission_and_assignment.sql`).

### Default rates

| Setting | Value | Why |
|---|---|---|
| `MERCHANT_COMMISSION_RATE` | **12%** of item subtotal | Below the 15–18% industry take rate, so merchants keep **88%** and are happy to join. |
| `PLATFORM_FEE` | **₹7** flat handling fee from customer | Small, transparent; covers payment + support costs. |
| `RIDER_BASE_PAYOUT` | **₹18** per delivery | Guaranteed minimum so short trips are still worth it. |
| `RIDER_PER_KM` | **₹6** per km | Pays riders fairly for distance. |
| Rider tip | **100%** to rider | We never take a cut of tips. |
| `PAYMENT_GATEWAY_RATE` | **2%** on online payments | Deducted from *platform* profit, not from merchant/rider. |
| `FREE_DELIVERY_SUBTOTAL` | **₹399** | Free delivery above this nudges bigger baskets (better economics). |

### Who pays / who earns

```
Customer pays  =  item subtotal
               +  delivery fee        (goes toward the rider)
               +  platform fee (₹7)   (platform)
               +  rain/surge fee      (rider/platform buffer in bad conditions)
               -  coupon discount     (funded by the platform)
               +  tip                 (100% to rider)

Merchant earns =  item subtotal  -  12% commission
Rider earns    =  ₹18 + ₹6/km    +  100% of tip
Platform earns =  12% commission + ₹7 fee + (delivery fee - rider base/km payout)
               -  coupon discount  -  payment gateway fee
```

### Worked example — ₹300 basket, 2 km away, UPI, no coupon

| Line | Amount |
|---|---|
| Item subtotal | ₹300 |
| Delivery fee (≤3 km base) | ₹25 |
| Platform fee | ₹7 |
| **Customer pays** | **₹332** |
| | |
| Merchant commission (12% of ₹300) | ₹36 |
| **Merchant receives** | **₹264** |
| | |
| Rider payout (₹18 + ₹6×2) | ₹30 |
| **Rider receives** | **₹30** (+ any tip) |
| | |
| Platform gross (36 + 7 + 25) | ₹68 |
| – Rider payout | −₹30 |
| – Payment gateway (2% of ₹332) | −₹7 |
| **Platform net profit** | **≈ ₹31** |

**Result:** the customer pays a fair, transparent price and saves vs MRP; the merchant
keeps 88% with zero marketing spend; the rider gets a guaranteed payout plus the full
tip; and the platform keeps a small, sustainable profit (~9–10% of order value) that
grows with order frequency — exactly the Blinkit/Zepto playbook, scaled for a town.

---

## 3. Smart order routing (nearest store + nearest rider)

To keep delivery fast *and* cheap (the thing that makes the economics work), Zaldi routes
every order to the closest capable store and the closest available rider.

### Nearest-store routing (waterfall)
When a customer places an order, we rank every **open** store that stocks the basket by
distance to the customer and send the order to the **nearest** one first. If that store
can't fulfil or doesn't accept in time, it cascades to the **next nearest**, and so on.
Logic: `rankShopsByDistance` / `selectNearestFulfillingShop` in
`apps/customer/lib/assignment.ts` and `find_nearest_shops_for_items()` in SQL.

### Nearest-rider routing (waterfall)
When a store marks an order **ready**, we pick the closest **online + free** rider to the
*pickup store* and offer it to them first for a short window (default 45s). Riders who just
finished a delivery and are idle near the pickup get priority. If the preferred rider
doesn't accept in time, the offer opens to the next nearest rider, then to everyone.
Logic: `rankRidersForPickup` in `apps/customer/lib/assignment.ts`, and
`assign_preferred_rider()` + `reassign_expired_offers()` in SQL (triggered when an order
becomes `ready`).

This minimises pickup + delivery distance, which is the single biggest controllable cost
per order — and it means a fast rider near a new order is the one who gets it.

---

## 4. How to enable it

1. Run the migrations in `supabase/` in order, then run the new
   `supabase/commission_and_assignment.sql`.
2. Set rider/merchant store coordinates (the migration adds `staff.lat`, `staff.lng`).
   Riders' apps already stream GPS; the migration keeps the latest position for routing.
3. Tune the rates at the top of `apps/customer/lib/commission.ts` and the matching
   constants in the SQL file to match your market.
