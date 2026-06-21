# next — Quick-commerce delivery platform for Contai 🚀

A Blinkit/Zepto-style delivery system built for Contai (Kanthi), West Bengal.
4 apps that all talk to one Supabase backend.

| App | Folder | What it is | Runs on |
|-----|--------|-----------|---------|
| **Customer** | `apps/customer` | Browse, cart, checkout (UPI/COD), 9 km check | Android + iOS |
| **Merchant** | `apps/merchant` | Shops accept orders & mark ready | Android + iOS |
| **Rider** | `apps/rider` | Riders get jobs, navigate, deliver | Android + iOS |
| **Admin** | `apps/admin` | Live orders, shops, riders, payouts | Web (Hostinger) |

**Brand:** Indigo `#4F46E5` + Lime `#A3E635` · **Min order:** ₹150 · **Service radius:** 9 km from Contai.

> ⚠️ The 3 mobile apps + admin currently run in **DEMO MODE** with sample Contai
> data, so you can see and test the full UI immediately. Connecting the live
> Supabase database + Razorpay payments is **Stage 8** (see "Go live" below).

---

## ✅ What you need on your Mac (one time)

```bash
# 1. Install Node.js (if not already): https://nodejs.org  (LTS version)
# 2. Install the Expo Go app on your Android phone (Play Store) and iPhone (App Store)
```

---

## ▶️ Test the 3 mobile apps (Customer / Merchant / Rider)

Do this for each app. Example for the **Customer** app:

```bash
cd apps/customer
npm install          # first time only, downloads packages
npx expo start       # shows a QR code
```

- **Android:** open **Expo Go** → "Scan QR code" → scan it → the app opens.
- **iPhone:** open the **Camera** → point at the QR → tap the banner → opens in Expo Go.

Repeat for `apps/merchant` and `apps/rider` (open a new terminal tab for each).

> Tip: if the QR doesn't connect, run `npx expo start --tunnel`.

---

## 🖥️ Test the Admin dashboard (web)

```bash
cd apps/admin
npm install
npm run dev          # opens http://localhost:5173
```

---

## 🗄️ Set up the database (Supabase) — needed before going live

1. Go to your Supabase project → **SQL Editor** → **New query**.
2. Paste the contents of `supabase/schema.sql` → **Run**.
3. Paste the contents of `supabase/seed.sql` → **Run** (adds demo Contai shops).

---

## 📦 Build a real installable APK (Android)

```bash
cd apps/customer
npm install -g eas-cli      # one time
eas login                   # log in to your free Expo account
eas build --platform android --profile preview
```

Expo builds it in the cloud and gives you a **download link**. Open that link on
your Android phone → download → install (allow "unknown sources"). You can share
this link with friends to test.

For iPhone: `eas build --platform ios` (needs Apple Developer account or use
Xcode on your Mac for your own device).

---

## 🌐 Deploy the Admin dashboard to Hostinger

```bash
cd apps/admin
npm run build        # creates the "dist" folder
```

1. Log in to Hostinger → **hPanel → File Manager**.
2. Open `public_html` (or a subfolder like `public_html/admin`).
3. Upload **everything inside the `dist` folder**.
4. Visit your domain — the dashboard is live. ✅

---

## 🔐 Go live (Stage 8 — connect real services)

When you're ready, we switch each app from demo data to live:
1. Add `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` to each app's `.env`
   (see `apps/customer/.env.example`).
2. Wire Razorpay checkout + webhook (uses keys in the root `.env`).
3. Turn on Supabase Realtime so merchant/rider get instant orders.
4. Add the weather API for the automatic rain fee.
5. Add Firebase files for "New order!" push notifications.

Secrets live in the root `.env` file, which is **git-ignored** and never pushed.

---

## 📁 Project structure

```
zaldi-app/
├── apps/
│   ├── customer/   # Expo app
│   ├── merchant/   # Expo app
│   ├── rider/      # Expo app
│   └── admin/      # Vite + React web app
├── packages/shared/  # brand colors + business algorithms (master copy)
├── supabase/         # schema.sql + seed.sql
└── .env              # real secrets (git-ignored)
```
