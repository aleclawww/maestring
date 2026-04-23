-- 024 — Exam simulator: full-length proctored-style simulation, server-
-- authoritative timer, domain-weighted question selection from the pool.
-- Outcomes feed snapshot_readiness() / P(pass) calibration.

-- ---- Status enum ----
do $$ begin
  create type exam_session_status as enum ('in_progress', 'submitted', 'abandoned');
exception when duplicate_object then null; end $$;

-- ---- exam_sessions ----
create table if not exists exam_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  certification_id text not null default 'aws-saa-c03',
  status exam_session_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,            -- started_at + duration
  submitted_at timestamptz,
  total_questions int not null,                -- typically 65 for SAA-C03
  correct_count int,                           -- filled on submit
  scaled_score int,                            -- 100-1000 AWS-style
  passed boolean,                              -- scaled >= 720
  by_domain jsonb,                             -- breakdown at submit
  created_at timestamptz not null default now()
);

create index if not exists exam_sessions_user_started on exam_sessions (user_id, started_at desc);
create index if not exists exam_sessions_status on exam_sessions (status);

alter table exam_sessions enable row level security;

create policy "exam_sessions_self_read" on exam_sessions
  for select using (auth.uid() = user_id);

-- ---- exam_session_items ----
-- One row per question in an exam. Locked at start so refresh/cheating doesn't
-- reshuffle. user_answer nullable until answered; flagged for navigator.
create table if not exists exam_session_items (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references exam_sessions(id) on delete cascade,
  question_id uuid not null references questions(id) on delete restrict,
  position int not null,                       -- 1..total_questions
  user_answer_index int,
  is_correct boolean,
  flagged boolean not null default false,
  answered_at timestamptz,
  unique (session_id, position),
  unique (session_id, question_id)
);

create index if not exists exam_session_items_session on exam_session_items (session_id, position);

alter table exam_session_items enable row level security;

create policy "exam_session_items_self_read" on exam_session_items
  for select using (exists (
    select 1 from exam_sessions s where s.id = session_id and s.user_id = auth.uid()
  ));

