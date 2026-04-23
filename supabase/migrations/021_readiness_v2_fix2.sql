-- Fix: ambigüedad de "score" dentro de get_exam_readiness_v2.
-- La tabla OUT declara score numeric, y al mismo tiempo readiness_history tiene
-- columna score. PostgreSQL no sabe cuál usar dentro del CTE `hist` y aborta
-- con 42702. Alias explícito en el CTE y en los agregados lo resuelve.

create or replace function get_exam_readiness_v2(
  p_user_id uuid,
  p_certification_id text default 'aws-saa-c03'
)
returns table (
  score numeric,
  confidence_low numeric,
  confidence_high numeric,
  pass_probability numeric,
  velocity_per_week numeric,
  by_domain jsonb,
  weakest_domain text,
  weakest_domain_id uuid,
  weakest_concepts jsonb,
  at_risk_count int,
  total_concepts int,
  studied_concepts int,
  eta_ready_date date,
  history jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score numeric;
  v_by_domain jsonb;
  v_weakest_name text;
  v_weakest_id uuid;
  v_weakest_concepts jsonb;
  v_at_risk int;
  v_total int;
  v_studied int;
  v_eta date;
  v_velocity numeric;
  v_weekly_velocity numeric;
  v_domain_stddev numeric;
  v_ci_width numeric;
  v_pass_prob numeric;
  v_history jsonb;
begin
  with mastery as (
    select
      d.id as domain_id,
      d.name as domain_name,
      d.exam_weight_percent::numeric as weight,
      c.id as concept_id,
      c.name as concept_name,
      c.slug as concept_slug,
      coalesce(greatest(0, least(1,
        (1 - exp(-coalesce(s.stability, 0) / 21.0))
        * (1 - 0.4 * coalesce(s.difficulty, 0.5))
        * exp(-0.15 * coalesce(s.lapses, 0))
      )), 0) as m,
      coalesce(s.stability, 0) as stability,
      coalesce(s.reps, 0) as reps,
      (s.user_id is not null) as studied
    from concepts c
    join knowledge_domains d on d.id = c.domain_id
    left join user_concept_states s
      on s.concept_id = c.id and s.user_id = p_user_id
    where c.certification_id = p_certification_id
      and c.is_active = true
  ),
  per_domain as (
    select
      domain_id,
      domain_name,
      weight,
      avg(m) * 100 as domain_score,
      count(*) as concepts_in_domain,
      count(*) filter (where studied) as studied_in_domain
    from mastery
    group by domain_id, domain_name, weight
  )
  select
    case when sum(weight) > 0
      then round((sum(domain_score * weight) / sum(weight))::numeric, 1)
      else 0 end,
    coalesce(jsonb_agg(
      jsonb_build_object(
        'domain_id', domain_id,
        'name', domain_name,
        'weight_percent', weight,
        'score', round(domain_score::numeric, 1),
        'concepts', concepts_in_domain,
        'studied', studied_in_domain
      ) order by weight desc), '[]'::jsonb),
    (select domain_name from per_domain where studied_in_domain > 0 order by domain_score asc limit 1),
    (select domain_id from per_domain where studied_in_domain > 0 order by domain_score asc limit 1),
    coalesce(stddev_pop(domain_score), 0)
  into v_score, v_by_domain, v_weakest_name, v_weakest_id, v_domain_stddev
  from per_domain;

  with ranked as (
    select
      c.id, c.name, c.slug, c.domain_id,
      coalesce(s.stability, 0) as stability,
      coalesce(s.reps, 0) as reps,
      coalesce(s.lapses, 0) as lapses
    from concepts c
    join user_concept_states s on s.concept_id = c.id and s.user_id = p_user_id
    where c.certification_id = p_certification_id
      and c.is_active = true
      and s.reps > 0
    order by
      (case when v_weakest_id is not null and c.domain_id = v_weakest_id then 0 else 1 end),
      s.stability asc nulls first,
      s.lapses desc
    limit 3
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'concept_id', ranked.id, 'name', ranked.name, 'slug', ranked.slug,
    'stability', round(ranked.stability::numeric, 1), 'reps', ranked.reps
  )), '[]'::jsonb)
  into v_weakest_concepts
  from ranked;

  select count(*)::int into v_at_risk
  from user_concept_states s
  join concepts c on c.id = s.concept_id
  where s.user_id = p_user_id
    and c.certification_id = p_certification_id
    and s.next_review_date is not null
    and s.next_review_date <= now() + interval '7 days'
    and s.stability < 14;

  select count(*)::int into v_total from concepts
  where certification_id = p_certification_id and is_active = true;

  select count(*)::int into v_studied from user_concept_states s
  join concepts c on c.id = s.concept_id
  where s.user_id = p_user_id and c.certification_id = p_certification_id and s.reps > 0;

  -- Velocity: pendiente entre primer y último snapshot en 14d. Alias de la
  -- columna score como hist_score para evitar ambigüedad con el parámetro OUT.
  with hist as (
    select snapshot_date, readiness_history.score as hist_score
    from readiness_history
    where user_id = p_user_id
      and snapshot_date >= current_date - interval '14 days'
  ),
  bounds as (
    select
      min(snapshot_date) as d_min,
      max(snapshot_date) as d_max,
      count(*) as n
    from hist
  ),
  regr as (
    select
      (
        (select hist_score from hist where snapshot_date = b.d_max order by snapshot_date desc limit 1)
        - (select hist_score from hist where snapshot_date = b.d_min order by snapshot_date asc limit 1)
      )::numeric
      / nullif((b.d_max - b.d_min)::numeric, 0) as slope_per_day,
      b.n
    from bounds b
  )
  select slope_per_day into v_velocity from regr where n >= 2;

  if v_velocity is null then
    select coalesce(count(*), 0) * 0.6 / 14.0 into v_velocity
    from study_sessions
    where user_id = p_user_id
      and (status = 'completed' or is_completed = true)
      and created_at >= now() - interval '14 days';
  end if;

  v_weekly_velocity := round(coalesce(v_velocity, 0)::numeric * 7, 2);

  if coalesce(v_velocity, 0) > 0 and v_score < 80 then
    v_eta := (now() + ((80 - v_score) / v_velocity) * interval '1 day')::date;
  else
    v_eta := null;
  end if;

  v_ci_width := greatest(3.0, least(25.0,
    12.0 * sqrt(greatest(0, 1 - (v_studied::numeric / nullif(v_total, 0))))
    + 0.35 * coalesce(v_domain_stddev, 0)
  ));

  v_pass_prob := _readiness_pass_probability(v_score, v_studied, v_total);

  select coalesce(jsonb_agg(jsonb_build_object(
    'date', rh.snapshot_date, 'score', rh.score, 'pass_probability', rh.pass_probability
  ) order by rh.snapshot_date), '[]'::jsonb)
  into v_history
  from readiness_history rh
  where rh.user_id = p_user_id
    and rh.snapshot_date >= current_date - interval '30 days';

  return query select
    coalesce(v_score, 0),
    greatest(0, coalesce(v_score, 0) - v_ci_width),
    least(100, coalesce(v_score, 0) + v_ci_width),
    coalesce(v_pass_prob, 0),
    v_weekly_velocity,
    coalesce(v_by_domain, '[]'::jsonb),
    v_weakest_name,
    v_weakest_id,
    coalesce(v_weakest_concepts, '[]'::jsonb),
    coalesce(v_at_risk, 0),
    coalesce(v_total, 0),
    coalesce(v_studied, 0),
    v_eta,
    coalesce(v_history, '[]'::jsonb);
end;
$$;

grant execute on function get_exam_readiness_v2(uuid, text) to authenticated;
