-- ============================================================
--  next — Push notification setup. Run in Supabase -> SQL Editor.
--  (Safe to re-run.) After this, deploy the edge function:
--     supabase functions deploy notify-order --no-verify-jwt
-- ============================================================

-- Where to send the customer's order updates (Expo push token).
alter table orders add column if not exists push_token text;

-- Where to send merchant "new order" and rider "new job" alerts.
alter table staff add column if not exists push_token text;

notify pgrst, 'reload schema';
