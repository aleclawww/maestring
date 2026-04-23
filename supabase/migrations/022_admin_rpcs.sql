-- Admin panel RPCs. Todas security definer → el gating lo hace el middleware
-- (ADMIN_EMAILS). No exponer a `authenticated`, solo `service_role`.

-- ---------------------------------------------------------------- audit log
-- Toda acción destructiva del admin queda registrada. Sin esto, el panel es un
-- vector de riesgo (cualquier admin puede regalar pro sin trazabilidad).
create table if not exists admin_actions (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  admin_email text,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb
);

create index if not exists admin_actions_created on admin_actions (created_at desc);
create index if not exists admin_actions_target on admin_actions (target_user_id);

alter table admin_actions enable row level security;
-- Sin policies: solo service_role accede.

-- ---------------------------------------------------------------- overview
-- Una sola RPC que devuelve el bloque de KPIs. Un round-trip = latencia baja
-- en la home del admin.
create or replace function admin_overview(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'users_total', (select count(*) from profiles),
    'users_onboarded', (select count(*) from profiles where onboarding_completed),
    'mau', (
      select count(distinct user_id)
      from study_sessions
      where created_at >= now() - interval '30 days'
    ),
    'dau', (
      select count(distinct user_id)
      from study_sessions
      where created_at >= now() - interval '1 day'
    ),
    'new_signups_7d', (
      select count(*) from profiles where created_at >= now() - interval '7 days'
    ),
    'subs_active', (
      select count(*) from subscriptions where status in ('active', 'trialing')
    ),
    'subs_by_plan', (
      select coalesce(jsonb_object_agg(plan, n), '{}'::jsonb) from (
        select plan::text, count(*) as n from subscriptions
        where status in ('active', 'trialing') group by plan
      ) t
    ),
    'mrr_usd_cents', (
      -- Heurística hasta que leamos precios reales de Stripe. Pro mensual ~$29,
      -- anual ~$290 => $24/mes amortizado.
      select coalesce(sum(case plan::text
        when 'pro' then 2900
        when 'pro_annual' then 2416
        when 'enterprise' then 9900
        else 0 end), 0)::int
      from subscriptions where status in ('active', 'trialing')
    ),
    'llm_spend_today_usd', (select llm_cost_today()),
    'llm_spend_7d_usd', (
      select coalesce(sum(cost_usd), 0)::numeric from llm_usage
      where created_at >= now() - interval '7 days'
    ),
    'llm_spend_30d_usd', (
      select coalesce(sum(cost_usd), 0)::numeric from llm_usage
      where created_at >= now() - interval '30 days'
    ),
    'llm_calls_today', (
      select count(*)::int from llm_usage
      where created_at >= date_trunc('day', now())
    ),
    'llm_error_rate_24h', (
      select coalesce(round(
        (count(*) filter (where not success))::numeric
        / nullif(count(*), 0) * 100, 2), 0)
      from llm_usage
      where created_at >= now() - interval '24 hours'
    ),
    'sessions_7d', (
      select count(*)::int from study_sessions
      where created_at >= now() - interval '7 days'
    ),
    'sessions_completed_7d', (
      select count(*)::int from study_sessions
      where created_at >= now() - interval '7 days'
        and (status = 'completed' or is_completed = true)
    ),
    'outcomes_passed', (
      select count(*)::int from profiles where exam_outcome = 'passed'
    ),
    'outcomes_failed', (
      select count(*)::int from profiles where exam_outcome = 'failed'
    ),
    'outcomes_pending', (
      select count(*)::int from profiles
      where exam_target_date is not null
        and exam_target_date <= current_date
        and exam_target_date >= current_date - interval '60 days'
        and (exam_outcome is null or exam_outcome = 'unknown')
    ),
    'docs_failed_7d', (
      select count(*)::int from user_documents
      where processing_status = 'failed'
        and created_at >= now() - interval '7 days'
    ),
    'docs_processing', (
      select count(*)::int from user_documents
      where processing_status in ('pending', 'processing')
    ),
    'pool_size', (
      select count(*)::int from questions
      where is_active = true and source = 'pool-seed'
    ),
    'pool_coverage', (
      -- % de conceptos con al menos 3 preguntas activas en el pool.
      select round(
        (count(*) filter (where active_q >= 3))::numeric
        / nullif(count(*), 0) * 100, 1
      )
      from (
        select c.id,
          (select count(*) from questions q
            where q.concept_id = c.id and q.is_active = true and q.source = 'pool-seed'
          ) as active_q
        from concepts c
        where c.certification_id = 'aws-saa-c03' and c.is_active = true
      ) t
    )
  ) into v_result;
  return v_result;
end;
$$;

grant execute on function admin_overview(int) to service_role;

