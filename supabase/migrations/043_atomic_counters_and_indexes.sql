-- Migration 043: Atomic session counters, quota race fix, LLM usage indexes
--
-- Fixes three concurrency and performance issues found during pre-launch audit:
--
--   1. increment_session_counters() — replaces a read-modify-write pattern in
--      the evaluate route with a single atomic SQL UPDATE. The previous JS-side
--      arithmetic (`session.questions_answered + 1`) raced when two answers
--      arrived concurrently for the same session: both reads saw the same value
--      and one increment was silently lost.
--
--   2. consume_llm_quota() — rewrite as a single atomic UPDATE-RETURNING so the
--      quota check and increment happen in one statement instead of two.
--      Previously: SELECT count → check → UPDATE (three round trips, race window
--      between the check and the increment).
--
--   3. llm_usage indexes — admin LLM cost RPC aggregates by route/model over
--      large date windows without these, forcing full scans as the table grows.


-- ─── 1. increment_session_counters ─────────────────────────────────────────
-- Called by evaluate/route.ts after every answer. Uses SQL-level arithmetic
-- so the increment is atomic regardless of concurrent requests.

create or replace function increment_session_counters(
  p_session_id uuid,
  p_is_correct  boolean
)
returns void
language sql
security definer
set search_path = public
as $$
  update study_sessions
  set
    questions_answered = questions_answered + 1,
    correct_answers    = correct_answers + (case when p_is_correct then 1 else 0 end)
  where id = p_session_id;
$$;

grant execute on function increment_session_counters(uuid, boolean) to authenticated, service_role;


-- ─── 2. consume_llm_quota (atomic rewrite) ──────────────────────────────────
-- The new implementation collapses the quota check + increment into a single
-- UPDATE ... RETURNING statement. If the UPDATE touches 0 rows the quota was
-- already exhausted; if it touches 1 row the increment succeeded.
--
-- The UPSERT (INSERT ... ON CONFLICT DO NOTHING) that seeds the row for a new
-- day is kept as a prior step — it is idempotent and cannot race harmfully.

create or replace function consume_llm_quota(p_user_id uuid)
returns table(allowed boolean, used int, quota int, plan text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan  text;
  v_quota int;
  v_used  int;
begin
  -- Determine plan and quota ceiling from subscriptions table.
  select coalesce(s.plan, 'free') into v_plan
  from subscriptions s
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing')
  order by s.created_at desc
  limit 1;

  v_plan  := coalesce(v_plan, 'free');
  v_quota := case v_plan
    when 'pro'        then 100000
    when 'pro_annual' then 100000
    when 'enterprise' then 100000
    else 20
  end;

  -- Ensure a row exists for today (idempotent).
  insert into daily_llm_usage (user_id, usage_date, count)
  values (p_user_id, current_date, 0)
  on conflict (user_id, usage_date) do nothing;

  -- Atomic check-and-increment: only increments if still under quota.
  -- If 0 rows are updated the quota was already reached.
  update daily_llm_usage
  set    count = count + 1
  where  user_id    = p_user_id
    and  usage_date = current_date
    and  count      < v_quota
  returning count into v_used;

  if v_used is null then
    -- Quota exhausted — read current value for the response payload.
    select count into v_used
    from daily_llm_usage
    where user_id = p_user_id and usage_date = current_date;

    return query select false, v_used, v_quota, v_plan;
  else
    return query select true, v_used, v_quota, v_plan;
  end if;
end;
$$;

grant execute on function consume_llm_quota(uuid) to authenticated, service_role;


-- ─── 3. LLM usage indexes ───────────────────────────────────────────────────
-- The admin LLM cost page groups by route and model over date windows.
-- Without these, every admin page load scans the full llm_usage table.

create index concurrently if not exists idx_llm_usage_route_created
  on llm_usage(route, created_at desc);

create index concurrently if not exists idx_llm_usage_model_created
  on llm_usage(model, created_at desc);

analyze llm_usage;
analyze study_sessions;
analyze daily_llm_usage;
