-- Migration 038: blueprint-aware pool selection
--
-- Upgrades pick_pool_question with three ranking signals:
--   1. Canonical preference  — is_canonical=true questions first (higher quality)
--   2. Blueprint task diversity — de-prioritise tasks already seen this session
--   3. Pattern tag rotation   — de-prioritise patterns already shown this session
--
-- New return columns: blueprint_task_id, pattern_tag, is_canonical
-- (added to 036_question_metadata; safe to select here)
--
-- Backwards-compatible: new params have defaults so existing callers still work.

drop function if exists pick_pool_question(uuid, uuid);

create or replace function pick_pool_question(
  p_user_id       uuid,
  p_concept_id    uuid,
  p_seen_tasks    text[] default '{}',     -- blueprint_task_ids shown this session
  p_seen_patterns text[] default '{}'      -- pattern_tags shown this session
)
returns table (
  id               uuid,
  question_text    text,
  options          jsonb,
  correct_index    int,
  explanation      text,
  explanation_deep text,
  hint             text,
  key_insight      text,
  scenario_context jsonb,
  difficulty       double precision,
  question_type    question_type,
  blueprint_task_id text,
  pattern_tag      text,
  is_canonical     boolean
)
language sql
stable
as $$
  select
    q.id,
    q.question_text,
    q.options,
    q.correct_index,
    q.explanation,
    q.explanation_deep,
    q.hint,
    q.key_insight,
    q.scenario_context,
    q.difficulty,
    q.question_type,
    q.blueprint_task_id,
    q.pattern_tag,
    q.is_canonical
  from questions q
  where q.concept_id = p_concept_id
    and q.is_active        = true
    and q.review_status    = 'approved'
    and not exists (
      select 1
      from   question_attempts a
      where  a.user_id    = p_user_id
        and  a.question_id = q.id
    )
  order by
    -- 1. Canonical questions first (hand-curated, higher signal)
    (q.is_canonical)                                desc,
    -- 2. Prefer blueprint tasks not yet seen this session
    (q.blueprint_task_id = any(p_seen_tasks))       asc,
    -- 3. Prefer pattern tags not yet seen this session
    (q.pattern_tag = any(p_seen_patterns))          asc,
    -- 4. Least-served globally, then random to break ties
    q.times_shown                                   asc,
    random()
  limit 1
$$;

comment on function pick_pool_question(uuid, uuid, text[], text[]) is
  'Selects a pool question for a user+concept. Prefers: canonical > unseen-task > unseen-pattern > least-shown > random. Pass p_seen_tasks and p_seen_patterns from session context for curriculum diversity.';
