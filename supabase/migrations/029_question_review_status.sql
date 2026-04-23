-- 029_question_review_status.sql
-- Gate pool-served questions behind an admin approval step. Previously every
-- AI-generated question landed in `questions` with is_active=true and was
-- immediately eligible to serve — no quality review possible.
--
-- New enum `question_review_status` + column on `questions`. Default is
-- 'approved' so all *existing* rows stay active and hot-path on-demand
-- generation keeps working unchanged. Cron/batch generation explicitly writes
-- 'pending' and those sit in a queue until an admin approves.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'question_review_status') then
    create type question_review_status as enum ('pending', 'approved', 'rejected');
  end if;
end$$;

alter table public.questions
  add column if not exists review_status question_review_status not null default 'approved',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reject_reason text;

create index if not exists questions_review_status_idx
  on public.questions (review_status) where review_status <> 'approved';

-- Pool picker must only serve approved + active questions.
drop function if exists pick_pool_question(uuid, uuid);
create or replace function pick_pool_question(p_user_id uuid, p_concept_id uuid)
returns table (
  id uuid,
  question_text text,
  options jsonb,
  correct_index int,
  explanation text,
  explanation_deep text,
  hint text,
  key_insight text,
  scenario_context jsonb,
  difficulty double precision,
  question_type question_type
)
language sql
stable
as $$
  select q.id, q.question_text, q.options, q.correct_index, q.explanation,
         q.explanation_deep, q.hint, q.key_insight, q.scenario_context,
         q.difficulty, q.question_type
  from questions q
  where q.concept_id = p_concept_id
    and q.is_active = true
    and q.review_status = 'approved'
    and not exists (
      select 1 from question_attempts a
      where a.user_id = p_user_id and a.question_id = q.id
    )
  order by q.times_shown asc, random()
  limit 1
$$;

-- Refill RPC must count only approved rows, otherwise a concept with 20
-- pending rows looks "full" and never gets more generated.
drop function if exists concepts_needing_refill(int);
create or replace function concepts_needing_refill(p_min int default 10)
returns table (concept_id uuid, pool_size int)
language sql
stable
as $$
  select c.id as concept_id,
         count(q.id) filter (where q.is_active and q.review_status = 'approved')::int as pool_size
  from concepts c
  left join questions q on q.concept_id = c.id
  group by c.id
  having count(q.id) filter (where q.is_active and q.review_status = 'approved') < p_min
  order by count(q.id) filter (where q.is_active and q.review_status = 'approved') asc
$$;

comment on column public.questions.review_status is
  'Admin approval gate. Only ''approved'' rows are eligible for pool serving (see pick_pool_question).';
