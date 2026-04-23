# Data Retention Policy

Principle: keep what we need to deliver the product and meet legal obligations;
delete the rest on a predictable schedule. Automated where possible.

## Retention by data class

| Class | Tables / stores | Retention | Deletion mechanism |
|---|---|---|---|
| Account identity | `auth.users`, `public.profiles` | Until account deletion + 30 day grace | User-initiated via settings; hard delete after grace |
| Study activity | `question_attempts`, `study_sessions`, `user_concept_states` | Lifetime of account | Cascaded on account deletion |
| Exam sessions | `exam_sessions`, `exam_session_items` | Lifetime of account | Cascaded on account deletion |
| Uploaded documents | `user_documents` + Supabase Storage `user-documents` bucket | Lifetime of account; failed uploads purged after **7 days** | Cleanup cron (`app/api/cron/cleanup/route.ts`) |
| Document embeddings | `document_chunks` | Tied to source document | Cascaded on document delete |
| Magic link JTI | `magic_link_uses` | **30 days** | Cleanup cron |
| Abandoned sessions | `study_sessions` with `status='active'` untouched | Flipped to `abandoned` after **2 days** | Cleanup cron |
| Stripe webhook events | `stripe_events` | **90 days** | Cleanup cron |
| Cron run ledger | `cron_runs` | **90 days** | Cleanup cron |
| Referral codes & clicks | `referrals` | Lifetime of referrer account | Cascaded on account deletion |
| Streak freeze log | `streak_freeze_log` | Lifetime of account | Cascaded |
| Backups (Supabase) | Point-in-time + daily | **7 days PITR, 30 days daily** (Supabase defaults) | Supabase-managed |
| Application logs | Vercel + Sentry | **30 days** (Vercel default), **90 days** (Sentry plan) | Provider-managed |

## Account deletion flow

User requests deletion → settings page → confirmation → `auth.admin.deleteUser`.
Foreign keys cascade through `profiles` to all user-owned rows. Storage objects
under `user-documents/<user_id>/*` removed by a server action in the same
request. Deletion is **hard** (no soft-delete) except for the 30-day grace:
we flag `profiles.deletion_requested_at` and the cleanup cron hard-deletes after
30 days. A user can cancel deletion during grace via support email.

## Data export (GDPR / SOC2)

Users can request a copy of their data at `security@maestring.com`. Turnaround
target: **14 days**. Export includes: profile, attempts, sessions, exam history,
uploaded document metadata (not file contents unless requested), subscription
history. Delivered as a JSON bundle + CSV flat files via time-limited signed URL.

## What we don't retain

- We do **not** log request bodies containing question text or user answers
  outside the DB row they belong to. Pino logger redacts `answer`, `email`,
  `token`, `authorization`. Verify with `grep -n redact lib/logger.ts`.
- We do **not** store Stripe card numbers. Stripe holds PAN; we store `customer_id`
  and `price_id` only.
- We do **not** share user study data with the LLM providers in a way that
  associates it with an identified user — requests to Anthropic/OpenAI carry
  no user id.

## Review cadence

This doc reviewed quarterly or on any schema change touching a PII column.
Last review: 2026-04-23. Next review: 2026-07-23.
