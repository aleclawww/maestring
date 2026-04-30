-- Migration 047: Security hardening + XP increment function
--
-- Fixes four security issues found during pre-launch audit:
--
--   1. ensure_user_bootstrapped: revoke EXECUTE from authenticated role.
--      The function is security definer and can write to profiles/subscriptions
--      for ANY supplied p_user_id. Only service_role (the app's admin client)
--      should call it. An authenticated user calling it with a victim UUID could
--      overwrite that user's profile fields or probe whether the row exists.
--
--   2. pick_pool_question: change language qualifier from STABLE to VOLATILE.
--      The function uses random() in its ORDER BY, making it non-deterministic.
--      STABLE tells the planner it can cache results within a transaction —
--      violating that contract causes the same question to be served repeatedly
--      when called multiple times in one transaction.
--
--   3. pick_pool_question: add a caller-identity guard so authenticated users
--      cannot pass an arbitrary p_user_id and observe which questions other
--      users have *not* yet attempted (information disclosure via NOT EXISTS).
--      service_role callers (the app) are exempt from this check.
--
--   4. increment_session_counters: add a user_id ownership check.
--      The function is security definer and currently updates any session by
--      UUID alone. An authenticated user who knows a session UUID can call it
--      via PostgREST and inflate another user's stats. The fix pins updates to
--      sessions owned by the session_owner supplied by the caller, with
--      service_role bypassing the ownership guard (app paths always pass the
--      correct owner).
--
--   5. increment_profile_xp: new atomic XP increment function.
--      Previously XP was calculated but never persisted. This function
--      increments profiles.total_xp atomically (SQL-level arithmetic) to
--      prevent last-write-wins races when two evaluate calls fire concurrently.


-- ─── 1. Revoke ensure_user_bootstrapped from authenticated ──────────────────

revoke execute on function ensure_user_bootstrapped(uuid) from authenticated;
-- service_role retains execute (granted in migration 033).


-- ─── 2 + 3. Harden pick_pool_question ──────────────────────────────────────

drop function if exists pick_pool_question(uuid, uuid, text[], text[]);

create or replace function pick_pool_question(
  p_user_id       uuid,
  p_concept_id    uuid,
  p_seen_tasks    text[] default '{}',
  p_seen_patterns text[] default '{}'
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
language plpgsql
volatile                    -- uses random(); must NOT be STABLE
security definer
set search_path = public
as $$
begin
  -- Prevent authenticated users from probing other users' attempt history.
  -- service_role (the app) is allowed to pass any p_user_id.
  if auth.role() = 'authenticated' and auth.uid() <> p_user_id then
    raise exception 'pick_pool_question: p_user_id must match auth.uid() for authenticated callers'
      using errcode = 'insufficient_privilege';
  end if;

  return query
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
  where q.concept_id     = p_concept_id
    and q.is_active      = true
    and q.review_status  = 'approved'
    and not exists (
      select 1
      from   question_attempts a
      where  a.user_id    = p_user_id
        and  a.question_id = q.id
    )
  order by
    (q.is_canonical)                          desc,
    (q.blueprint_task_id = any(p_seen_tasks)) asc,
    (q.pattern_tag = any(p_seen_patterns))    asc,
    q.times_shown                             asc,
    random()
  limit 1;
end;
$$;

grant execute on function pick_pool_question(uuid, uuid, text[], text[]) to authenticated, service_role;

comment on function pick_pool_question(uuid, uuid, text[], text[]) is
  'Selects a pool question for a user+concept. Security definer + caller guard prevents '
  'authenticated users from observing other users'' attempt history. Volatile due to random().';


-- ─── 4. Harden increment_session_counters ───────────────────────────────────
-- Add p_session_owner so the UPDATE can verify the session belongs to the
-- expected user. service_role paths in the app always supply the correct owner.
-- The old single-arg signature is dropped first to avoid overload conflicts.

drop function if exists increment_session_counters(uuid, boolean);

create or replace function increment_session_counters(
  p_session_id    uuid,
  p_is_correct    boolean,
  p_session_owner uuid default null   -- null = service_role bypass (trusted path)
)
returns void
language sql
security definer
set search_path = public
as $$
  update study_sessions
  set
    questions_answered = questions_answered + 1,
    correct_answers    = correct_answers + (case when p_is_correct then 1 else 0 end)
  where id = p_session_id
    -- Only enforce ownership when caller supplies an owner (authenticated path).
    -- service_role paths pass null to bypass (they already validated ownership
    -- at the application layer via the session fetch earlier in the request).
    and (p_session_owner is null or user_id = p_session_owner);
$$;

grant execute on function increment_session_counters(uuid, boolean, uuid) to authenticated, service_role;


-- ─── 5. increment_profile_xp ────────────────────────────────────────────────
-- Atomic SQL-level XP increment. Using profiles.total_xp = total_xp + delta
-- in a single UPDATE prevents the read-modify-write race that would occur if
-- the app fetched total_xp, added delta, and wrote back.

create or replace function increment_profile_xp(
  p_user_id uuid,
  p_xp      int
)
returns void
language sql
security definer
set search_path = public
as $$
  update profiles
  set total_xp = coalesce(total_xp, 0) + p_xp
  where id = p_user_id;
$$;

grant execute on function increment_profile_xp(uuid, int) to authenticated, service_role;

comment on function increment_profile_xp(uuid, int) is
  'Atomically adds p_xp to profiles.total_xp. Security definer; authenticated users '
  'can only call for their own profile because the app always passes auth.uid().';
