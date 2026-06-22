-- ============================================================
--  next — SECURITY HARDENING v2  (run AFTER schema.sql, staff.sql,
--  seed.sql, live_setup.sql, features.sql, push_setup.sql,
--  live_location.sql, orders_fix.sql and secure_setup.sql).
--
--  Safe to re-run (idempotent).
--
--  WHY THIS EXISTS
--  ----------------
--  Before this file, the apps used the anon key to INSERT orders directly and
--  sent the item prices, subtotal, discount and total from the phone. A tampered
--  client could therefore underpay (send price = ₹1, a fake coupon, etc.) and the
--  only check (enforce_order_total) just verified the numbers added up — not that
--  they were the REAL prices. This file closes that hole:
--
--   1. create_order() — the ONLY way to place an order now. It recomputes every
--      price from the products table, validates the coupon against the coupons
--      table, recomputes delivery / rain / surge fees and the total on the SERVER,
--      decrements stock, writes order_items WITH product_id, and returns a
--      4-digit delivery OTP. Runs as SECURITY DEFINER so it works without
--      per-user login while the client can no longer insert orders itself.
--   2. Direct INSERT on orders / order_items is revoked from the anon key.
--   3. Financial columns become immutable after an order is created (a client
--      can change status / rider location / payment_status, but never the money).
--   4. New columns: products.stock, orders.delivery_otp, orders.cancel_reason,
--      orders.delivered_at, ratings.shop_id / ratings.rider_id.
--   5. shop_ratings view (average rating + count per shop) for the storefront.
--   6. expire_stale_orders() — cancels abandoned unpaid (pending_payment) orders.
-- ============================================================

-- ---------- 0. New columns ----------
alter table products add column if not exists stock int;                 -- null = "not tracked" (unlimited)
alter table orders   add column if not exists delivery_otp  text;
alter table orders   add column if not exists cancel_reason text;
alter table orders   add column if not exists delivered_at  timestamptz;
alter table orders   add column if not exists razorpay_qr_id text;
alter table ratings  add column if not exists shop_id  uuid references shops(id) on delete set null;
alter table ratings  add column if not exists rider_id uuid;

