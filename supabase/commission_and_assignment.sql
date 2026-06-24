-- ============================================================
--  Zaldi — COMMISSION + SMART ASSIGNMENT  (run AFTER secure_setup_v2.sql)
--
--  Safe to re-run (idempotent).
--
--  WHAT THIS ADDS
--  --------------
--   1. A fair "everyone wins" money split on every order, computed server-side:
--        - merchant keeps (1 - commission) of the item subtotal
--        - rider gets a guaranteed base + per-km payout (+ 100% of the tip)
--        - platform keeps a small commission + handling fee + delivery margin
--      New order columns: platform_fee, merchant_commission_rate,
--      merchant_commission, merchant_payout, rider_payout, platform_revenue,
--      platform_net.  (See BUSINESS_MODEL.md for the rationale + worked example.)
--   2. Free delivery above a basket threshold (nudges bigger, profitable carts).
--   3. Nearest-store routing helper: find_nearest_shops_for_items().
--   4. Nearest-rider waterfall: when an order becomes 'ready' it is offered to the
--      closest online+free rider first (with a nudge for just-freed riders); the
--      offer opens up to the next nearest after a short window.
--      New columns: orders.preferred_rider_id, orders.offer_expires_at,
--      staff.lat, staff.lng, staff.last_delivered_at, staff.is_online.
-- ============================================================

-- ---------- 0. Tunable rates (mirror apps/customer/lib/commission.ts) ----------
create or replace function nx_merchant_commission_rate() returns numeric language sql immutable as $$ select 0.12::numeric $$;
create or replace function nx_platform_fee()            returns numeric language sql immutable as $$ select 7::numeric    $$;
create or replace function nx_rider_base_payout()       returns numeric language sql immutable as $$ select 18::numeric   $$;
create or replace function nx_rider_per_km()            returns numeric language sql immutable as $$ select 6::numeric    $$;
create or replace function nx_payment_gateway_rate()    returns numeric language sql immutable as $$ select 0.02::numeric $$;
create or replace function nx_free_delivery_subtotal()  returns numeric language sql immutable as $$ select 399::numeric  $$;
create or replace function nx_rider_offer_window_sec()  returns int     language sql immutable as $$ select 45           $$;
-- riders idle <= this many minutes get a small priority bonus (in km-equivalent)
create or replace function nx_recently_freed_min()      returns int     language sql immutable as $$ select 10           $$;
create or replace function nx_recently_freed_bonus_km() returns numeric language sql immutable as $$ select 0.8::numeric  $$;

create or replace function nx_rider_payout(km double precision)
returns numeric language sql immutable as $$
  select round(nx_rider_base_payout() + nx_rider_per_km() * greatest(0, km))::numeric;
$$;

-- ---------- 1. New columns ----------
alter table orders add column if not exists platform_fee           numeric(10,2) not null default 0;
alter table orders add column if not exists merchant_commission_rate numeric(5,4) not null default 0;
alter table orders add column if not exists merchant_commission     numeric(10,2) not null default 0;
alter table orders add column if not exists merchant_payout         numeric(10,2) not null default 0;
alter table orders add column if not exists rider_payout            numeric(10,2) not null default 0;
alter table orders add column if not exists platform_revenue        numeric(10,2) not null default 0;  -- gross
alter table orders add column if not exists platform_net            numeric(10,2) not null default 0;  -- after rider + discount + gateway
alter table orders add column if not exists preferred_rider_id      uuid;
alter table orders add column if not exists offer_expires_at        timestamptz;

alter table staff  add column if not exists lat               double precision;
alter table staff  add column if not exists lng               double precision;
alter table staff  add column if not exists last_delivered_at timestamptz;
alter table staff  add column if not exists is_online         boolean default true;

-- ---------- 1b. Make the order-total integrity check platform-fee aware ----------
-- secure_setup.sql installs enforce_order_total() WITHOUT platform_fee. Since we
-- now add a platform fee to the total, redefine it here so valid orders aren't
-- rejected. (No-op if secure_setup.sql was never run.)
create or replace function enforce_order_total() returns trigger as $$
declare expected numeric(10,2);
begin
  expected := coalesce(new.subtotal,0) + coalesce(new.delivery_fee,0)
            + coalesce(new.platform_fee,0) + coalesce(new.rain_fee,0)
            + coalesce(new.surge_fee,0) + coalesce(new.tip_amount,0)
            - coalesce(new.discount,0);
  if round(new.total, 2) <> round(expected, 2) then
    raise exception 'Order total % does not match expected %', new.total, expected;
  end if;
  return new;
end;
$$ language plpgsql;

