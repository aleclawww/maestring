-- ========================================================================
-- 032 — Make answer evaluations idempotent per (session, question)
--
-- Problem: /api/study/evaluate did read-then-write on user_concept_states,
-- study_sessions.questions_answered, and study_sessions.correct_answers.
-- A double-click on the "Submit" button (or a retried network request)
-- produced two concurrent POSTs, each of which:
--   * read user_concept_states at the same pre-update snapshot,
--   * computed the same FSRS next-state (so the second write clobbered
--     the first with identical numbers),
--   * incremented the counters from the same base value (so one of the
--     increments was silently lost — study_sessions.questions_answered
--     under-counted by 1 on every double-submit).
--
-- We also inserted a second question_attempts row, polluting the
-- learning-signal ledger with a duplicate event.
--
-- Fix: enforce uniqueness at the DB layer. (session_id, question_id)
-- is already the natural idempotency key — within a session, each
-- question is generated once and we only ever want one attempt row
-- for it. The UNIQUE constraint lets the evaluate route use the
-- insert-first pattern: the race-winner proceeds with FSRS + counter
-- updates; the race-loser sees a 23505, reads back the winning
-- attempt, and returns its evaluation unchanged.
--
-- Before applying: dedupe any existing duplicate rows, keeping the
-- earliest attempt (the canonical one the client saw). This should
-- be a no-op on a clean DB but is safe to run.
-- ------------------------------------------------------------------------

begin;

-- Remove any duplicate attempts, keeping the oldest row per (session, question).
with ranked as (
  select
    id,
    row_number() over (
      partition by session_id, question_id
      order by created_at asc, id asc
    ) as rn
  from question_attempts
)
delete from question_attempts
where id in (select id from ranked where rn > 1);

-- Enforce idempotency going forward.
alter table question_attempts
  add constraint question_attempts_session_question_unique
  unique (session_id, question_id);

commit;
