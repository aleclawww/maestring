-- 027_stripe_events.sql
-- Idempotency ledger for Stripe webhooks. Stripe retries failed/slow deliveries
-- for up to ~3 days; without this table a duplicate delivery can double-apply
-- a checkout, create a phantom subscription, or fire a welcome email twice.

create table if not exists public.stripe_events (
  id text primary key,                                   -- Stripe event.id (evt_...)
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

create index if not exists stripe_events_type_idx on public.stripe_events (type);
create index if not exists stripe_events_received_at_idx on public.stripe_events (received_at desc);

-- Table is service-role only; no RLS surface is exposed to end users.
alter table public.stripe_events enable row level security;
-- (No policies = nothing readable via anon/authed roles.)

comment on table public.stripe_events is
  'Stripe webhook idempotency ledger. Insert-if-new before processing; presence of a row means the event was already received.';