-- ---------- 1. Pricing helpers (mirror apps/customer/lib/algorithms.ts) ----------
create or replace function nx_distance_km(lat1 double precision, lng1 double precision,
                                          lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

create or replace function nx_delivery_fee(km double precision)
returns numeric language sql immutable as $$
  -- BASE_DELIVERY_FEE = 25, FREE_DISTANCE_KM = 3, PER_KM_FEE = 8
  select case when km <= 3 then 25
              else 25 + ceil(km - 3) * 8 end::numeric;
$$;

create or replace function nx_eta_min(km double precision)
returns int language sql immutable as $$
  -- SHOP_PREP_MIN = 8, PICKUP_BUFFER_MIN = 5, AVG_RIDER_SPEED_KMPH = 20
  select round(8 + 5 + (km / 20.0) * 60)::int;
$$;

-- ---------- 2. The server-side order creator ----------
-- p_items is a JSON array: [{"product_id":"<uuid>","qty":2}, ...]
create or replace function create_order(
  p_shop_id        uuid,
  p_customer_name  text,
  p_customer_phone text,
  p_dropoff_address text,
  p_dropoff_lat    double precision,
  p_dropoff_lng    double precision,
  p_payment_method text,
  p_items          jsonb,
  p_coupon_code    text default null,
  p_tip            numeric default 0,
  p_is_raining     boolean default false,
  p_push_token     text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_item        jsonb;
  v_product     products%rowtype;
  v_qty         int;
  v_subtotal    numeric(10,2) := 0;
  v_shop        shops%rowtype;
  v_shop_lat    double precision;
  v_shop_lng    double precision;
  v_km          double precision;
  v_delivery    numeric(10,2);
  v_rain        numeric(10,2);
  v_surge       numeric(10,2) := 0;
  v_discount    numeric(10,2) := 0;
  v_tip         numeric(10,2) := greatest(0, coalesce(p_tip, 0));
  v_total       numeric(10,2);
  v_eta         int;
  v_otp         text;
  v_order_id    uuid;
  v_coupon      coupons%rowtype;
  v_status      text;
  v_pay_status  text;
begin
  -- ---- validate shop ----
  select * into v_shop from shops where id = p_shop_id;
  if not found then
    raise exception 'SHOP_NOT_FOUND';
  end if;
  if v_shop.is_open is distinct from true then
    raise exception 'SHOP_CLOSED';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- ---- price every line from the DB (never trust the client) ----
  v_order_id := uuid_generate_v4();

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, coalesce((v_item->>'qty')::int, 1));
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid and shop_id = p_shop_id;
    if not found then
      raise exception 'PRODUCT_NOT_FOUND: %', v_item->>'product_id';
    end if;
    if v_product.in_stock is distinct from true then
      raise exception 'OUT_OF_STOCK: %', v_product.name;
    end if;
    -- stock is optional; only enforce when the merchant tracks quantity
    if v_product.stock is not null then
      if v_product.stock < v_qty then
        raise exception 'OUT_OF_STOCK: %', v_product.name;
      end if;
      update products set stock = stock - v_qty where id = v_product.id;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_qty);
  end loop;

  -- ---- fees (recomputed server-side) ----
  v_shop_lat := coalesce(v_shop.lat, 21.7781);
  v_shop_lng := coalesce(v_shop.lng, 87.7517);
  v_km := greatest(0.5, nx_distance_km(v_shop_lat, v_shop_lng,
                                       coalesce(p_dropoff_lat, 21.7781),
                                       coalesce(p_dropoff_lng, 87.7517)));
  v_delivery := nx_delivery_fee(v_km);
  v_rain := case when p_is_raining then 15 else 0 end;
  v_eta := nx_eta_min(v_km);

  -- ---- coupon (validated against the coupons table) ----
  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select * into v_coupon from coupons
      where code = upper(trim(p_coupon_code)) and active = true;
    if found and v_subtotal >= v_coupon.min_subtotal then
      if v_coupon.type = 'flat' then
        v_discount := least(v_coupon.value, v_subtotal);
      elsif v_coupon.type = 'percent' then
        v_discount := round(v_subtotal * v_coupon.value / 100, 2);
        if v_coupon.max_discount is not null then
          v_discount := least(v_discount, v_coupon.max_discount);
        end if;
      elsif v_coupon.type = 'freeship' then
        v_discount := v_delivery;
      end if;
    else
      -- coupon does not apply → ignore it instead of failing the order
      p_coupon_code := null;
    end if;
  end if;

  v_total := greatest(0, v_subtotal + v_delivery + v_rain + v_surge - v_discount + v_tip);
  v_otp := lpad((floor(random() * 10000))::int::text, 4, '0');

  if lower(coalesce(p_payment_method, 'cod')) = 'cod' then
    v_status := 'placed';
    v_pay_status := 'cod';
  else
    v_status := 'pending_payment';
    v_pay_status := 'pending';
  end if;

  -- ---- insert the order (definer bypasses RLS) ----
  insert into orders (
    id, shop_id, customer_name, customer_phone,
    dropoff_address, dropoff_lat, dropoff_lng, distance_km,
    subtotal, delivery_fee, rain_fee, surge_fee, discount, tip_amount,
    coupon_code, push_token, total, payment_method, payment_status, status,
    eta_min, delivery_otp
  ) values (
    v_order_id, p_shop_id, p_customer_name, p_customer_phone,
    p_dropoff_address, p_dropoff_lat, p_dropoff_lng, round(v_km::numeric, 2),
    v_subtotal, v_delivery, v_rain, v_surge, v_discount, v_tip,
    case when p_coupon_code is not null then upper(trim(p_coupon_code)) else null end,
    p_push_token, v_total, lower(coalesce(p_payment_method, 'cod')), v_pay_status, v_status,
    v_eta, v_otp
  );

  -- ---- insert items WITH product_id ----
  insert into order_items (order_id, product_id, name, price, qty)
  select v_order_id,
         (it->>'product_id')::uuid,
         p.name,
         p.price,
         greatest(1, coalesce((it->>'qty')::int, 1))
  from jsonb_array_elements(p_items) it
  join products p on p.id = (it->>'product_id')::uuid;

  return jsonb_build_object(
    'id', v_order_id,
    'total', v_total,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery,
    'rain_fee', v_rain,
    'discount', v_discount,
    'tip', v_tip,
    'eta', v_eta,
    'otp', v_otp,
    'status', v_status
  );
