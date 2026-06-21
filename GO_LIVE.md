# next — Go Live runbook 🚀

Follow these steps in order. Steps marked **[You]** are quick clicks you do in a
dashboard; steps marked **[Kiro]** are code I wire up for you.

---

## Step 1 — Deploy the database  **[You, 3 min]**
1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste all of `supabase/schema.sql` → **Run**.
3. New query → paste all of `supabase/seed.sql` → **Run** (sample Contai shops/products).
4. New query → paste `supabase/staff.sql` → **Run** (merchant/rider logins).
5. New query → paste `supabase/live_setup.sql` → **Run** (order flow + realtime).
6. New query → paste `supabase/live_location.sql` → **Run** (live rider GPS columns).
7. New query → paste `supabase/features.sql` → **Run** (coupons, tips, ratings, rider phone/online).
8. **Before public launch:** New query → paste `supabase/secure_setup.sql` → **Run**.
   This hashes all staff passwords, stops the app key from reading the staff
   table, and validates order totals server-side. Logins keep working — the apps
   automatically use the secure login function once this is run.
✅ Your tables, security rules, and realtime are now live.

## Step 2 — Connect the apps to Supabase  **[You, 1 min]**
In each mobile app folder, create a file named `.env` with:
```
EXPO_PUBLIC_SUPABASE_URL=https://wllitkewxmadrrmcdxvs.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your anon public key>
```
(The anon key is safe to ship. The app auto-switches from demo data to live data
when these are present.)

## Step 3 — Razorpay payment functions  **[You, 5 min]**
Install the Supabase CLI once: `npm install -g supabase`, then:
```
supabase login
supabase link --project-ref wllitkewxmadrrmcdxvs

# set the SECRET keys (server-side only)
supabase secrets set RAZORPAY_KEY_ID=rzp_live_T2d6JnWEh5RYZj
supabase secrets set RAZORPAY_KEY_SECRET=<your razorpay secret>
supabase secrets set RAZORPAY_WEBHOOK_SECRET=<choose-a-strong-secret>

# deploy the functions
supabase functions deploy create-razorpay-order --no-verify-jwt
supabase functions deploy razorpay-webhook --no-verify-jwt
```

## Step 4 — Add the webhook in Razorpay  **[You, 2 min]**
1. Razorpay Dashboard → **Settings → Webhooks → Add New**.
2. URL: `https://wllitkewxmadrrmcdxvs.functions.supabase.co/razorpay-webhook`
3. Secret: the same `RAZORPAY_WEBHOOK_SECRET` you set above.
4. Active event: **payment.captured** → Save.

## Step 5 — Login (OTP) decision  **[You choose]**
Real phone OTP needs an SMS provider. Options:
- **A) MSG91 / Twilio** via Supabase Phone Auth (real SMS OTP; small per-SMS cost).
- **B) Email OTP / magic link** (free, no SMS).
- **C) Keep demo login** for now, add OTP later.
Tell Kiro which one and it gets wired in.

## Step 6 — Live order flow + realtime  **[Kiro]**
Once Steps 1–2 are done, Kiro wires:
- Customer app: products from DB, order insert, Razorpay checkout.
- Merchant app: realtime new-order alerts → accept → mark ready.
- Rider app: realtime job offers → accept → live GPS → delivered.
- Admin: live orders + payouts from DB.

## Step 7 — Real map + GPS tracking  **[Kiro, needs dev build]**
Real Google Maps with the rider's live location needs a "development build"
(not Expo Go). Kiro sets up `eas build --profile development` and wires
`react-native-maps` + live location streaming.

---

### Quick reference
- Functions base URL: `https://wllitkewxmadrrmcdxvs.functions.supabase.co`
- Never put `RAZORPAY_KEY_SECRET` or the `service_role` key in any app `.env`
  (only in Supabase secrets). The app `.env` uses only the **anon** + **public** keys.
