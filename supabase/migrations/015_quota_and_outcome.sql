-- Pilar 7 (Fase 7) — Monetización + flywheel de outcomes.
--
-- Dos cosas en una migración porque comparten propósito (gating + flywheel):
--   1. Cuota diaria de generación por plan (free=20, pro/pro_annual=ilimitado).
--      Reemplaza el rate-limit per-minute para el caso "free vs pro" — el
--      per-minute sigue protegiendo abuso, este protege coste mensual.
--   2. Helper para detectar usuarios con examen pasado y outcome desconocido,
--      consumido por el dashboard para pedirle al usuario que registre el
--      resultado. Sin outcomes capturados, el clasificador P(aprobar) del
--      Pilar 1 no puede madurar.

-- 1) Daily LLM usage counter ---------------------------------------------
create table if not exists daily_llm_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  count int not null default 0,
  primary key (user_id, usage_date)
);

create index if not exists daily_llm_usage_date on daily_llm_usage(usage_date);

alter table daily_llm_usage enable row level security;
create policy "daily_llm_usage_self_read" on daily_llm_usage
  for select using (auth.uid() = user_id);

-- Returns { allowed, used, limit, plan } — caller increments only on success.
create or replace function consume_llm_quota(p_user_id uuid)
returns table(allowed boolean, used int, quota int, plan text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_quota int;
  v_used int;
begin
  select coalesce(s.plan::text, 'free') into v_plan
  from subscriptions s
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing')
  order by s.current_period_end desc nulls last
  limit 1;

  v_plan := coalesce(v_plan, 'free');

  v_quota := case v_plan
    when 'free' then 20
    when 'pro' then 100000
    when 'pro_annual' then 100000
    when 'enterprise' then 100000
    else 20
  end;

  insert into daily_llm_usage (user_id, usage_date, count)
  values (p_user_id, current_date, 0)
  on conflict (user_id, usage_date) do nothing;

  select count into v_used
  from daily_llm_usage
  where user_id = p_user_id and usage_date = current_date;

  if v_used >= v_quota then
    return query select false, v_used, v_quota, v_plan;
    return;
  end if;

  update daily_llm_usage
  set count = count + 1
  where user_id = p_user_id and usage_date = current_date
  returning count into v_used;

  return query select true, v_used, v_quota, v_plan;
end;
$$;

grant execute on function consume_llm_quota(uuid) to authenticated, service_role;

-- 2) Outcome capture --------------------------------------------------------
-- exam_outcome column already exists from migration 014. Add the AWS scaled
-- score (100–1000) so the calibrator can predict P(aprobar) numerically once
-- we cross ~500 captured outcomes.
alter table profiles
  add column if not exists exam_scaled_score int check (exam_scaled_score between 100 and 1000);

-- Helper to detect "exam date passed, outcome still unknown" — drives the
-- dashboard nudge.
create or replace function needs_outcome_capture(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = p_user_id
      and exam_target_date is not null
      and exam_target_date <= current_date
      and exam_target_date >= current_date - interval '60 days'
      and (exam_outcome is null or exam_outcome = 'unknown')
  );
$$;

grant execute on function needs_outcome_capture(uuid) to authenticated, service_role;
