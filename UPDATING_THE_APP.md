# Updating the app — fixing bugs & making changes after launch

A simple guide to changing your app once it's live. There are **two kinds** of
changes, and they update very differently.

---

## 1. The two kinds of changes

### A) JavaScript / content changes → **instant update, no resubmission**
Examples: text, prices/labels, colours, layout, fixing a logic bug, adding a screen.

Your apps already include **EAS Update (`expo-updates`)**, so you push these
over-the-air and users get them on the next app open — **no new store build, no review**:
```bash
cd apps/customer        # or apps/merchant / apps/rider
eas update --branch production --message "Fixed the cart total bug"
```

### B) Native changes → **new build + store submission required**
Examples: **app icon/splash**, app name, permissions, new native libraries, Expo SDK
upgrade, bundle id.

These need a fresh build and re-submission:
```bash
cd apps/customer
eas build --platform android --profile production
eas build --platform ios --profile production
eas submit  --platform android --profile production
eas submit  --platform ios --profile production
```

### C) Backend changes (Supabase)
Database/logic changes are SQL or Edge Functions — they apply the moment you run them
in Supabase, and affect all apps at once. No app rebuild needed.
```bash
# in the Supabase SQL editor: run your updated .sql file
supabase functions deploy <function-name>   # for edge functions
```

---

## 2. The normal workflow (recommended)

1. **Describe the bug/change** clearly — what you see, what you expected, which app
   and screen. A screenshot helps a lot.
2. **The change is made in code** (you can ask me, Kiro, to do it — I'll edit the code
   and open a Pull Request on GitHub).
3. **Review & merge** the Pull Request on GitHub.
4. **Pull the latest code** on your Mac:
   ```bash
   cd zaldi-app
   git checkout build/next-platform-mvp
   git pull origin build/next-platform-mvp
   ```
5. **Ship it** using the right method above:
   - JS/UI change → `eas update` (instant)
   - Native change → `eas build` + `eas submit`
   - Backend change → run SQL / deploy function in Supabase
6. Tell users to reopen the app (for OTA) — done.

---

## 3. How to report a bug so it gets fixed fast

Include:
- **Which app** (customer / merchant / rider / admin)
- **Which screen** and what you tapped
- **What happened** vs **what you expected**
- A **screenshot** or screen recording if possible
- Whether it happens every time or sometimes

The clearer the report, the faster the fix.

---

## 4. Emergency rollback

If an OTA update causes a problem, you can republish the previous good update or
roll back the channel:
```bash
eas update --branch production --message "rollback" --republish
```
For a bad native build, just promote the previous working build in the store console.

---

## 5. Quick reference

| I want to change... | Method | User sees it |
|---|---|---|
| Text, price label, colour, layout, JS bug | `eas update` | Next app open |
| App icon / splash / name / permissions | `eas build` + `eas submit` | After store review |
| Commission %, fees, routing, DB rules | Run SQL in Supabase | Immediately |
| Payment/webhook logic | `supabase functions deploy` | Immediately |
| Admin dashboard | push to GitHub → host (Vercel) redeploys | Immediately |