-- ---------- 2. The order creator (commission-aware, nearest-shop aware) ----------
-- Same public signature as secure_setup_v2.sql so the apps keep working, but now
-- it also: applies free delivery, computes the full money split, and (when
-- p_shop_id is null) auto-routes to the nearest open store that stocks the items.
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
  v_shop_id     uuid := p_shop_id;
  v_shop_lat    double precision;
  v_shop_lng    double precision;
  v_km          double precision;
  v_delivery    numeric(10,2);
  v_platform_fee numeric(10,2);
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
  v_pay_method  text := lower(coalesce(p_payment_method, 'cod'));
  -- commission split
  v_comm_rate   numeric(5,4) := nx_merchant_commission_rate();
  v_commission  numeric(10,2);
  v_merch_pay   numeric(10,2);
  v_rider_pay   numeric(10,2);
  v_plat_gross  numeric(10,2);
  v_gateway     numeric(10,2);
  v_plat_net    numeric(10,2);
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- ---- nearest-store routing: if no shop was given, pick the nearest open
  -- store that can fulfil the basket (matched by product name) ----
  if v_shop_id is null then
    select s.id into v_shop_id
    from shops s
    where s.is_open = true
      and not exists (
        select 1 from jsonb_array_elements(p_items) it
        where not exists (
          select 1 from products p
          where p.shop_id = s.id and p.in_stock = true
            and p.name = (
              select name from products where id = (it->>'product_id')::uuid
            )
        )
      )
    order by nx_distance_km(s.lat, s.lng,
                            coalesce(p_dropoff_lat, 21.7781),
                            coalesce(p_dropoff_lng, 87.7517)) asc
    limit 1;
    if v_shop_id is null then
      raise exception 'NO_STORE_CAN_FULFIL';
    end if;
  end if;

  -- ---- validate shop ----
  select * into v_shop from shops where id = v_shop_id;
  if not found then
    raise exception 'SHOP_NOT_FOUND';
  end if;
  if v_shop.is_open is distinct from true then
    raise exception 'SHOP_CLOSED';
  end if;

  -- ---- price every line from the DB (never trust the client) ----
  v_order_id := uuid_generate_v4();

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, coalesce((v_item->>'qty')::int, 1));
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid and shop_id = v_shop_id;
    if not found then
      raise exception 'PRODUCT_NOT_FOUND: %', v_item->>'product_id';
    end if;
    if v_product.in_stock is distinct from true then
      raise exception 'OUT_OF_STOCK: %', v_product.name;
    end if;
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
  -- Free delivery above the threshold; otherwise the distance-based fee.
  if v_subtotal >= nx_free_delivery_subtotal() then
    v_delivery := 0;
  else
    v_delivery := nx_delivery_fee(v_km);
  end if;
  v_platform_fee := case when v_subtotal > 0 then nx_platform_fee() else 0 end;
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
      p_coupon_code := null;
    end if;
  end if;

  v_total := greatest(0, v_subtotal + v_delivery + v_platform_fee + v_rain + v_surge - v_discount + v_tip);
  v_otp := lpad((floor(random() * 10000))::int::text, 4, '0');

  -- ---- the "everyone wins" money split ----
  v_commission := round(v_subtotal * v_comm_rate, 2);
  v_merch_pay  := round(v_subtotal - v_commission, 2);
  v_rider_pay  := nx_rider_payout(v_km);                       -- tip paid 100% on top
  v_plat_gross := round(v_commission + v_platform_fee + v_delivery + v_rain + v_surge, 2);
  v_gateway    := case when v_pay_method = 'upi' then round(v_total * nx_payment_gateway_rate(), 2) else 0 end;
  v_plat_net   := round(v_plat_gross - v_rider_pay - v_discount - v_gateway, 2);

  if v_pay_method = 'cod' then
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
    subtotal, delivery_fee, platform_fee, rain_fee, surge_fee, discount, tip_amount,
    coupon_code, push_token, total, payment_method, payment_status, status,
    eta_min, delivery_otp,
    merchant_commission_rate, merchant_commission, merchant_payout,
    rider_payout, platform_revenue, platform_net
  ) values (
    v_order_id, v_shop_id, p_customer_name, p_customer_phone,
    p_dropoff_address, p_dropoff_lat, p_dropoff_lng, round(v_km::numeric, 2),
    v_subtotal, v_delivery, v_platform_fee, v_rain, v_surge, v_discount, v_tip,
    case when p_coupon_code is not null then upper(trim(p_coupon_code)) else null end,
    p_push_token, v_total, v_pay_method, v_pay_status, v_status,
    v_eta, v_otp,
    v_comm_rate, v_commission, v_merch_pay,
    v_rider_pay, v_plat_gross, v_plat_net
  );

  insert into order_items (order_id, product_id, name, price, qty)
  select v_order_id,
         (it->>'product_id')::uuid,
         p.name, p.price,
         greatest(1, coalesce((it->>'qty')::int, 1))
  from jsonb_array_elements(p_items) it
  join products p on p.id = (it->>'product_id')::uuid;

  return jsonb_build_object(
    'id', v_order_id, 'shop_id', v_shop_id, 'total', v_total, 'subtotal', v_subtotal,
    'delivery_fee', v_delivery, 'platform_fee', v_platform_fee, 'rain_fee', v_rain,
    'discount', v_discount, 'tip', v_tip, 'eta', v_eta, 'otp', v_otp, 'status', v_status,
    'merchant_payout', v_merch_pay, 'rider_payout', v_rider_pay, 'platform_net', v_plat_net
  );
