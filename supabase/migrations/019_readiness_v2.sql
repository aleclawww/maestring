-- Pilar 1 — Readiness v2: banda de confianza, P(aprobar), velocidad, top-débiles.
--
-- Qué cambia vs 012:
--   * Serie temporal (readiness_history) para velocity y sparkline.
--   * Banda de confianza: ±ancho que depende de cobertura y varianza inter-dominio.
--     Con pocos conceptos estudiados o dominios muy dispares, la banda es amplia.
--   * P(aprobar) heurística calibrada a la escala AWS (720/1000).
--     Sigmoide sobre score-60 penalizada por cobertura < 60%.
--     Cuando tengamos ≥500 outcomes reales, se recalibra fuera (feature flag).
--   * Velocidad en pts/semana desde readiness_history (14 días).
--   * Top-3 conceptos más débiles con stability < 7 y reps > 0 del dominio débil,
--     para que el CTA del dashboard sea accionable ("Repasar X").

-- ---------------------------------------------------------------- history
create table if not exists readiness_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null default current_date,
  score numeric not null,
  pass_probability numeric,
  studied_concepts int not null default 0,
  by_domain jsonb,
  primary key (user_id, snapshot_date)
);

create index if not exists readiness_history_user_date
  on readiness_history(user_id, snapshot_date desc);

alter table readiness_history enable row level security;

drop policy if exists "readiness_history_self_read" on readiness_history;
create policy "readiness_history_self_read" on readiness_history
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------- helpers
-- Probability the user passes (720/1000 AWS). Heurística transparente:
--   base = sigmoid((score - 60) / 9)   -> score=60 -> 0.50, score=78 -> ~0.88
--   coverage_penalty = clamp(studied/total / 0.6, 0.4, 1)
--   P = base * coverage_penalty
-- La forma es defendible: exam real requiere 72%, readiness 80 ≈ "cómodo".
create or replace function _readiness_pass_probability(
  p_score numeric,
  p_studied int,
  p_total int
) returns numeric
language sql immutable as $$
  select round(
    (
      (1.0 / (1.0 + exp(-(coalesce(p_score, 0) - 60.0) / 9.0)))
      * greatest(0.4, least(1.0, (coalesce(p_studied, 0)::numeric / nullif(p_total, 0)) / 0.6))
    )::numeric,
    3
  );
$$;

-- ---------------------------------------------------------------- rpc v2
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
  -- Per-concept mastery using the same formula as v1, so v1 and v2 agree on score.
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

  -- Top-3 weakest concepts (accionable). Preferimos del dominio más débil; si
  -- no hay, cualquier concepto studied con baja stability.
  with ranked as (
    select
      c.id, c.name, c.slug, c.domain_id,
      coalesce(s.stability, 0) as stability,
      coalesce(s.reps, 0) as reps
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
    'concept_id', id, 'name', name, 'slug', slug, 'stability', round(stability::numeric, 1), 'reps', reps
  )), '[]'::jsonb)
  into v_weakest_concepts
  from ranked;

  -- At-risk
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

  -- Velocity desde history real si hay ≥2 snapshots en los últimos 14 días;
  -- fallback a heurística por sesiones (igual que v1).
  with hist as (
    select snapshot_date, score from readiness_history
    where user_id = p_user_id
      and snapshot_date >= current_date - interval '14 days'
    order by snapshot_date
  ),
  regr as (
    -- Pendiente simple: (score_last - score_first) / días. Robusto con 2+ puntos.
    select
      (max(score) filter (where snapshot_date = (select max(snapshot_date) from hist))
       - max(score) filter (where snapshot_date = (select min(snapshot_date) from hist)))::numeric
      / nullif(
          extract(epoch from (
            (select max(snapshot_date) from hist) - (select min(snapshot_date) from hist)
          )) / 86400.0, 0) as slope_per_day,
      count(*) as n
    from hist
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

  -- Banda de confianza: ancho ∝ √(falta de cobertura) + dispersión inter-dominio.
  -- Mínimo 3 pts, máximo 25. Clamp final a [0,100] en el lado consumidor.
  v_ci_width := greatest(3.0, least(25.0,
    12.0 * sqrt(greatest(0, 1 - (v_studied::numeric / nullif(v_total, 0))))
    + 0.35 * coalesce(v_domain_stddev, 0)
  ));

  -- P(aprobar)
  v_pass_prob := _readiness_pass_probability(v_score, v_studied, v_total);

  -- History (30 días, para sparkline)
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', snapshot_date, 'score', score, 'pass_probability', pass_probability
  ) order by snapshot_date), '[]'::jsonb)
  into v_history
  from readiness_history
  where user_id = p_user_id
    and snapshot_date >= current_date - interval '30 days';

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

-- ---------------------------------------------------------------- snapshot
-- Reemplaza el 014.snapshot_readiness para también insertar en history.
-- Idempotente por día (ON CONFLICT).
create or replace function snapshot_readiness(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score numeric;
  v_studied int;
  v_by_domain jsonb;
  v_pass_prob numeric;
begin
  select score, studied_concepts, by_domain, pass_probability
  into v_score, v_studied, v_by_domain, v_pass_prob
  from get_exam_readiness_v2(p_user_id, 'aws-saa-c03');

  insert into readiness_history (user_id, snapshot_date, score, pass_probability, studied_concepts, by_domain)
  values (p_user_id, current_date, coalesce(v_score, 0), coalesce(v_pass_prob, 0), coalesce(v_studied, 0), coalesce(v_by_domain, '[]'::jsonb))
  on conflict (user_id, snapshot_date)
  do update set
    score = excluded.score,
    pass_probability = excluded.pass_probability,
    studied_concepts = excluded.studied_concepts,
    by_domain = excluded.by_domain;

  update profiles
  set last_readiness_score = v_score,
      last_readiness_at = now()
  where id = p_user_id;

  return coalesce(v_score, 0);
end;
$$;

grant execute on function snapshot_readiness(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------- batch
-- Snapshot masivo para el cron diario. Limita a usuarios con estudio reciente
-- o fecha de examen futura, para no snapshotear cuentas muertas.
create or replace function snapshot_readiness_batch()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_user uuid;
begin
  for v_user in
    select distinct p.id
    from profiles p
    where p.onboarding_completed = true
      and (
        (p.exam_target_date is not null and p.exam_target_date >= current_date - interval '30 days')
        or exists (
          select 1 from study_sessions ss
          where ss.user_id = p.id
            and ss.created_at >= now() - interval '21 days'
        )
      )
  loop
    perform snapshot_readiness(v_user);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

grant execute on function snapshot_readiness_batch() to service_role;
