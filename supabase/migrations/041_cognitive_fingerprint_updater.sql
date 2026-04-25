-- Migration 041: update_cognitive_fingerprint(p_user_id)
--
-- Derives and writes profiles.cognitive_fingerprint from a user's last
-- 60 days of question_attempts. Called from the evaluate route every 10
-- questions (fire-and-forget). Three signals:
--
--   background       — 'developer' | 'sysadmin' | 'business' | 'student' | 'other'
--   explanation_depth — 'deep' | 'concise' (only set when signal is clear)
--   weakness_pattern  — blueprint task_id with worst accuracy (min 5 attempts)
--
-- Requires at least 20 total attempts — silently exits otherwise so new users
-- don't get a stale fingerprint from 3 data points.

create or replace function update_cognitive_fingerprint(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_attempts   bigint;
  v_avg_time_ms      numeric;
  v_secure_acc       numeric;
  v_resilient_acc    numeric;
  v_perform_acc      numeric;
  v_cost_acc         numeric;
  v_weakness_task    text;
  v_background       text := 'other';
  v_depth            text;
  v_fingerprint      jsonb;
  v_existing         jsonb;
begin
  -- Guard: need at least 20 attempts for a meaningful signal
  select count(*) into v_total_attempts
  from question_attempts
  where user_id = p_user_id;

  if v_total_attempts < 20 then return; end if;

  -- Average time per question (last 50)
  select avg(time_taken_ms) into v_avg_time_ms
  from (
    select time_taken_ms
    from question_attempts
    where user_id = p_user_id
    order by created_at desc
    limit 50
  ) t;

  -- Per-domain accuracy (last 60 days, groups by domain name substring)
  select
    max(case when kd.name ilike '%Secure%'      then acc end),
    max(case when kd.name ilike '%Resilient%'   then acc end),
    max(case when kd.name ilike '%Performing%'  then acc end),
    max(case when kd.name ilike '%Cost%'        then acc end)
  into v_secure_acc, v_resilient_acc, v_perform_acc, v_cost_acc
  from (
    select
      kd.name,
      round(
        count(*) filter (where qa.is_correct)::numeric / nullif(count(*), 0),
        3
      ) as acc
    from question_attempts qa
    join concepts c on c.id = qa.concept_id
    join knowledge_domains kd on kd.id = c.domain_id
    where qa.user_id = p_user_id
      and qa.created_at >= now() - interval '60 days'
    group by kd.name
    having count(*) >= 5
  ) domain_stats;

  -- Weakest blueprint task (last 60 days, min 5 attempts, lowest accuracy)
  select q.blueprint_task_id into v_weakness_task
  from question_attempts qa
  join questions q on q.id = qa.question_id
  where qa.user_id = p_user_id
    and q.blueprint_task_id is not null
    and qa.created_at >= now() - interval '60 days'
  group by q.blueprint_task_id
  having count(*) >= 5
  order by
    count(*) filter (where qa.is_correct)::numeric
      / nullif(count(*), 0) asc nulls last
  limit 1;

  -- ── Background inference ───────────────────────────────────────────
  -- developer:  strong security domain, decent resilience
  -- sysadmin:   strong performance, decent resilience
  -- business:   strong cost-opt, weak security + performance
  -- student:    uniformly low (< 45% everywhere that has ≥5 attempts)
  -- other:      default
  if coalesce(v_secure_acc, 0) >= 0.65
    and coalesce(v_resilient_acc, 0) >= 0.55 then
    v_background := 'developer';
  elsif coalesce(v_perform_acc, 0) >= 0.65
    and coalesce(v_resilient_acc, 0) >= 0.55 then
    v_background := 'sysadmin';
  elsif coalesce(v_cost_acc, 0) >= 0.60
    and coalesce(v_secure_acc, 0) < 0.50
    and coalesce(v_perform_acc, 0) < 0.50 then
    v_background := 'business';
  elsif (v_secure_acc is null or v_secure_acc < 0.45)
    and (v_resilient_acc is null or v_resilient_acc < 0.45)
    and (v_perform_acc is null or v_perform_acc < 0.45)
    and (v_cost_acc is null or v_cost_acc < 0.45) then
    v_background := 'student';
  end if;

  -- ── Explanation depth ──────────────────────────────────────────────
  -- Only set when signal is clear; don't override if in the grey zone.
  if v_avg_time_ms > 40000 then
    v_depth := 'deep';
  elsif v_avg_time_ms < 18000 then
    v_depth := 'concise';
  end if;

  -- ── Merge with existing fingerprint ───────────────────────────────
  -- Preserve keys set during onboarding (e.g. user-declared background).
  -- Only overwrite keys we computed — don't clobber onboarding choices.
  select coalesce(cognitive_fingerprint, '{}')
  into v_existing
  from profiles
  where id = p_user_id;

  v_fingerprint := coalesce(v_existing, '{}')
    || jsonb_build_object('background', v_background)
    || case when v_weakness_task is not null
            then jsonb_build_object('weakness_pattern', v_weakness_task)
            else '{}'::jsonb end
    || case when v_depth is not null
            then jsonb_build_object('explanation_depth', v_depth)
            else '{}'::jsonb end;

  update profiles
  set    cognitive_fingerprint = v_fingerprint,
         updated_at = now()
  where  id = p_user_id;
end;
$$;

-- Only callable from service_role (backend, crons). Never expose to anon/authenticated.
revoke execute on function update_cognitive_fingerprint(uuid) from public, anon, authenticated;
grant  execute on function update_cognitive_fingerprint(uuid) to service_role;

comment on function update_cognitive_fingerprint(uuid) is
  'Derives background/explanation_depth/weakness_pattern from last 60d of question_attempts and merges into profiles.cognitive_fingerprint. Called fire-and-forget every 10 questions from the evaluate route.';
