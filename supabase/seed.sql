-- ============================================================
--  "next" — Demo seed data (sample Contai shops + products)
--  Run AFTER schema.sql. Safe to re-run.
-- ============================================================

-- Sample shops around Contai (Kanthi) center
insert into shops (id, name, category, address, lat, lng, is_open) values
  ('11111111-1111-1111-1111-111111111111', 'Kanthi Fresh Mart', 'Groceries', 'Central Market, Contai', 21.7790, 87.7520, true),
  ('22222222-2222-2222-2222-222222222222', 'Contai Medico', 'Medicines', 'Hospital More, Contai', 21.7765, 87.7505, true),
  ('33333333-3333-3333-3333-333333333333', 'Snack Junction', 'Snacks', 'Station Road, Contai', 21.7802, 87.7540, true)
on conflict (id) do nothing;

-- Groceries
insert into products (shop_id, name, category, price, unit, in_stock) values
  ('11111111-1111-1111-1111-111111111111', 'Aashirvaad Atta', 'Groceries', 220, '5 kg', true),
  ('11111111-1111-1111-1111-111111111111', 'Sugar', 'Groceries', 48, '1 kg', true),
  ('11111111-1111-1111-1111-111111111111', 'Toor Dal', 'Groceries', 150, '1 kg', true),
  ('11111111-1111-1111-1111-111111111111', 'Fortune Oil', 'Groceries', 145, '1 L', true),
  ('11111111-1111-1111-1111-111111111111', 'Amul Milk', 'Groceries', 28, '500 ml', true),
  ('11111111-1111-1111-1111-111111111111', 'Farm Eggs', 'Groceries', 72, '6 pcs', true)
on conflict do nothing;

-- Medicines
insert into products (shop_id, name, category, price, unit, in_stock) values
  ('22222222-2222-2222-2222-222222222222', 'Paracetamol 500', 'Medicines', 30, '10 tabs', true),
  ('22222222-2222-2222-2222-222222222222', 'ORS Packet', 'Medicines', 22, '1 pc', true),
  ('22222222-2222-2222-2222-222222222222', 'Dettol Antiseptic', 'Medicines', 85, '100 ml', true),
  ('22222222-2222-2222-2222-222222222222', 'Band-Aid', 'Medicines', 40, '10 pcs', true)
on conflict do nothing;

-- Snacks
insert into products (shop_id, name, category, price, unit, in_stock) values
  ('33333333-3333-3333-3333-333333333333', 'Lays Chips', 'Snacks', 20, '52 g', true),
  ('33333333-3333-3333-3333-333333333333', 'Coca Cola', 'Snacks', 40, '750 ml', true),
  ('33333333-3333-3333-3333-333333333333', 'Parle-G', 'Snacks', 10, '1 pack', true),
  ('33333333-3333-3333-3333-333333333333', 'Maggi Noodles', 'Snacks', 14, '70 g', true)
on conflict do nothing;
