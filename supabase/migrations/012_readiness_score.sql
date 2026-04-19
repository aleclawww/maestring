-- Pilar 1 — Capacidad Predictiva: Exam Readiness Score
--
-- Returns a single 0-100 score plus by-domain breakdown, weighted by:
--   * knowledge_domains.exam_weight_percent (real exam weight)
--   * user_concept_states.stability (FSRS — half-life of memory)
--   * user_concept_states.difficulty (FSRS — accumulated difficulty)
--   * user_concept_states.lapses (forgetting penalty)
--
-- Concepts the user has never seen contribute 0 to "mastery" but DO count in
-- the denominator — so an unstudied user starts at 0, not at "infinity / 0".
--
-- Mastery per concept m_i in [0, 1]:
--   stability_term = 1 - exp(-stability / 21)        -- ~21 days = "solid"
--   difficulty_penalty = 1 - 0.4 * difficulty         -- difficulty in [0,1]
--   lapse_penalty = exp(-0.15 * lapses)               -- 3 lapses ≈ 0.64x
--   m_i = clamp(stability_term * difficulty_penalty * lapse_penalty, 0, 1)
--
-- Domain score D_d = avg(m_i for i in concepts of d) * 100
-- Overall score = sum(D_d * exam_weight_percent_d) / sum(exam_weight_percent_d)
--
-- "At risk" = concept with next_review_date in next 7 days AND stability < 14d.
-- ETA ready date = projected day when overall reaches 80, based on last-14-day
-- velocity (Δscore / day). NULL if velocity <= 0 or insufficient history.

create or replace function get_exam_readiness(
  p_user_id uuid,
  p_certification_id text default 'aws-saa-c03'
)
returns table (
  score numeric,
  by_domain jsonb,
  weakest_domain text,
  at_risk_count int,
  total_concepts int,
  studied_concepts int,
  eta_ready_date date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score numeric;
  v_by_domain jsonb;
  v_weakest text;
  v_at_risk int;
  v_total int;
  v_studied int;
  v_eta date;
  v_velocity numeric;
begin
  -- Per-concept mastery joined with domain weights
  with mastery as (
    select
      d.id as domain_id,
      d.name as domain_name,
      d.exam_weight_percent::numeric as weight,
      c.id as concept_id,
      coalesce(
        greatest(0, least(1,
          (1 - exp(-coalesce(s.stability, 0) / 21.0))
          * (1 - 0.4 * coalesce(s.difficulty, 0.5))
          * exp(-0.15 * coalesce(s.lapses, 0))
        )),
        0
      ) as m,
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
    case
      when sum(weight) > 0
        then round((sum(domain_score * weight) / sum(weight))::numeric, 1)
      else 0
    end,
    coalesce(jsonb_agg(
      jsonb_build_object(
        'domain_id', domain_id,
        'name', domain_name,
        'weight_percent', weight,
        'score', round(domain_score::numeric, 1),
        'concepts', concepts_in_domain,
        'studied', studied_in_domain
      )
      order by weight desc
    ), '[]'::jsonb),
    (
      select domain_name from per_domain
      where studied_in_domain > 0
      order by domain_score asc
      limit 1
    )
  into v_score, v_by_domain, v_weakest
  from per_domain;

  -- At-risk: due in next 7 days and still fragile (stability < 14d)
  select count(*)::int into v_at_risk
  from user_concept_states s
  join concepts c on c.id = s.concept_id
  where s.user_id = p_user_id
    and c.certification_id = p_certification_id
    and s.next_review_date is not null
    and s.next_review_date <= now() + interval '7 days'
    and s.stability < 14;

  -- Coverage stats
  select count(*)::int into v_total
  from concepts where certification_id = p_certification_id and is_active = true;

  select count(*)::int into v_studied
  from user_concept_states s
  join concepts c on c.id = s.concept_id
  where s.user_id = p_user_id
    and c.certification_id = p_certification_id
    and s.reps > 0;

  -- Velocity: completed sessions in last 14 days as proxy. Each completed
  -- session contributes ~0.6 readiness points historically (heuristic until
  -- we have outcomes to calibrate).
  select coalesce(count(*), 0) * 0.6 / 14.0 into v_velocity
  from study_sessions
  where user_id = p_user_id
    and (status = 'completed' or is_completed = true)
    and created_at >= now() - interval '14 days';

  if v_velocity > 0 and v_score < 80 then
    v_eta := (now() + ((80 - v_score) / v_velocity) * interval '1 day')::date;
  else
    v_eta := null;
  end if;

  return query select
    coalesce(v_score, 0),
    coalesce(v_by_domain, '[]'::jsonb),
    v_weakest,
    coalesce(v_at_risk, 0),
    coalesce(v_total, 0),
    coalesce(v_studied, 0),
    v_eta;
end;
$$;

grant execute on function get_exam_readiness(uuid, text) to authenticated;
