-- 031_cron_runs.sql
-- Cron observability ledger. Each invocation writes a row on start and updates
-- it on finish (status, ended_at, rows_affected, error, metadata). Without
-- this, silent failures or skipped schedules are invisible until a user
-- complains about a missed email.
--
-- No RLS policies: service-role only (admin UI reads via admin client).

create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'running' check (status in ('running', 'ok', 'failed', 'skipped')),
  rows_affected int,
  error text,
  metadata jsonb
);

create index if not exists cron_runs_name_started_idx
  on public.cron_runs (name, started_at desc);
create index if not exists cron_runs_failed_idx
  on public.cron_runs (started_at desc) where status = 'failed';

alter table public.cron_runs enable row level security;
-- (no policies → service role only)

comment on table public.cron_runs is
  'Observability ledger for cron jobs. Wrapped by runCron() helper.';
