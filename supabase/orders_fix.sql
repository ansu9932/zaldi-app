-- next — allow assigning an order to a staff rider, and lock it to one rider.
-- Run in Supabase SQL Editor.
alter table orders drop constraint if exists orders_rider_id_fkey;
notify pgrst, 'reload schema';
