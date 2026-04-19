-- Consolidated RLS policies documentation and feature gates

-- Feature gate: advanced certifications only for pro+ plans
-- This is enforced at application level (Next.js) but documented here

-- View for subscription check (used in application)
create or replace view user_subscription_plan as
select
  auth.uid() as user_id,
  coalesce(s.plan, 'free') as plan,
  coalesce(s.status, 'active') as status,
  s.current_period_end,
  s.cancel_at_period_end
from subscriptions s
where s.user_id = auth.uid();

-- Grant access to the view
grant select on user_subscription_plan to authenticated;

-- Profile access policy (already in 002, documented here)
-- policies on profiles: self-only (user can only read/write their own profile)

-- Service role bypass: all tables accessible by service role
-- (used for admin operations, crons, etc.)
