-- Migration 045: Add email_nudges_enabled to profiles
--
-- NotificationSettings (settings page) saves email_nudges_enabled via
-- PATCH /api/profile/me, but the column didn't exist — every PATCH silently
-- failed or errored. Adding it here with a safe default so existing rows keep
-- their current (implied) opt-in behaviour.

alter table profiles
  add column if not exists email_nudges_enabled boolean not null default true;

comment on column profiles.email_nudges_enabled is
  'Whether the user has opted in to email study reminders (nudges). Defaults to true.';
