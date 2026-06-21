-- ============================================================
--  next — Feature migration (coupons, tips, ratings, favorites support,
--  staff phone + online status). Run in Supabase -> SQL Editor.
--  Safe to re-run (idempotent).
-- ============================================================

-- ---- Orders: coupon / tip / discount ----
alter table orders add column if not exists discount    numeric(10,2) not null default 0;
alter table orders add column if not exists tip_amount   numeric(10,2) not null default 0;
alter table orders add column if not exists coupon_code  text;

-- ---- Staff: phone (so customers can call the rider) + online status ----
alter table staff add column if not exists phone     text;
alter table staff add column if not exists is_online boolean default false;

-- ---- Coupons ----
create table if not exists coupons (
  code         text primary key,
  type         text not null check (type in ('flat', 'percent', 'freeship')),
  value        numeric(10,2) not null default 0,  -- flat: rupees, percent: 0-100
  min_subtotal numeric(10,2) not null default 0,
  max_discount numeric(10,2),                     -- cap for percent coupons
  label        text,
  active       boolean default true,
  created_at   timestamptz default now()
);

insert into coupons (code, type, value, min_subtotal, max_discount, label) values
  ('NEXT50',   'flat',     50, 199, null, '₹50 off orders above ₹199'),
  ('SAVE10',   'percent',  10, 150, 60,   '10% off (up to ₹60)'),
  ('FREESHIP', 'freeship',  0, 250, null, 'Free delivery above ₹250')
on conflict (code) do nothing;

-- ---- Ratings (customer feedback on a delivered order) ----
create table if not exists ratings (
  id         uuid primary key default uuid_generate_v4(),
  order_id   uuid references orders(id) on delete cascade,
  rating     int not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz default now()
);

-- ---- MVP access (same permissive model as live_setup.sql; tighten in secure_setup.sql) ----
alter table coupons enable row level security;
drop policy if exists "coupons read" on coupons;
create policy "coupons read" on coupons for select to anon, authenticated using (true);

alter table ratings enable row level security;
drop policy if exists "ratings anon all" on ratings;
create policy "ratings anon all" on ratings for all to anon, authenticated using (true) with check (true);

notify pgrst, 'reload schema';
