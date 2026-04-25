-- Migration 037: extend question_review_status enum
-- Adds 'needs_review' value for questions flagged by LLM QA crosscheck.

-- Postgres requires each ALTER TYPE ... ADD VALUE in its own transaction
-- and cannot run inside a transaction block (no BEGIN/COMMIT needed here).
ALTER TYPE question_review_status ADD VALUE IF NOT EXISTS 'needs_review';
