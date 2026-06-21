-- ============================================================
--  "next" — Supabase database schema
--  Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ---------- ENUM types ----------
do $$ begin
  create type user_role as enum ('customer', 'merchant', 'rider', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum (
    'pending_payment', 'placed', 'accepted', 'ready',
    'assigned', 'picked_up', 'delivered', 'cancelled'
  );
exception when duplicate_object then null; end $$;

-- ---------- PROFILES (extends Supabase auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  full_name text,
  phone text,
  created_at timestamptz default now()
);

-- ---------- SHOPS (partner merchants) ----------
create table if not exists shops (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references profiles(id) on delete set null,
  name text not null,
  category text,                       -- Groceries / Medicines / Snacks
  address text,
  lat double precision not null,
  lng double precision not null,
  is_open boolean default true,
  created_at timestamptz default now()
);

-- ---------- PRODUCTS ----------
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid references shops(id) on delete cascade,
  name text not null,
  category text,
  price numeric(10,2) not null,
  unit text,                           -- e.g. "1 kg", "500 ml"
  image_url text,
  in_stock boolean default true,
  created_at timestamptz default now()
);

-- ---------- RIDERS ----------
create table if not exists riders (
  id uuid primary key references profiles(id) on delete cascade,
  is_online boolean default false,
  is_free boolean default true,
  lat double precision,
  lng double precision,
  updated_at timestamptz default now()
);

-- ---------- ORDERS ----------
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references profiles(id) on delete set null,
  shop_id uuid references shops(id) on delete set null,
  rider_id uuid references riders(id) on delete set null,
  status order_status not null default 'pending_payment',

  -- delivery location
  dropoff_address text,
  dropoff_lat double precision,
  dropoff_lng double precision,
  distance_km numeric(6,2),

  -- money
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  rain_fee numeric(10,2) not null default 0,
  surge_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_method text not null default 'cod',   -- 'upi' | 'cod'
  payment_status text not null default 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,

  eta_min int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  name text not null,
  price numeric(10,2) not null,
  qty int not null
);

-- ---------- PAYOUTS (to shops and riders) ----------
create table if not exists payouts (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete set null,
  payee_type text not null,            -- 'shop' | 'rider'
  payee_id uuid,
  amount numeric(10,2) not null,
  status text not null default 'pending',  -- pending | paid
  created_at timestamptz default now()
);

-- ============================================================
--  Row Level Security (RLS) — protect each user's data
-- ============================================================
alter table profiles enable row level security;
alter table shops enable row level security;
alter table products enable row level security;
alter table riders enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payouts enable row level security;

-- Profiles: a user can read/update only their own profile
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Shops & products: everyone can read (browse); merchants manage their own
drop policy if exists "read shops" on shops;
create policy "read shops" on shops for select using (true);
drop policy if exists "merchant manage shops" on shops;
create policy "merchant manage shops" on shops
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "read products" on products;
create policy "read products" on products for select using (true);
drop policy if exists "merchant manage products" on products;
create policy "merchant manage products" on products
  for all using (
    exists (select 1 from shops s where s.id = products.shop_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from shops s where s.id = products.shop_id and s.owner_id = auth.uid())
  );

-- Orders: customer sees own orders; merchant sees orders for their shop;
-- rider sees assigned orders.
drop policy if exists "customer orders" on orders;
create policy "customer orders" on orders
  for select using (auth.uid() = customer_id);
drop policy if exists "customer create order" on orders;
create policy "customer create order" on orders
  for insert with check (auth.uid() = customer_id);

drop policy if exists "merchant orders" on orders;
create policy "merchant orders" on orders
  for all using (
    exists (select 1 from shops s where s.id = orders.shop_id and s.owner_id = auth.uid())
  );

drop policy if exists "rider orders" on orders;
create policy "rider orders" on orders
  for all using (auth.uid() = rider_id);

-- Order items follow their order
drop policy if exists "read own order items" on order_items;
create policy "read own order items" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_items.order_id
            and (o.customer_id = auth.uid() or o.rider_id = auth.uid()
                 or exists (select 1 from shops s where s.id = o.shop_id and s.owner_id = auth.uid())))
  );

-- Riders manage their own record
drop policy if exists "own rider" on riders;
create policy "own rider" on riders
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- NOTE: the Admin dashboard uses the service_role key on the server side,
-- which bypasses RLS, so admins can see/manage everything safely.

-- ---------- realtime ----------
-- Enable realtime so merchant/rider apps get instant order updates.
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