-- ---------------------------------------------------------------- users list
-- Búsqueda por email/nombre + filtros básicos. Paginación por offset (admin ≤
-- pocos miles de users, no hace falta cursor).
create or replace function admin_list_users(
  p_search text default null,
  p_plan text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  email text,
  full_name text,
  plan text,
  onboarding_completed boolean,
  journey_phase text,
  current_streak int,
  total_xp int,
  exam_target_date date,
  exam_outcome text,
  last_readiness_score numeric,
  last_session_at timestamptz,
  llm_spend_30d numeric,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    u.email::text,
    p.full_name,
    coalesce(s.plan::text, 'free') as plan,
    p.onboarding_completed,
    p.journey_phase::text,
    p.current_streak,
    p.total_xp,
    p.exam_target_date,
    p.exam_outcome,
    p.last_readiness_score,
    (select max(created_at) from study_sessions ss where ss.user_id = p.id) as last_session_at,
    coalesce(
      (select sum(cost_usd) from llm_usage lu
        where lu.user_id = p.id and lu.created_at >= now() - interval '30 days'),
      0
    ) as llm_spend_30d,
    p.created_at
  from profiles p
  join auth.users u on u.id = p.id
  left join lateral (
    select plan from subscriptions s2
    where s2.user_id = p.id and s2.status in ('active', 'trialing')
    order by s2.current_period_end desc nulls last
    limit 1
  ) s on true
  where (p_search is null
         or u.email ilike '%' || p_search || '%'
         or p.full_name ilike '%' || p_search || '%')
    and (p_plan is null or coalesce(s.plan::text, 'free') = p_plan)
  order by p.created_at desc
  limit p_limit offset p_offset;
$$;

grant execute on function admin_list_users(text, text, int, int) to service_role;

-- ---------------------------------------------------------------- user detail
create or replace function admin_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'profile', to_jsonb(p.*),
    'email', u.email::text,
    'subscription', (
      select to_jsonb(s.*) from subscriptions s
      where s.user_id = p_user_id
      order by s.current_period_end desc nulls last
      limit 1
    ),
    'readiness', (
      select row_to_json(r) from get_exam_readiness_v2(p_user_id) r
    ),
    'llm_spend', jsonb_build_object(
      'today', (select coalesce(sum(cost_usd), 0) from llm_usage
                 where user_id = p_user_id
                   and created_at >= date_trunc('day', now())),
      '7d', (select coalesce(sum(cost_usd), 0) from llm_usage
             where user_id = p_user_id and created_at >= now() - interval '7 days'),
      '30d', (select coalesce(sum(cost_usd), 0) from llm_usage
              where user_id = p_user_id and created_at >= now() - interval '30 days')
    ),
    'sessions_30d', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ss.id, 'created_at', ss.created_at, 'status', ss.status,
        'questions_answered', ss.questions_answered, 'xp_earned', ss.xp_earned
      ) order by ss.created_at desc), '[]'::jsonb)
      from (
        select * from study_sessions
        where user_id = p_user_id and created_at >= now() - interval '30 days'
        order by created_at desc limit 30
      ) ss
    ),
    'documents', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id, 'filename', d.filename, 'processing_status', d.processing_status,
        'created_at', d.created_at, 'file_size', d.file_size
      ) order by d.created_at desc), '[]'::jsonb)
      from user_documents d where d.user_id = p_user_id
    )
  ) into v
  from profiles p
  join auth.users u on u.id = p.id
  where p.id = p_user_id;
  return v;
end;
$$;

grant execute on function admin_user_detail(uuid) to service_role;

-- ---------------------------------------------------------------- llm usage
-- Breakdown por día y ruta — alimenta la página /admin/llm.
create or replace function admin_llm_usage(p_days int default 14)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'by_day', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', day, 'calls', calls, 'cost_usd', cost_usd, 'tokens', tokens
      ) order by day), '[]'::jsonb)
      from (
        select
          date_trunc('day', created_at)::date as day,
          count(*)::int as calls,
          round(sum(cost_usd)::numeric, 4) as cost_usd,
          sum(input_tokens + output_tokens)::int as tokens
        from llm_usage
        where created_at >= now() - make_interval(days => p_days)
        group by 1
      ) t
    ),
    'by_route', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'route', route, 'calls', calls, 'cost_usd', cost_usd, 'error_rate', error_rate
      ) order by cost_usd desc), '[]'::jsonb)
      from (
        select
          route,
          count(*)::int as calls,
          round(sum(cost_usd)::numeric, 4) as cost_usd,
          round((count(*) filter (where not success))::numeric / nullif(count(*), 0) * 100, 2) as error_rate
        from llm_usage
        where created_at >= now() - make_interval(days => p_days)
        group by route
      ) t
    ),
    'by_model', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'model', model, 'calls', calls, 'cost_usd', cost_usd
      ) order by cost_usd desc), '[]'::jsonb)
      from (
        select model, count(*)::int as calls, round(sum(cost_usd)::numeric, 4) as cost_usd
        from llm_usage
        where created_at >= now() - make_interval(days => p_days)
        group by model
      ) t
    ),
    'top_spenders', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', user_id, 'email', email, 'cost_usd', cost_usd, 'calls', calls
      ) order by cost_usd desc), '[]'::jsonb)
      from (
        select lu.user_id, u.email::text,
          round(sum(lu.cost_usd)::numeric, 4) as cost_usd, count(*)::int as calls
        from llm_usage lu left join auth.users u on u.id = lu.user_id
        where lu.created_at >= now() - make_interval(days => p_days)
          and lu.user_id is not null
        group by lu.user_id, u.email
        order by sum(lu.cost_usd) desc
        limit 20
      ) t
    )
  ) into v;
  return v;
