-- Pool-based question delivery: serve a previously-generated question for the
-- concept that this user has NOT seen yet, instead of calling the LLM. The
-- pool grows organically as users force generation; nightly refill is optional.

-- Pick a random unseen question for (user, concept). Returns NULL if pool empty.
create or replace function pick_pool_question(p_user_id uuid, p_concept_id uuid)
returns table (
  id uuid,
  question_text text,
  options jsonb,
  correct_index int,
  explanation text,
  difficulty double precision,
  question_type question_type
)
language sql
stable
as $$
  select q.id, q.question_text, q.options, q.correct_index, q.explanation, q.difficulty, q.question_type
  from questions q
  where q.concept_id = p_concept_id
    and q.is_active = true
    and not exists (
      select 1 from question_attempts a
      where a.user_id = p_user_id and a.question_id = q.id
    )
  order by q.times_shown asc, random()
  limit 1
$$;

-- Bump shown count when we serve a pool question (cheap counter).
create or replace function bump_question_shown(p_question_id uuid)
returns void
language sql
as $$
  update questions set times_shown = times_shown + 1 where id = p_question_id
$$;

-- Concepts under refill threshold — used by the nightly cron to know what to
-- top up. Returns concept_id + current pool size.
create or replace function concepts_needing_refill(p_min int default 10)
returns table (concept_id uuid, pool_size int)
language sql
stable
as $$
  select c.id as concept_id, count(q.id)::int as pool_size
  from concepts c
  left join questions q on q.concept_id = c.id and q.is_active = true
  group by c.id
  having count(q.id) < p_min
  order by count(q.id) asc
$$;
