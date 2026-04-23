-- 028_welcome_email_flag.sql
-- Track whether the welcome email has been sent. Used as an idempotency key so
-- repeated auth callbacks (e.g. a user clicks the magic link twice) don't
-- re-send. Nullable: null = never sent.

alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz;

comment on column public.profiles.welcome_email_sent_at is
  'Timestamp the welcome email was successfully dispatched. Null = not yet sent.';
