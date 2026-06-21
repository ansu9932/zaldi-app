-- next — let the Admin dashboard manage shops (with pickup location). MVP policy.
drop policy if exists "merchant manage shops" on shops;
drop policy if exists "shops anon all" on shops;
create policy "shops anon all" on shops for all to anon, authenticated using (true) with check (true);
notify pgrst, 'reload schema';
