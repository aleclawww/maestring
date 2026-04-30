-- Migration 044: Harden subscriptions RLS — make Stripe columns immutable
--
-- The existing "subscriptions_self" policy uses `using (user_id = auth.uid())`
-- which governs both SELECT and UPDATE (Supabase RLS default). This means an
-- authenticated user can PATCH their own subscriptions row via PostgREST and
-- overwrite stripe_customer_id or stripe_subscription_id to arbitrary values.
--
-- This does NOT grant free Pro access (the plan/status columns are updated only
-- by the service-role webhook handler, not by an RLS UPDATE), but it can:
--   1. Orphan the user's billing link — billing portal stops working.
--   2. Point stripe_customer_id at another user's customer (unique constraint
--      violation if that customer is already linked, or silent corruption if not).
--
-- Fix: replace the permissive UPDATE path with a restrictive policy that only
-- allows changes to non-Stripe columns, and revoke UPDATE on Stripe columns
-- entirely from the authenticated role.
--
-- All writes to stripe_* columns must go through service_role (webhook handler).

-- Drop the implicit UPDATE permission from the existing read-level policy.
-- The existing policy only needs to govern SELECT for the user's own row.
drop policy if exists "subscriptions_self" on subscriptions;

create policy "subscriptions_select_self"
  on subscriptions
  for select
  using (user_id = auth.uid());

-- Prevent authenticated users from updating any columns on their own subscription.
-- All subscription mutations go through the service-role webhook handler.
-- If application code ever needs a user-initiated update (e.g. cancel_at_period_end
-- toggle), that should go through an authenticated API route using the admin client,
-- not direct PostgREST mutations.
revoke update on subscriptions from authenticated;

-- service_role retains full access (used by webhook handlers and admin routes).
grant select, insert, update, delete on subscriptions to service_role;
