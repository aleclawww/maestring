# Schema Drift Audit — Production vs. `supabase/migrations/`

**Date:** 2026-05-24
**Branch audited:** `claude/elaboration-mode`
**Local DB state:** migrations 001-052 applied cleanly
**Scope:** repo-evidence only — production was not queried.

## Summary

The drift previously surfaced in `TODO.md` is confirmed and unchanged: **9 tables exist in production with no `CREATE TABLE` statement in any migration file**, and **none of them are referenced by any code in `app/`, `lib/`, `components/`, `scripts/`, or `types/`**. They are dead weight from the production schema's perspective of the application — but a real blocker for any `supabase db reset` against staging or any future `supabase db diff` workflow.

No additional drift was found on the inverse axis: every table touched by `.from(...)` in code and every function called via `.rpc(...)` resolves to a `CREATE TABLE` / `CREATE FUNCTION` in `supabase/migrations/`. The repo-side schema is self-consistent.

## Drift candidates — orphaned prod tables

| Table | Referenced in code? | Likely origin |
|---|---|---|
| `ab_assignments` | None | Created manually in prod (likely via Supabase Studio) for an A/B testing prototype that never shipped to `app/`. |
| `ab_experiments` | None | Same as above — A/B framework scaffolding, no consumer code. |
| `ambient_cards` | None | Ambient-learning surface prototype; quota field `ambient` still referenced in `lib/subscription/check.ts`, but no `.from('ambient_cards')` exists. |
| `aws_service_name_map` | None | Likely lookup table for the original "Gemelo Digital" learning engine prototype (`claude/nifty-hugle-8b8fb4`, since merged). |
| `concept_confusion_pairs` | None | Same lineage — modeling concept-confusion graph for adaptive learning. |
| `concept_exposures` | None | Same lineage — per-user concept-exposure log (now superseded by `user_concept_states` + `user_learning_state`). |
| `coverage_matrix` | None | Likely backing for a blueprint-coverage view; today the active view is `blueprint_coverage` (defined in migrations, see `types/supabase-generated.ts:1537`). |
| `elaboration_prompts` | None | Predates the shipped Elaboration Mode (migration `052`), which stores prompts inline in `concept_elaborations.json` and the `concept_elaborations` table. |
| `learning_phase_transitions` | None | Audit log for journey-phase changes that was never wired up (see `TODO.md` "journey_phase persistence" — nothing recomputes phase today). |

Verified by:
- `Grep` across `**/*.{ts,tsx,sql}` for each of the 9 names: zero matches outside `TODO.md`.
- `types/supabase-generated.ts` (regenerated from local DB) contains none of them.
- All `.from('X')` and `.rpc('Y')` call sites collected from `app/` + `lib/` + `scripts/` resolve to migration-defined objects.

## Inverse check — does code reference anything not in migrations?

No. Every distinct table name discovered:

```
admin_actions, chunk_concept_links, concept_briefs, concept_elaborations,
concepts, content_chunks, cron_runs, domain_topics, elaboration_attempts,
exam_session_items, exam_sessions, knowledge_domains, llm_usage,
magic_link_uses, metacognitive_calibration, profiles, question_attempts,
question_reports, questions, referrals, streak_freeze_log, stripe_events,
study_sessions, subscriptions, testimonials, user_concept_states,
user_documents, user_learning_state
```

…has a corresponding `CREATE TABLE` in `supabase/migrations/`. Same for the RPCs (`get_user_stats`, `get_exam_readiness_v2`, `pick_pool_question`, `admin_*`, `seed_concept_states_from_self_rating`, `snapshot_readiness_batch`, `concepts_needing_refill`, `ensure_user_bootstrapped`, `update_cognitive_fingerprint`, `increment_session_counters`, `increment_profile_xp`, `get_blueprint_task_accuracy`, `get_study_heatmap`, `get_users_needing_nudge`, `admin_grant_pro`). No orphaned function calls.

## Risk ranking

1. **Low product risk, high ops risk — all 9 tables.** Because no application code touches them, deleting them in prod would not break any user flow. But any contributor running `npx supabase db reset` against staging gets a schema that diverges from prod (missing tables + likely missing RLS policies). The risk is silent: a future migration that does `ALTER TABLE ... ADD CONSTRAINT` or that introduces a name collision with one of these orphans will fail in prod long after passing CI on a clean reset.

2. **Compounding risk — `supabase db diff` is unusable today.** Until reconciled, every diff against prod will show the same 9 tables as "missing," masking any *real* drift that appears later (e.g. an emergency hotfix done via Studio). The audit cannot distinguish "known orphan" from "new emergency change" until the baseline is restored.

3. **No load-bearing flow at risk.** No critical user path (study loop, billing, onboarding, admin) depends on any of the 9 tables. The Elaboration Mode flow uses `concept_elaborations` + `elaboration_attempts` (both defined in `052`), *not* the orphan `elaboration_prompts`.

## Recommendation

Stick with the plan already documented in `TODO.md`: **wait for Supabase Pro (Point-in-Time Recovery) before touching prod schema.** Once available, the cleanest close-out is:

1. **Capture, don't delete.** `pg_dump --schema-only --no-owner` of prod against the 9 tables (plus their indexes, RLS, triggers). The contents may carry production data even if unused — confirm row counts before any drop.
2. **Author migration `060_reconcile_orphaned_schemas.sql`** as `CREATE TABLE IF NOT EXISTS` for each, mirroring the prod DDL exactly. This makes the repo and prod converge without touching prod itself. Apply locally, regenerate types, confirm `supabase db diff` against prod is empty.
3. **Then, and only then, decide per-table** whether to keep (write the consumer) or drop (separate migration `061_drop_unused_orphans.sql`). `coverage_matrix` and `learning_phase_transitions` in particular may have non-zero row counts worth preserving in a backup table before drop.
4. **Forbid manual schema changes in prod going forward.** Add a one-line note to `CLAUDE.md` under "Architecture" — any new table must land via a numbered migration, no exceptions, even for prototypes. The 9 orphans are exactly what happens without this rule.

Writing the missing migrations (option 2) is the lowest-risk first step and unblocks staging rebuilds immediately. The dead-code question (keep vs. drop) can be answered later without further pressure on the release pipeline.

## Files referenced

- `C:\Users\aleop\Desktop\maestring\TODO.md` (lines 5-39)
- `C:\Users\aleop\Desktop\maestring\types\supabase-generated.ts`
- `C:\Users\aleop\Desktop\maestring\supabase\migrations\` (001 → 052)
- `C:\Users\aleop\Desktop\maestring\lib\subscription\check.ts` (only surviving reference to the `ambient` concept)
