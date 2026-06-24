# Store Listing Pack — next (Play Store + App Store)

Copy-paste ready text and a checklist for submitting all three apps. Replace any
**[PLACEHOLDER]**. The app's internal name is **next** (`app.json` → `expo.name`);
rename it there if you want a different store name.

> Bundle / package IDs (already set):
> - Customer: `in.nextapp.customer`
> - Merchant: `in.nextapp.merchant`
> - Rider: `in.nextapp.rider`

---

## 1) CUSTOMER APP — public listing

**App name (30 char max):**
`next: Fast Local Delivery`

**Short description / subtitle (80 char max):**
`Groceries, medicines & essentials delivered to your door in minutes.`

**Full description:**
```
next is your neighbourhood delivery app for Contai (Kanthi) and nearby areas.
Order groceries, medicines, snacks and daily essentials from local stores and get
them delivered to your door fast.

WHY YOU'LL LOVE IT
• Lightning-fast delivery from stores near you
• Live order tracking — watch your rider on the map
• Fair, transparent pricing with no hidden charges
• Free delivery on orders above the basket limit
• Pay by UPI or cash on delivery
• Reorder your favourites in one tap

SHOP LOCAL, DELIVERED FAST
We connect you with trusted local stores so your order is picked from the nearest
shop and delivered by the closest rider — quick for you, fair for everyone.

Order today and get your essentials in minutes.
```

**Category:** Shopping (Play) / Food & Drink or Shopping (App Store)
**Content rating:** Everyone / 4+ (note: 18+ confirmation applies to restricted items)
**Privacy Policy URL:** [YOUR HOSTED PRIVACY POLICY URL]
**Support email:** [SUPPORT EMAIL]
**Website:** [WEBSITE or leave blank]

**Keywords (App Store, 100 char):**
`delivery,grocery,quick commerce,medicine,local store,food,contai,kanthi,essentials`

---

## 2) MERCHANT APP — "next Partner"

> Recommended distribution: **Closed/Internal testing** on Play (invite your stores)
> or send the **APK** directly. Not meant for the general public.

**App name:** `next Partner`
**Short description:** `Manage orders for your store on next.`
**Full description:**
```
next Partner is for stores that sell on the next delivery platform. Accept incoming
orders, mark them ready for pickup, manage your products and prices, and track your
daily orders — all from your phone.
```

---

## 3) RIDER APP — "next Rider"

> Recommended distribution: **Closed/Internal testing** or direct **APK**.

**App name:** `next Rider`
**Short description:** `Accept deliveries and earn with next.`
**Full description:**
```
next Rider is for delivery partners on the next platform. Get nearby delivery
offers, navigate to the store and customer with live maps, collect payment, and
track your earnings. The nearest available rider gets each order first.
```

---

## 4) Visual assets checklist (you must create these)

| Asset | Size | Needed for |
|---|---|---|
| App icon | 512×512 PNG | Play Store |
| App icon | 1024×1024 PNG (no alpha) | App Store |
| Feature graphic | 1024×500 PNG | Play Store |
| Phone screenshots | min 2, 1080×1920 (portrait) | Both |
| 7" / tablet shots | optional | Both |

**Screenshot suggestions (take from a real build):**
1. Home screen with categories + products
2. Product detail page
3. Cart with the bill + "free delivery unlocked"
4. Live order tracking map
5. Order history with delivered status

Tip: run the app, take screenshots on your phone, and add a one-line caption to each
in a free tool like Canva.

---

## 5) Play Store "Data Safety" form answers

Declare these data types as **collected** (and, where noted, **shared** with the
store/rider/providers). None is sold.

| Data type | Collected | Shared | Purpose |
|---|---|---|---|
| Name | Yes | Yes | App functionality (order/delivery) |
| Phone number | Yes | Yes | App functionality, customer support |
| Address | Yes | Yes | Delivery |
| Approximate + precise location | Yes | Yes (rider↔customer) | App functionality (availability + live tracking) |
| Purchase/order history | Yes | No | App functionality |
| Payment info | Yes (via Razorpay) | Processed by Razorpay | Payments |
| Push token / device id | Yes | No | Notifications |
| App diagnostics | Yes | No | Stability |

- Data encrypted in transit: **Yes**
- Users can request deletion: **Yes** (email / in-app Help & Support)

For **App Store**, fill the equivalent **App Privacy** questionnaire with the same
data types (Contact Info, Location, Purchases, Identifiers, Usage/Diagnostics) and
link the privacy policy.

---

## 6) Submission flow — ANDROID (Google Play)

1. Pay the one-time **$25** and create the app in the [Play Console](https://play.google.com/console).
2. Build the AAB (already configured):
   ```bash
   cd apps/customer
   eas build --platform android --profile production
   ```
3. Submit it:
   ```bash
   eas submit --platform android --profile production
   ```
   (First run will ask you to connect a Google service account — follow the prompts,
   or upload the AAB manually in the console.)
4. In the console, complete: **Store listing** (text + assets above), **Privacy
   policy URL**, **Data safety**, **Content rating** questionnaire, **Target
   audience**, and **App access** (give reviewers a test login if needed).
5. Release to **Internal testing** → verify → promote to **Production**.

Repeat for merchant/rider only if you want them on Play (Closed testing track).

---

## 7) Submission flow — iOS (Apple App Store)

> Needs an **Apple Developer account ($99/yr)**. You're on a Mac, so this works.

1. Create the app record in [App Store Connect](https://appstoreconnect.apple.com)
   with bundle id `in.nextapp.customer`.
2. Build + submit:
   ```bash
   cd apps/customer
   eas build --platform ios --profile production
   eas submit --platform ios --profile production
   ```
   EAS will help create the needed certificates/provisioning automatically.
3. In App Store Connect: add screenshots (6.7" + 6.5" iPhone required), description,
   keywords, support URL, **App Privacy** answers, and the privacy policy URL.
4. Add **review notes** (a test phone number/login + how to place a test order),
   then **Submit for Review**. Apple review usually takes 1–3 days.

---

## 8) Pre-submit checklist

- [ ] Privacy Policy hosted at a public URL and added to both stores
- [ ] Admin passcode changed from `1234`
- [ ] Razorpay on **live** keys + webhook configured and tested
- [ ] One real end-to-end order tested (order → ready → rider → delivered → paid)
- [ ] App name/branding finalised in `app.json`
- [ ] Icons + screenshots + feature graphic created
- [ ] Google Maps key set as an EAS env var (customer + rider)
- [ ] Support email + in-app Help working