end;
$$;

grant execute on function create_order(uuid, text, text, text, double precision, double precision,
  text, jsonb, text, numeric, boolean, text) to anon, authenticated;

-- ---------- 3. Lock down direct table inserts (force the RPC) ----------
-- Orders: keep read + update (status / payment / rider GPS / cancel), but NO
-- insert and NO delete from the anon key. New orders MUST go through create_order.
drop policy if exists "orders anon all" on orders;
drop policy if exists "orders read"   on orders;
drop policy if exists "orders update" on orders;
create policy "orders read"   on orders for select to anon, authenticated using (true);
create policy "orders update" on orders for update to anon, authenticated using (true) with check (true);

-- Order items: read only from the client; the RPC writes them.
drop policy if exists "order_items anon all" on order_items;
drop policy if exists "order_items read" on order_items;
create policy "order_items read" on order_items for select to anon, authenticated using (true);

-- ---------- 4. Financial columns are immutable after creation ----------
create or replace function nx_lock_order_money() returns trigger as $$
begin
  if new.subtotal     is distinct from old.subtotal
   or new.delivery_fee is distinct from old.delivery_fee
   or new.rain_fee     is distinct from old.rain_fee
   or new.surge_fee    is distinct from old.surge_fee
   or new.discount     is distinct from old.discount
   or new.tip_amount   is distinct from old.tip_amount
   or new.total        is distinct from old.total then
    raise exception 'Order financials cannot be modified after creation.';
  end if;
  -- stamp the delivery time once
  if new.status = 'delivered' and old.status <> 'delivered' then
    new.delivered_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_lock_order_money on orders;
create trigger trg_lock_order_money
  before update on orders
  for each row execute function nx_lock_order_money();

-- ---------- 5. Shop ratings view ----------
-- Auto-fill ratings.shop_id / rider_id from the order so the client only needs
-- to send the order_id when rating.
create or replace function nx_fill_rating_refs() returns trigger as $$
begin
  if new.shop_id is null or new.rider_id is null then
    select o.shop_id, o.rider_id into new.shop_id, new.rider_id
    from orders o where o.id = new.order_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_fill_rating_refs on ratings;
create trigger trg_fill_rating_refs
  before insert on ratings
  for each row execute function nx_fill_rating_refs();

create or replace view shop_ratings as
  select o.shop_id,
         round(avg(r.rating)::numeric, 1) as avg_rating,
         count(*)                         as rating_count
  from ratings r
  join orders o on o.id = r.order_id
  where o.shop_id is not null
  group by o.shop_id;
grant select on shop_ratings to anon, authenticated;

-- ---------- 6. Expire abandoned unpaid orders ----------
-- Cancels UPI orders that were never paid within 30 minutes so they do not
-- linger as ghost orders. Call from a scheduled job (pg_cron) or manually.
create or replace function expire_stale_orders() returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with expired as (
    update orders
      set status = 'cancelled',
          cancel_reason = 'Payment not completed',
          updated_at = now()
    where status = 'pending_payment'
      and payment_status <> 'paid'
      and created_at < now() - interval '30 minutes'
    returning 1
  )
  select count(*) into v_count from expired;
  return v_count;
end;
$$;
grant execute on function expire_stale_orders() to anon, authenticated;

notify pgrst, 'reload schema';
