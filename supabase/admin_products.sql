-- next — allow the Admin dashboard (anon key) to manage products (MVP).
-- Tighten with admin auth before public launch.
drop policy if exists "merchant manage products" on products;
drop policy if exists "products anon all" on products;
create policy "products anon all" on products for all to anon, authenticated using (true) with check (true);
notify pgrst, 'reload schema';
