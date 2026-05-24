/**
 * Single-source-of-truth constants for the marketing surfaces.
 *
 * Anything that appears as a hard number on the landing page, the
 * /pricing route, or any other public-facing surface goes here. The
 * rule from 2026-05-24: every number on the page is checkable, and
 * checkable means "matches reality verified against code or prod
 * recently" — not "I round-numbered it from memory."
 */

/**
 * Count of approved + active questions in the prod `questions` table.
 *
 * Verified 2026-05-24 by running:
 *   select count(*) from questions
 *   where is_active = true and review_status = 'approved'
 * against the prod Supabase (NOT local — local is missing the curated
 * pool seed and shows ~500, which would underclaim by 4x).
 *
 * When the pool grows (Phase 1 question quality adds curated batches,
 * or a manual batch run), re-run the same query and bump this number.
 * DO NOT eyeball from memory, from CLAUDE.md, or from the seed file —
 * all three were wrong on 2026-05-24 (CLAUDE.md said "~2000" when prod
 * was 2,146; local seed was 504; the difference came from production-
 * only seed history that isn't in any script).
 */
export const QUESTION_COUNT_PROD = 2146
