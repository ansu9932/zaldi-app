-- next — staff accounts for Merchant & Rider apps (created/reset by owner in Admin).
-- Run in Supabase SQL Editor. (MVP: passwords are plain text + anon access;
-- we will hash + lock this down before public launch.)

create extension if not exists "uuid-ossp";

create table if not exists staff (
  id uuid primary key default uuid_generate_v4(),
  role text not null check (role in ('merchant', 'rider')),
  name text not null,
  username text unique not null,
  password text not null,
  shop_id uuid references shops(id) on delete set null,
  active boolean default true,
  created_at timestamptz default now()
);

alter table staff enable row level security;
drop policy if exists "staff anon all" on staff;
create policy "staff anon all" on staff for all to anon, authenticated using (true) with check (true);

notify pgrst, 'reload schema';
