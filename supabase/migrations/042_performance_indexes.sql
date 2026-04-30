-- Migration 042: Performance indexes for hot query paths
--
-- Identified via query analysis of the main hot paths:
--   1. user_concept_states lookups by (user_id, certification_id) — every study
--      session start triggers a full scan of this table to build the FSRS queue.
--   2. question_attempts lookups by (user_id, session_id, created_at) — used
--      by the evaluate route's duplicate check, weekly digest RPCs, and the
--      cognitive fingerprint function.
--   3. questions pool queries by (review_status, is_active, blueprint_task_id)
--      — the refill-pool cron and BlueprintAccuracyCard RPC hit this filter
--      on every invocation.
--   4. study_sessions lookups by (user_id, status) — the dashboard page and
--      cron nudge check query this constantly.
--   5. cron_runs by (job_name, started_at) — runCron reads the latest row
--      on every cron invocation; without an index this is a full table scan
--      that gets slower as history accumulates.
--
-- All indexes use CONCURRENTLY so they don't lock production tables during
-- migration. Supabase CLI applies migrations in a transaction, but CONCURRENTLY
-- can't run inside a transaction — each statement is intentional and idempotent
-- (CREATE INDEX IF NOT EXISTS).

-- 1. user_concept_states — primary FSRS queue building query
--    Selector fetches all states for (user_id, certification_id) on every
--    session start. Without this, Postgres does a seq-scan of the entire table.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ucs_user_cert
  ON user_concept_states(user_id, certification_id);

-- 2. user_concept_states — next_review_date ordering for due-items filter
--    The FSRS selector sorts by next_review_date to find overdue items.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ucs_next_review
  ON user_concept_states(user_id, next_review_date)
  WHERE next_review_date IS NOT NULL;

-- 3. question_attempts — duplicate detection (evaluate route idempotency gate)
--    evaluate/route.ts checks (session_id, question_id) before every insert.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_qa_session_question
  ON question_attempts(session_id, question_id);

-- 4. question_attempts — recency queries (digest RPCs, cognitive fingerprint)
--    Weekly digest and cognitive fingerprint both query recent attempts by user.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_qa_user_created
  ON question_attempts(user_id, created_at DESC);

-- 5. question_attempts — blueprint task accuracy RPC
--    get_blueprint_task_accuracy joins on questions.blueprint_task_id; this
--    index covers the user+concept join used inside that aggregate.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_qa_concept
  ON question_attempts(concept_id);

-- 6. questions pool — approved active questions by task
--    BlueprintAccuracyCard RPC and refill-pool cron filter on these three columns.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_pool
  ON questions(review_status, is_active, blueprint_task_id)
  WHERE review_status = 'approved' AND is_active = true;

-- 7. study_sessions — user sessions by status (dashboard, cron nudge)
--    Dashboard page: recent completed sessions. Nudge cron: sessions_today count.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ss_user_status
  ON study_sessions(user_id, status, created_at DESC);

-- Legacy completed_at column used by older queries (pre-010 migration)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ss_user_completed
  ON study_sessions(user_id, is_completed, created_at DESC);

-- 8. cron_runs — runCron reads the most recent row for a given job_name
--    to detect concurrent runs and record status. Grows unbounded over time.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cron_runs_job_started
  ON cron_runs(job_name, started_at DESC);

-- 9. profiles — referral code lookups (/r/[code] redirect handler)
--    The referral route does WHERE referral_code = $1 on every link click.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_referral_code
  ON profiles(referral_code)
  WHERE referral_code IS NOT NULL;

-- 10. referrals — referrer dashboard query
--     ReferralsPage fetches all referrals WHERE referrer_id = user_id.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_referrer
  ON referrals(referrer_id, created_at DESC);

-- 11. user_question_pool — pool picker queries by (user_id, concept_id)
--     pick_pool_question RPC filters the pool by user + concept to find
--     questions the user hasn't seen yet.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_uqp_user_concept
  ON user_question_pool(user_id, concept_id)
  WHERE seen_at IS NULL;

-- Analysis: table stats are not updated by CONCURRENTLY — run ANALYZE after
-- this migration in production to let the planner pick up the new indexes.
ANALYZE user_concept_states;
ANALYZE question_attempts;
ANALYZE questions;
ANALYZE study_sessions;
ANALYZE cron_runs;
ANALYZE profiles;
