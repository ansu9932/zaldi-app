-- next — live rider location columns (run in Supabase SQL Editor)
alter table orders add column if not exists rider_lat double precision;
alter table orders add column if not exists rider_lng double precision;
notify pgrst, 'reload schema';