end;
$$;

grant execute on function create_order(uuid, text, text, text, double precision, double precision,
  text, jsonb, text, numeric, boolean, text) to anon, authenticated;

-- ---------- 3. Lock the new money columns after creation ----------
create or replace function nx_lock_order_money() returns trigger as $$
begin
  if new.subtotal      is distinct from old.subtotal
   or new.delivery_fee is distinct from old.delivery_fee
   or new.platform_fee is distinct from old.platform_fee
   or new.rain_fee     is distinct from old.rain_fee
   or new.surge_fee    is distinct from old.surge_fee
   or new.discount     is distinct from old.discount
   or new.tip_amount   is distinct from old.tip_amount
   or new.total        is distinct from old.total
   or new.merchant_commission is distinct from old.merchant_commission
   or new.merchant_payout     is distinct from old.merchant_payout
   or new.rider_payout        is distinct from old.rider_payout
   or new.platform_revenue    is distinct from old.platform_revenue
   or new.platform_net        is distinct from old.platform_net then
    raise exception 'Order financials cannot be modified after creation.';
  end if;
  if new.status = 'delivered' and old.status <> 'delivered' then
    new.delivered_at := now();
    -- record that this rider just went free (for nearest-rider routing)
    if new.rider_id is not null then
      update staff set last_delivered_at = now() where id = new.rider_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_lock_order_money on orders;
create trigger trg_lock_order_money
  before update on orders
  for each row execute function nx_lock_order_money();

-- ---------- 4. Nearest-store routing helper (for admin / manual use) ----------
-- Returns open stores that stock EVERY requested product name, nearest first.
create or replace function find_nearest_shops_for_items(
  p_items jsonb, p_lat double precision, p_lng double precision
) returns table(shop_id uuid, name text, distance_km double precision)
language sql stable as $$
  select s.id, s.name,
         round(nx_distance_km(s.lat, s.lng, coalesce(p_lat,21.7781), coalesce(p_lng,87.7517))::numeric, 2)::double precision
  from shops s
  where s.is_open = true
    and not exists (
      select 1 from jsonb_array_elements(p_items) it
      where not exists (
        select 1 from products p
        where p.shop_id = s.id and p.in_stock = true
          and p.name = (select name from products where id = (it->>'product_id')::uuid)
      )
    )
  order by 3 asc;
$$;
grant execute on function find_nearest_shops_for_items(jsonb, double precision, double precision) to anon, authenticated;

-- ---------- 5. Nearest-rider waterfall assignment ----------
-- Pick the best rider to offer this order to first: online + free (no active
-- delivery), with a known recent location, ranked by distance to the PICKUP
-- store, minus a small bonus for riders who just finished a delivery.
create or replace function assign_preferred_rider(p_order_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_shop_lat double precision;
  v_shop_lng double precision;
  v_rider    uuid;
begin
  select sh.lat, sh.lng into v_shop_lat, v_shop_lng
  from orders o join shops sh on sh.id = o.shop_id
  where o.id = p_order_id;
  if v_shop_lat is null then return null; end if;

  select st.id into v_rider
  from staff st
  where st.role = 'rider'
    and st.active = true
    and coalesce(st.is_online, true) = true
    and st.lat is not null and st.lng is not null
    -- "free" = not currently on another active delivery
    and not exists (
      select 1 from orders o2
      where o2.rider_id = st.id and o2.status in ('assigned','picked_up')
    )
  order by
    nx_distance_km(st.lat, st.lng, v_shop_lat, v_shop_lng)
    - case when st.last_delivered_at is not null
            and st.last_delivered_at > now() - make_interval(mins => nx_recently_freed_min())
           then nx_recently_freed_bonus_km() else 0 end
    asc
  limit 1;

  update orders
    set preferred_rider_id = v_rider,
        offer_expires_at   = now() + make_interval(secs => nx_rider_offer_window_sec()),
        updated_at         = now()
  where id = p_order_id;

  return v_rider;
end;
$$;
grant execute on function assign_preferred_rider(uuid) to anon, authenticated;

-- When an order becomes 'ready', immediately offer it to the nearest rider.
create or replace function nx_offer_on_ready() returns trigger as $$
begin
  if new.status = 'ready' and old.status is distinct from 'ready' and new.rider_id is null then
    perform assign_preferred_rider(new.id);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_offer_on_ready on orders;
create trigger trg_offer_on_ready
  after update on orders
  for each row execute function nx_offer_on_ready();

-- Cascade: move expired offers to the NEXT nearest rider. Call from the app on a
-- poll, or from pg_cron. Returns how many orders were re-offered.
create or replace function reassign_expired_offers() returns int
language plpgsql security definer set search_path = public as $$
declare v_row record; v_count int := 0;
begin
  for v_row in
    select id from orders
    where status = 'ready' and rider_id is null
      and offer_expires_at is not null and offer_expires_at < now()
  loop
    perform assign_preferred_rider(v_row.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
grant execute on function reassign_expired_offers() to anon, authenticated;

notify pgrst, 'reload schema';
