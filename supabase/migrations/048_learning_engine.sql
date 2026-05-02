-- ─────────────────────────────────────────────────────────────────────────────
-- Learning Engine (Gemelo Digital)
--
-- 9-phase orchestrated learning. The orchestrator (lib/learning-engine/
-- orchestrator.ts) reads/writes user_learning_state and metacognitive_
-- calibration, plus extends the existing profiles.cognitive_fingerprint JSONB
-- with v2 fields. Phase advancement and forgetting-bounce-back logic live in
-- lib/learning-engine/transitions.ts.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Phase enum --------------------------------------------------------------
do $$ begin
  create type learning_phase as enum (
    'calibration',
    'ambient',
    'anchoring',
    'retrieval_easy',
    'interleaving',
    'consolidation',
    'automation',
    'transfer',
    'mastery'
  );
exception when duplicate_object then null; end $$;

-- 2) user_learning_state -----------------------------------------------------
-- One row per user. Tracks the current phase plus light per-phase counters.
create table if not exists user_learning_state (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  phase                learning_phase not null default 'calibration',
  phase_entered_at     timestamptz   not null default now(),
  -- Counters that the orchestrator increments to know when to transition.
  ambient_exposures    int           not null default 0,   -- # of ambient cards shown
  anchoring_responses  int           not null default 0,   -- # of open-ended responses recorded
  retrieval_attempts   int           not null default 0,
  retrieval_correct    int           not null default 0,
  interleave_attempts  int           not null default 0,
  interleave_correct   int           not null default 0,
  automation_attempts  int           not null default 0,
  automation_under8s   int           not null default 0,   -- # answered correctly in <8s
  transfer_attempts    int           not null default 0,
  transfer_correct     int           not null default 0,
  -- Forgetting detection: snapshot of readiness at the start of the current
  -- 7-day window. Compared against current readiness to detect a >20pp drop.
  readiness_baseline   numeric(5,2),
  readiness_baseline_at timestamptz,
  -- Audit
  updated_at           timestamptz not null default now()
);

create index if not exists idx_uls_phase on user_learning_state(phase);

-- updated_at trigger
create or replace function tg_uls_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists tg_user_learning_state_updated_at on user_learning_state;
create trigger tg_user_learning_state_updated_at
  before update on user_learning_state
  for each row execute function tg_uls_set_updated_at();

-- 3) metacognitive_calibration ----------------------------------------------
-- One row per question_attempt. Captures the user's self-rated confidence
-- right after answering, alongside the actual correctness. Aggregates feed
-- into the cognitive_fingerprint as overconfidence / underconfidence signal.
create table if not exists metacognitive_calibration (
  id                bigserial primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  question_attempt_id bigint references question_attempts(id) on delete cascade,
  concept_id        uuid references concepts(id) on delete set null,
  confidence        smallint not null check (confidence between 1 and 5),
  was_correct       boolean  not null,
  recorded_at       timestamptz not null default now()
);

create index if not exists idx_metacog_user_recent on metacognitive_calibration(user_id, recorded_at desc);

-- 4) Cognitive fingerprint v2 fields ----------------------------------------
-- The existing profiles.cognitive_fingerprint JSONB column gains v2 keys
-- (no schema change needed since JSONB is permissive). Documenting them here:
--
--   working_memory_span        int  (2-9)        — n-back result (chunks)
--   processing_speed_ms        int               — median ms on calibration
--   chronotype                 'morning' | 'evening' | 'neutral'
--   sleep_window_start_hour    int  (0-23)
--   sleep_window_end_hour      int  (0-23)
--   cognitive_load_budget      int  (1-5)        — questions before rest
--   confidence_calibration     numeric           — accuracy - mean_confidence
--   v2_initialized_at          timestamptz iso
--
-- Consumers tolerate missing keys.

-- 5) Helper: ensure_user_learning_state -------------------------------------
create or replace function ensure_user_learning_state(p_user_id uuid)
returns user_learning_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row user_learning_state;
begin
  insert into user_learning_state (user_id) values (p_user_id)
  on conflict (user_id) do nothing;
  select * into v_row from user_learning_state where user_id = p_user_id;
  return v_row;
end;
$$;

grant execute on function ensure_user_learning_state(uuid) to authenticated, service_role;

-- 5b) Helper: increment_uls_counter ----------------------------------------
-- Atomic increment of one of the counter columns. Whitelisted column names
-- to avoid SQL injection via the `p_column` arg.
create or replace function increment_uls_counter(
  p_user_id uuid,
  p_column  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_column not in (
    'ambient_exposures', 'anchoring_responses',
    'retrieval_attempts', 'retrieval_correct',
    'interleave_attempts', 'interleave_correct',
    'automation_attempts', 'automation_under8s',
    'transfer_attempts', 'transfer_correct'
  ) then
    raise exception 'invalid column %', p_column;
  end if;

  execute format('update user_learning_state set %I = %I + 1 where user_id = $1', p_column, p_column)
    using p_user_id;
end;
$$;

grant execute on function increment_uls_counter(uuid, text) to authenticated, service_role;

-- 6) RLS ---------------------------------------------------------------------
alter table user_learning_state enable row level security;
alter table metacognitive_calibration enable row level security;

drop policy if exists uls_self_select on user_learning_state;
create policy uls_self_select on user_learning_state
  for select using (auth.uid() = user_id);
drop policy if exists uls_self_update on user_learning_state;
create policy uls_self_update on user_learning_state
  for update using (auth.uid() = user_id);
-- inserts go through ensure_user_learning_state SECURITY DEFINER — no RLS path.

drop policy if exists metacog_self_select on metacognitive_calibration;
create policy metacog_self_select on metacognitive_calibration
  for select using (auth.uid() = user_id);
-- inserts via service_role from /api/study/evaluate — no client-side insert.

comment on table user_learning_state is
  'Phase state per user for the 9-phase Gemelo Digital learning orchestrator.';
comment on table metacognitive_calibration is
  'Per-attempt confidence vs correctness. Aggregates feed cognitive_fingerprint.confidence_calibration.';
