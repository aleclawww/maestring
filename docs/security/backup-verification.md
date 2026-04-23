# Backup Verification

A backup you haven't restored is a backup you don't have. This runbook is the
quarterly drill to prove we can recover.

## What Supabase gives us

- **Point-in-time recovery (PITR)** — 7 days on Pro plan
- **Daily backups** — 30 days retention
- Triggered from the Supabase dashboard → Database → Backups

## Quarterly drill

Run on the first business day of each quarter. Log outcome in `docs/security/backup-drills.md`
(append-only).

### Steps

1. Pick a restore point ~24h old from the daily backups list.
2. Restore into a **new** project (name it `maestring-restore-YYYY-QN`). Never
   restore over prod.
3. Connect locally:
   ```
   npx supabase link --project-ref <new-ref>
   psql "$DATABASE_URL_RESTORED"
   ```
4. Smoke checks — each must pass:
   ```sql
   select count(*) from auth.users;                 -- matches prod ±1 day of growth
   select count(*) from public.profiles;            -- matches auth.users ±1
   select count(*) from public.question_attempts;   -- non-zero
   select count(*) from public.subscriptions where status = 'active';  -- matches Stripe active count
   select max(created_at) from public.question_attempts;  -- within the chosen restore window
   ```
5. Pick a real user id, verify their concept states load:
   ```sql
   select count(*) from public.user_concept_states where user_id = '<id>';
   ```
6. Verify RLS is intact: connect with an anon key, confirm cross-user reads fail.
7. Delete the restored project.

### Pass criteria

- Row counts within expected drift of prod at chosen restore point
- RLS denies anonymous cross-user reads
- No migration errors in restore logs

### On failure

Failing the drill is itself a SEV-2 incident. Open the incident doc, page the
founder, treat as a live recovery exercise.

## Storage bucket backups

Supabase Storage is **not** covered by PITR in the same way as Postgres. The
`user-documents` bucket is the main risk. Mitigations:

- Source documents are user-owned — users can re-upload on loss.
- Processing outputs (`document_chunks`, embeddings) are reproducible from a
  source file.
- For higher durability: periodic rclone sync to an S3-compatible cold store.
  Tracked as a follow-up — not in place yet. Note this gap when talking to
  enterprise buyers.

## Automated health signal

The cleanup cron writes to `cron_runs` nightly. If `cron_runs` shows **no rows**
for >48h, DB writes are silently failing — check `/admin/cron`. This is our
cheap continuous signal that the primary DB is accepting writes; it doesn't
replace the quarterly restore drill.
