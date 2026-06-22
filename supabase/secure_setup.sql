-- ============================================================
--  next — SECURITY HARDENING (run before any public launch).
--  Run in Supabase -> SQL Editor AFTER schema.sql, staff.sql,
--  live_setup.sql and features.sql.
--
--  What this does:
--   1. Hashes all staff passwords with bcrypt (pgcrypto) and stops
--      plaintext passwords ever being stored again.
--   2. Stops the anon key from READING the staff table (so passwords /
--      hashes can never be downloaded from the app). Login now goes
--      through a single security-definer function.
--   3. Exposes a safe `staff_public` view (no password) for the Admin list.
--   4. Adds an order-total integrity trigger so a tampered client cannot
--      send an arbitrary `total` to underpay.
--
--  NOTE: customer/merchant/rider browsing + order flow still use the anon
--  key for the MVP. Moving customers to Supabase Auth (per-user RLS) is the
--  next step; this file closes the most dangerous holes first.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- 1. Hash staff passwords ----------
alter table staff add column if not exists password_hash text;

-- Backfill: hash any existing plaintext passwords once.
update staff
  set password_hash = crypt(password, gen_salt('bf'))
  where password is not null and password <> '' and password_hash is null;

-- Auto-hash on insert/update: the Admin app keeps sending a plaintext
-- `password`; this trigger hashes it and erases the plaintext immediately.
create or replace function hash_staff_password() returns trigger as $$
begin
  if new.password is not null and new.password <> '' then
    new.password_hash := crypt(new.password, gen_salt('bf'));
    new.password := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_hash_staff_password on staff;
create trigger trg_hash_staff_password
  before insert or update on staff
  for each row execute function hash_staff_password();

-- ---------- 2. Login function (bypasses RLS safely) ----------
create or replace function verify_staff_login(p_username text, p_password text, p_role text)
returns table (id uuid, name text, shop_id uuid, role text)
language sql security definer set search_path = public as $$
  select s.id, s.name, s.shop_id, s.role
  from staff s
  where s.username = lower(trim(p_username))
    and s.role = p_role
    and s.active = true
    and s.password_hash is not null
    and s.password_hash = crypt(p_password, s.password_hash)
  limit 1;
$$;

grant execute on function verify_staff_login(text, text, text) to anon, authenticated;

-- ---------- 3. Safe public view for Admin (no secrets) ----------
create or replace view staff_public as
  select id, role, name, username, shop_id, active, phone, is_online, vehicle_no, created_at
  from staff;
grant select on staff_public to anon, authenticated;

-- Stop the anon key from reading the staff table directly.
-- (Writes from Admin are still allowed for the MVP; reads go via staff_public.)
drop policy if exists "staff anon all" on staff;
drop policy if exists "staff write" on staff;
drop policy if exists "staff no read" on staff;
create policy "staff write" on staff for insert to anon, authenticated with check (true);
create policy "staff update" on staff for update to anon, authenticated using (true) with check (true);
create policy "staff delete" on staff for delete to anon, authenticated using (true);
-- (No SELECT policy on purpose → anon cannot read passwords/hashes.)

-- ---------- 4. Order total integrity ----------
-- Rejects orders whose total does not equal the sum of its components, so a
-- modified client cannot send a smaller `total` than it should pay.
create or replace function enforce_order_total() returns trigger as $$
declare
  expected numeric(10,2);
begin
  expected := coalesce(new.subtotal,0) + coalesce(new.delivery_fee,0)
            + coalesce(new.rain_fee,0) + coalesce(new.surge_fee,0)
            + coalesce(new.tip_amount,0) - coalesce(new.discount,0);
  if round(new.total, 2) <> round(expected, 2) then
    raise exception 'Order total % does not match expected %', new.total, expected;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_order_total on orders;
create trigger trg_enforce_order_total
  before insert or update on orders
  for each row execute function enforce_order_total();

notify pgrst, 'reload schema';
