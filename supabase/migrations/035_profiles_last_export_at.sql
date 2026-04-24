-- Migration 035: add last_export_at to profiles for GDPR export rate-limiting
--
-- POST /api/account/export (added alongside this migration) gives users their
-- full data as a downloadable JSON file (GDPR Art. 20 — right to data
-- portability). Without this column the rate-limit check in that route
-- fails-open (every click generates an export) — a user or a bug could
-- hammer the endpoint and generate thousands of large DB reads per hour.
--
-- The column is nullable: NULL means "never exported". The route reads it
-- with maybeSingle() and fails-open on any read error, so the export
-- feature continues to work even if this migration hasn't run yet (e.g.
-- a dev environment with an older snapshot).

alter table profiles
  add column if not exists last_export_at timestamptz;

comment on column profiles.last_export_at is
  'Timestamp of most recent GDPR data export. Used to rate-limit exports to once per hour. NULL = never exported.';