-- ---- start_exam_session ----
-- Selects p_total questions from the pool respecting domain weights. Falls back
-- to random-fill if a domain is under-quota. Returns the session id.
create or replace function start_exam_session(
  p_user_id uuid,
  p_certification_id text default 'aws-saa-c03',
  p_total int default 65,
  p_duration_minutes int default 130
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_deadline timestamptz;
  v_existing uuid;
begin
  -- Abandon any stale in_progress session (>24h) so user can start fresh.
  update exam_sessions
  set status = 'abandoned'
  where user_id = p_user_id
    and status = 'in_progress'
    and started_at < now() - interval '24 hours';

  -- One active session at a time.
  select id into v_existing from exam_sessions
  where user_id = p_user_id and status = 'in_progress'
  limit 1;
  if v_existing is not null then
    return v_existing;
  end if;

  v_deadline := now() + make_interval(mins => p_duration_minutes);

  insert into exam_sessions (user_id, certification_id, total_questions, deadline_at)
  values (p_user_id, p_certification_id, p_total, v_deadline)
  returning id into v_session_id;

  -- Select quota per domain, proportional to exam_weight_percent.
  -- Round each domain independently; allocate remainder to the largest weight.
  with dom_weights as (
    select d.id as domain_id,
           d.exam_weight_percent as w,
           greatest(1, round((d.exam_weight_percent::numeric / 100) * p_total))::int as quota
    from knowledge_domains d
    where d.certification_id = p_certification_id
  ),
  picked as (
    select q.id as question_id, d.domain_id, row_number() over (
      partition by d.domain_id
      order by random()
    ) as rn
    from dom_weights d
    join concepts c on c.domain_id = d.domain_id and c.certification_id = p_certification_id
    join questions q on q.concept_id = c.id and q.is_active = true
  ),
  per_domain as (
    select p.question_id
    from picked p
    join dom_weights d on d.domain_id = p.domain_id
    where p.rn <= d.quota
  ),
  -- If we didn't get p_total (pool too thin), top up with any remaining questions.
  fill as (
    select q.id as question_id
    from questions q
    join concepts c on c.id = q.concept_id and c.certification_id = p_certification_id
    where q.is_active = true
      and q.id not in (select question_id from per_domain)
    order by random()
    limit greatest(0, p_total - (select count(*) from per_domain))
  ),
  final_q as (
    select question_id, row_number() over () as pos from (
      select * from per_domain
      union all
      select * from fill
    ) u
  )
  insert into exam_session_items (session_id, question_id, position)
  select v_session_id, question_id, pos::int
  from final_q
  where pos <= p_total;

  return v_session_id;
end;
$$;

revoke all on function start_exam_session(uuid, text, int, int) from public, anon;
grant execute on function start_exam_session(uuid, text, int, int) to authenticated, service_role;

-- ---- record_exam_answer ----
-- Idempotent answer recording for a given (session, position). Rejects if
-- session is not in_progress or past deadline.
create or replace function record_exam_answer(
  p_user_id uuid,
  p_session_id uuid,
  p_position int,
  p_answer_index int,
  p_flagged boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session exam_sessions%rowtype;
  v_correct int;
begin
  select * into v_session from exam_sessions where id = p_session_id;
  if not found or v_session.user_id <> p_user_id then
    raise exception 'exam session not found';
  end if;
  if v_session.status <> 'in_progress' then
    raise exception 'exam session is not in progress';
  end if;
  if now() > v_session.deadline_at then
    raise exception 'exam deadline has passed';
  end if;

  select q.correct_index into v_correct
  from exam_session_items i
  join questions q on q.id = i.question_id
  where i.session_id = p_session_id and i.position = p_position;

  if v_correct is null then
    raise exception 'invalid position';
  end if;

  update exam_session_items
  set user_answer_index = p_answer_index,
      is_correct = (p_answer_index = v_correct),
      flagged = p_flagged,
      answered_at = now()
  where session_id = p_session_id and position = p_position;
end;
$$;

revoke all on function record_exam_answer(uuid, uuid, int, int, boolean) from public, anon;
grant execute on function record_exam_answer(uuid, uuid, int, int, boolean) to authenticated, service_role;

-- ---- submit_exam_session ----
-- Scores the session, computes AWS-style scaled score (100-1000, pass=720),
-- by-domain breakdown, writes user_exam_outcomes row, returns the summary.
create or replace function submit_exam_session(
  p_user_id uuid,
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session exam_sessions%rowtype;
  v_correct int;
  v_total int;
  v_raw numeric;
  v_scaled int;
  v_passed boolean;
  v_by_domain jsonb;
  v_result jsonb;
begin
  select * into v_session from exam_sessions where id = p_session_id;
  if not found or v_session.user_id <> p_user_id then
    raise exception 'exam session not found';
  end if;
  if v_session.status <> 'in_progress' then
    -- Return cached result for idempotency.
    return jsonb_build_object(
      'session_id', v_session.id,
      'correct_count', v_session.correct_count,
      'total', v_session.total_questions,
      'scaled_score', v_session.scaled_score,
      'passed', v_session.passed,
      'by_domain', v_session.by_domain,
      'already_submitted', true
    );
  end if;

  select
    count(*) filter (where is_correct),
    count(*)
  into v_correct, v_total
  from exam_session_items
  where session_id = p_session_id;

  -- AWS SAA-C03 scaled score: raw pct mapped to [100, 1000] with pass at 720.
  -- Calibration is heuristic; refined once we hit 500+ outcomes (see admin/outcomes).
  v_raw := case when v_total > 0 then v_correct::numeric / v_total else 0 end;
  v_scaled := round(100 + v_raw * 900)::int;
  v_passed := v_scaled >= 720;

  -- Per-domain breakdown.
  select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) into v_by_domain
  from (
    select
      kd.slug,
      kd.name,
      kd.exam_weight_percent as weight,
      count(*)::int as total,
      count(*) filter (where i.is_correct)::int as correct,
      round(
        case when count(*) > 0
          then (count(*) filter (where i.is_correct))::numeric / count(*)
          else 0
        end, 4
      ) as accuracy
    from exam_session_items i
    join questions q on q.id = i.question_id
    join concepts c on c.id = q.concept_id
    join knowledge_domains kd on kd.id = c.domain_id
    where i.session_id = p_session_id
    group by kd.slug, kd.name, kd.exam_weight_percent
    order by kd.exam_weight_percent desc
  ) d;

  update exam_sessions
  set status = 'submitted',
      submitted_at = now(),
      correct_count = v_correct,
      scaled_score = v_scaled,
      passed = v_passed,
      by_domain = v_by_domain
  where id = p_session_id;

  -- Note: simulator outcomes stay on exam_sessions. profiles.exam_outcome is
  -- reserved for the real AWS exam (captured via outcome-capture prompt), so
  -- the calibrator can distinguish simulated vs real.

  v_result := jsonb_build_object(
    'session_id', v_session.id,
    'correct_count', v_correct,
    'total', v_total,
    'scaled_score', v_scaled,
    'raw_accuracy', round(v_raw, 4),
    'passed', v_passed,
    'by_domain', v_by_domain,
    'already_submitted', false
  );

  return v_result;
end;
$$;

revoke all on function submit_exam_session(uuid, uuid) from public, anon;
grant execute on function submit_exam_session(uuid, uuid) to authenticated, service_role;
