-- Migration 010: Application-layer extensions
-- Adds columns the API routes assume (status/domain_id on sessions,
-- last_rating on concept states, notification_preferences on profiles)
-- without rewriting the canonical schema.

-- ---- Profiles ----
alter table profiles
  add column if not exists notification_preferences jsonb not null default
    '{"nudge_emails": true, "streak_emails": true, "weekly_recap": true, "product_updates": true}'::jsonb,
  add column if not exists exam_date date generated always as (exam_target_date) stored;

-- ---- User concept states ----
alter table user_concept_states
  add column if not exists last_rating smallint;

-- ---- Study sessions: add session-status state machine + per-session counters ----
alter table study_sessions
  add column if not exists status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned')),
  add column if not exists domain_id uuid references knowledge_domains(id) on delete set null,
  add column if not exists target_questions int not null default 10,
  add column if not exists questions_answered int not null default 0,
  add column if not exists correct_answers int not null default 0,
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists ended_at timestamptz;

-- Bring legacy + new fields in sync so either side can be source of truth.
create or replace function sync_study_session_status()
returns trigger language plpgsql as $$
begin
  -- new -> legacy
  if NEW.status = 'completed' and (OLD.status is distinct from 'completed') then
    NEW.is_completed := true;
    NEW.completed_at := coalesce(NEW.completed_at, NEW.ended_at, now());
    NEW.ended_at := coalesce(NEW.ended_at, now());
  elsif NEW.status = 'abandoned' and (OLD.status is distinct from 'abandoned') then
    NEW.abandoned_at := coalesce(NEW.abandoned_at, now());
    NEW.ended_at := coalesce(NEW.ended_at, NEW.abandoned_at);
  end if;

  -- legacy -> new (in case routes still write is_completed)
  if NEW.is_completed = true and NEW.status = 'active' then
    NEW.status := 'completed';
    NEW.ended_at := coalesce(NEW.ended_at, NEW.completed_at, now());
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_study_session_status on study_sessions;
create trigger trg_sync_study_session_status
  before update on study_sessions
  for each row execute function sync_study_session_status();

create index if not exists study_sessions_status on study_sessions(user_id, status);
create index if not exists study_sessions_ended_at on study_sessions(ended_at desc) where ended_at is not null;

-- ---- Streak bookkeeping trigger (uses canonical current_streak/longest_streak) ----
create or replace function bump_user_streak()
returns trigger language plpgsql security definer as $$
declare
  v_today date := current_date;
  v_last date;
  v_streak int;
  v_longest int;
begin
  if NEW.status = 'completed' and (OLD.status is distinct from 'completed') then
    select last_study_date, current_streak, longest_streak
      into v_last, v_streak, v_longest
      from profiles where id = NEW.user_id for update;

    if v_last is null or v_today - v_last > 1 then
      v_streak := 1;
    elsif v_today - v_last = 1 then
      v_streak := coalesce(v_streak, 0) + 1;
    end if;

    if v_streak > coalesce(v_longest, 0) then
      v_longest := v_streak;
    end if;

    update profiles
       set current_streak = v_streak,
           longest_streak = v_longest,
           last_study_date = v_today,
           updated_at = now()
     where id = NEW.user_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_bump_user_streak on study_sessions;
create trigger trg_bump_user_streak
  after update on study_sessions
  for each row execute function bump_user_streak();