end;
$$;

grant execute on function admin_llm_usage(int) to service_role;

-- ---------------------------------------------------------------- outcomes
-- Lista de outcomes reportados — crítica para calibrar el clasificador P(pass).
create or replace function admin_outcomes_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'counts', jsonb_build_object(
      'passed', (select count(*) from profiles where exam_outcome = 'passed'),
      'failed', (select count(*) from profiles where exam_outcome = 'failed'),
      'unknown', (select count(*) from profiles where exam_outcome = 'unknown'),
      'pending_capture', (select count(*) from profiles
        where exam_target_date is not null
          and exam_target_date <= current_date
          and exam_target_date >= current_date - interval '60 days'
          and (exam_outcome is null or exam_outcome = 'unknown'))
    ),
    'by_score', (
      -- Distribución de scores AWS reportados.
      select coalesce(jsonb_agg(jsonb_build_object(
        'bucket', bucket, 'n', n
      ) order by bucket), '[]'::jsonb)
      from (
        select (exam_scaled_score / 100 * 100) as bucket, count(*)::int as n
        from profiles
        where exam_scaled_score is not null
        group by bucket
      ) t
    ),
    'recent', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', p.id, 'email', u.email::text,
        'outcome', p.exam_outcome, 'score', p.exam_scaled_score,
        'exam_date', p.exam_target_date,
        'last_readiness', p.last_readiness_score
      ) order by p.exam_target_date desc), '[]'::jsonb)
      from profiles p join auth.users u on u.id = p.id
      where p.exam_outcome in ('passed', 'failed')
      limit 50
    )
  ) into v;
  return v;
end;
$$;

grant execute on function admin_outcomes_summary() to service_role;

-- ---------------------------------------------------------------- documents
create or replace function admin_failed_documents(p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  email text,
  filename text,
  file_size bigint,
  processing_status text,
  error_message text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select d.id, d.user_id, u.email::text, d.filename, d.file_size,
         d.processing_status::text, d.error_message, d.created_at
  from user_documents d
  left join auth.users u on u.id = d.user_id
  where d.processing_status = 'failed'
  order by d.created_at desc
  limit p_limit;
$$;

grant execute on function admin_failed_documents(int) to service_role;

-- ---------------------------------------------------------------- grant plan
-- Permitir al admin dar plan 'pro' manualmente (launch perks, comps, testing).
-- Genera subscription sintética sin Stripe; se marca con provider='manual'.
create or replace function admin_grant_pro(
  p_user_id uuid,
  p_days int default 30,
  p_reason text default 'admin_comp'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into subscriptions (
    user_id, plan, status, current_period_start, current_period_end,
    stripe_subscription_id, stripe_customer_id
  )
  values (
    p_user_id, 'pro'::subscription_plan, 'active'::subscription_status,
    now(), now() + make_interval(days => p_days),
    'admin_' || gen_random_uuid()::text, 'admin_manual'
  )
  on conflict (user_id) do update set
    plan = 'pro'::subscription_plan,
    status = 'active'::subscription_status,
    current_period_start = now(),
    current_period_end = greatest(
      coalesce(subscriptions.current_period_end, now()),
      now() + make_interval(days => p_days)
    ),
    updated_at = now();

  -- Log para auditoría en logger de admin actions (tabla creada abajo).
  insert into admin_actions (admin_email, action, target_user_id, details)
  values (
    current_setting('request.jwt.claims', true)::jsonb->>'email',
    'grant_pro',
    p_user_id,
    jsonb_build_object('days', p_days, 'reason', p_reason)
  );
end;
$$;

grant execute on function admin_grant_pro(uuid, int, text) to service_role;

-- ---------------------------------------------------------------- list actions
create or replace function admin_recent_actions(p_limit int default 100)
returns setof admin_actions
language sql security definer set search_path = public as $$
  select * from admin_actions order by created_at desc limit p_limit;
$$;

grant execute on function admin_recent_actions(int) to service_role;
