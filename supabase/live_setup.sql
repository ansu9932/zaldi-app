-- ============================================================
--  next — Live order-flow setup (run AFTER schema.sql + seed.sql)
--  Run in Supabase -> SQL Editor -> New query -> Run.
--  This enables the MVP order flow without per-user login.
--  (Policies are permissive for the MVP; tighten before public launch.)
-- ============================================================

-- Store customer name/phone directly on the order (no login needed for MVP)
alter table orders add column if not exists customer_name text;
alter table orders add column if not exists customer_phone text;

-- ---- Permissive policies so the 3 apps (using the anon key) can run the flow ----
drop policy if exists "customer orders" on orders;
drop policy if exists "customer create order" on orders;
drop policy if exists "merchant orders" on orders;
drop policy if exists "rider orders" on orders;
drop policy if exists "orders anon all" on orders;
create policy "orders anon all" on orders for all to anon, authenticated using (true) with check (true);

drop policy if exists "read own order items" on order_items;
drop policy if exists "order_items anon all" on order_items;
create policy "order_items anon all" on order_items for all to anon, authenticated using (true) with check (true);

drop policy if exists "own rider" on riders;
drop policy if exists "riders anon all" on riders;
create policy "riders anon all" on riders for all to anon, authenticated using (true) with check (true);

-- Make sure realtime is on for orders (safe to re-run)
do $$ begin
  alter publication supabase_realtime add table orders;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table order_items;
exception when duplicate_object then null; end $$;
