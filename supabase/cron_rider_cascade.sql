-- ============================================================
--  Zaldi — Automatic server-side rider cascade (pg_cron)
--  Run AFTER commission_and_assignment.sql.  Safe to re-run.
--
--  WHY: the nearest-rider waterfall reserves a new `ready` order for the closest
--  rider for ~45s. If that rider doesn't accept, the offer must move to the next
--  nearest rider. The rider app calls reassign_expired_offers() when it polls, but
--  that only works while a rider has the app open. This schedules it on the SERVER
--  so offers always cascade even if no rider is actively polling.
-- ============================================================

-- pg_cron ships with Supabase; enable it (no-op if already enabled).
create extension if not exists pg_cron;

-- Remove old schedules first so this file stays idempotent.
do $$
begin
  perform cron.unschedule('zaldi-rider-cascade');
exception when others then null;
end $$;
do $$
begin
  perform cron.unschedule('zaldi-expire-stale-orders');
exception when others then null;
end $$;

-- Cascade expired rider offers frequently. Supabase's pg_cron supports
-- sub-minute interval strings; if your version doesn't, change the schedule to
-- the standard cron string '* * * * *' (every minute).
select cron.schedule(
  'zaldi-rider-cascade',
  '30 seconds',
  $$ select reassign_expired_offers(); $$
);

-- Auto-cancel abandoned unpaid UPI orders every 5 minutes (function comes from
-- secure_setup_v2.sql). Wrapped so this file still works if it isn't installed.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'expire_stale_orders') then
    perform cron.schedule(
      'zaldi-expire-stale-orders',
      '*/5 * * * *',
      $$ select expire_stale_orders(); $$
    );
  end if;
end $$;

-- Check what's scheduled:  select jobname, schedule, active from cron.job;
