-- 023 — Unit economics RPC for admin panel.
-- Computes per-plan margins, cost-per-active-user, cohort retention + cumulative
-- LLM spend, and top-cost outliers. Heuristic plan prices live here because we
-- don't mirror Stripe price objects in DB yet — matches migration 022 mrr calc.

-- Helper: amortized monthly price in USD for a plan text.
create or replace function _plan_monthly_price_usd(p_plan text)
returns numeric
language sql
immutable
as $$
  select case p_plan
    when 'pro' then 29.00
    when 'pro_annual' then 24.16
    when 'enterprise' then 99.00
    else 0.00
  end;
$$;

create or replace function admin_unit_economics(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz := now() - make_interval(days => p_days);
  v_result jsonb;
begin
  with
  active_subs as (
    select s.user_id, s.plan::text as plan
    from subscriptions s
    where s.status in ('active', 'trialing')
  ),
  user_llm as (
    -- Active = any LLM call in window. Cost in window.
    select user_id,
           sum(cost_usd)::numeric as cost_usd,
           count(*) as calls
    from llm_usage
    where created_at >= v_window_start and user_id is not null
    group by user_id
  ),
  joined as (
    select coalesce(s.plan, 'free') as plan,
           u.user_id,
           u.cost_usd,
           u.calls
    from user_llm u
    left join active_subs s on s.user_id = u.user_id
  ),
  by_plan_raw as (
    select j.plan,
           count(distinct j.user_id)::int as active_users,
           coalesce(sum(j.cost_usd), 0)::numeric as llm_cost,
           coalesce(sum(j.calls), 0)::bigint as calls
    from joined j
    group by j.plan
  ),
  plan_subs as (
    select plan, count(*)::int as sub_count
    from active_subs group by plan
  ),
  by_plan as (
    select
      p.plan,
      coalesce(ps.sub_count, 0) as subscribers,
      coalesce(p.active_users, 0) as active_users,
      round(p.llm_cost, 4) as llm_cost_usd,
      round(coalesce(_plan_monthly_price_usd(p.plan) * ps.sub_count, 0), 2) as mrr_usd,
      round(_plan_monthly_price_usd(p.plan)::numeric, 2) as arpu_usd,
      case when p.active_users > 0
        then round((p.llm_cost / p.active_users)::numeric, 4)
        else 0 end as cost_per_active_user_usd,
      case when _plan_monthly_price_usd(p.plan) > 0 and p.active_users > 0
        then round(
          (1 - (p.llm_cost / p.active_users) / (_plan_monthly_price_usd(p.plan) * (p_days / 30.0)))::numeric,
          4
        )
        else null end as gross_margin
    from by_plan_raw p
    left join plan_subs ps on ps.plan = p.plan
    union all
    -- Plans that have subscribers but zero LLM activity in window.
    select ps.plan,
           ps.sub_count,
           0,
           0,
           round((_plan_monthly_price_usd(ps.plan) * ps.sub_count)::numeric, 2),
           round(_plan_monthly_price_usd(ps.plan)::numeric, 2),
           0,
           case when _plan_monthly_price_usd(ps.plan) > 0 then 1 else null end
    from plan_subs ps
    where not exists (select 1 from by_plan_raw p where p.plan = ps.plan)
  ),
  cohort_users as (
    select pr.id as user_id,
           date_trunc('month', pr.created_at)::date as cohort_month,
           pr.created_at,
           exists (
             select 1 from study_sessions ss
             where ss.user_id = pr.id
               and ss.created_at >= pr.created_at + interval '7 days'
               and ss.created_at < pr.created_at + interval '37 days'
           ) as is_active_30d,
           exists (select 1 from active_subs s where s.user_id = pr.id) as is_paying,
           coalesce((
             select sum(cost_usd) from llm_usage lu
             where lu.user_id = pr.id and lu.created_at >= pr.created_at
           ), 0)::numeric as user_llm_cost
    from profiles pr
    where pr.created_at >= now() - interval '12 months'
  ),
  cohorts as (
    select
      cohort_month,
      count(*)::int as signups,
      count(*) filter (where is_active_30d)::int as active_30d,
      count(*) filter (where is_paying)::int as paying_now,
      round(coalesce(sum(user_llm_cost), 0), 4) as cumulative_llm_cost_usd
    from cohort_users
    group by cohort_month
  ),
  top_cost as (
    select
      u.user_id,
      au.email::text as email,
      coalesce(s.plan, 'free') as plan,
      round(u.cost_usd, 4) as cost_usd,
      u.calls
    from user_llm u
    left join auth.users au on au.id = u.user_id
    left join active_subs s on s.user_id = u.user_id
    order by u.cost_usd desc
    limit 20
  ),
  overview as (
    select
      (select count(*) from active_subs) as paying_users,
      (select count(*) from user_llm) as active_users,
      (select coalesce(sum(cost_usd), 0) from llm_usage where created_at >= v_window_start) as total_llm_cost,
      (select coalesce(sum(_plan_monthly_price_usd(plan) * (p_days / 30.0)), 0) from active_subs) as total_revenue_window,
      (select coalesce(sum(_plan_monthly_price_usd(plan)), 0) from active_subs) as mrr
  )
  select jsonb_build_object(
    'window_days', p_days,
    'overview', (
      select jsonb_build_object(
        'mrr_usd', round(o.mrr::numeric, 2),
        'paying_users', o.paying_users,
        'active_users_window', o.active_users,
        'llm_cost_window_usd', round(o.total_llm_cost::numeric, 4),
        'revenue_window_usd', round(o.total_revenue_window::numeric, 2),
        'cost_per_active_user_usd',
          case when o.active_users > 0
            then round((o.total_llm_cost / o.active_users)::numeric, 4)
            else 0 end,
        'gross_margin',
          case when o.total_revenue_window > 0
            then round((1 - o.total_llm_cost / o.total_revenue_window)::numeric, 4)
            else null end,
        'ltv_estimate_usd',
          -- Naive LTV: ARPU / (1 - est. monthly retention). We don't have
          -- churn yet, so we proxy with paying_users / total_signups_12mo.
          case when o.paying_users > 0
            then round((o.mrr / greatest(o.paying_users, 1) * 12)::numeric, 2)
            else 0 end
      ) from overview o
    ),
    'by_plan', (
      select coalesce(jsonb_agg(to_jsonb(bp) order by bp.mrr_usd desc), '[]'::jsonb)
      from by_plan bp
    ),
    'cohorts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'cohort_month', to_char(c.cohort_month, 'YYYY-MM'),
        'signups', c.signups,
        'active_30d', c.active_30d,
        'retention_30d', case when c.signups > 0 then round((c.active_30d::numeric / c.signups), 4) else 0 end,
        'paying_now', c.paying_now,
        'conversion', case when c.signups > 0 then round((c.paying_now::numeric / c.signups), 4) else 0 end,
        'cumulative_llm_cost_usd', c.cumulative_llm_cost_usd
      ) order by c.cohort_month desc), '[]'::jsonb)
      from cohorts c
    ),
    'top_cost_users', (
      select coalesce(jsonb_agg(to_jsonb(tc)), '[]'::jsonb) from top_cost tc
    ),
    'alerts', (
      select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) from (
        -- Negative gross margin across the business
        select 'danger' as severity,
               'gross_margin_negative' as code,
               'Gross margin is negative in last ' || p_days || 'd: LLM cost exceeds revenue.' as message
        from overview o
        where o.total_revenue_window > 0 and o.total_llm_cost > o.total_revenue_window
        union all
        -- Free user burning > $1 in window
        select 'warning' as severity,
               'free_user_high_cost' as code,
               'A free user spent > $1 in LLM calls — consider capping free tier.' as message
        where exists (
          select 1 from joined j where j.plan = 'free' and j.cost_usd > 1
        )
        union all
        -- Any plan with margin < 50%
        select 'warning' as severity,
               'plan_low_margin' as code,
               'Plan "' || bp.plan || '" has gross margin below 50% (' ||
                 round(bp.gross_margin * 100)::text || '%).' as message
        from by_plan bp
        where bp.gross_margin is not null and bp.gross_margin < 0.5 and bp.subscribers > 0
      ) a
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function admin_unit_economics(int) from public, anon, authenticated;
grant execute on function admin_unit_economics(int) to service_role;
revoke all on function _plan_monthly_price_usd(text) from public, anon, authenticated;
grant execute on function _plan_monthly_price_usd(text) to service_role;
