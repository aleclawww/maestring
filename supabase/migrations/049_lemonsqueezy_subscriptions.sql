-- Migration 049: Add Lemon Squeezy columns to subscriptions
--
-- We're switching billing from Stripe to Lemon Squeezy (Merchant of Record
-- model — no Spanish autónomo registration needed). Stripe columns are kept
-- for backward compatibility during the transition; nothing reads them after
-- this migration but we don't drop until we're sure no rollback is needed.

alter table subscriptions
  add column if not exists ls_subscription_id text,
  add column if not exists ls_customer_id     text,
  add column if not exists ls_variant_id      text,
  add column if not exists ls_order_id        text;

-- Unique constraint on the LS sub id so the webhook upsert can never create
-- two rows for the same LS subscription. Index also speeds up the rare
-- lookup-by-LS-id path (used by the customer portal endpoint).
create unique index if not exists idx_subscriptions_ls_subscription_id
  on subscriptions (ls_subscription_id) where ls_subscription_id is not null;

create index if not exists idx_subscriptions_ls_customer_id
  on subscriptions (ls_customer_id) where ls_customer_id is not null;

comment on column subscriptions.ls_subscription_id is
  'Lemon Squeezy subscription resource ID (data.id from /v1/subscriptions). Populated by the LS webhook handler.';
comment on column subscriptions.ls_customer_id is
  'Lemon Squeezy customer ID — used to render the self-service portal URL.';
comment on column subscriptions.ls_variant_id is
  'Which LS Variant the user is subscribed to. Maps to STRIPE_PRICE_PRO_MONTHLY equivalent.';
comment on column subscriptions.ls_order_id is
  'Initial LS order that created the subscription. Useful for refund/dispute tracking.';
