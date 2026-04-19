-- Cognitive schema: FSRS states, study sessions, question attempts

create type study_mode as enum ('discovery', 'review', 'intensive', 'maintenance');

-- ---- User Concept States (FSRS) ----
create table user_concept_states (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  -- FSRS v5 fields
  stability float not null default 0,
  difficulty float not null default 0.3,
  elapsed_days int not null default 0,
  scheduled_days int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  state smallint not null default 0, -- 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review timestamptz,
  next_review_date timestamptz,
  unique (user_id, concept_id)
);

-- ---- Study Sessions ----
create table study_sessions (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  abandoned_at timestamptz,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode study_mode not null default 'review',
  certification_id text not null default 'aws-saa-c03',
  concepts_studied int not null default 0,
  correct_count int not null default 0,
  incorrect_count int not null default 0,
  total_time_seconds int not null default 0,
  xp_earned int not null default 0,
  is_completed boolean not null default false
);

-- ---- Question Attempts (IMMUTABLE — no UPDATE/DELETE for authenticated) ----
create table question_attempts (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  session_id uuid not null references study_sessions(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  user_answer_index int not null check (user_answer_index between 0 and 3),
  is_correct boolean not null,
  time_taken_ms int not null default 0,
  evaluation_result jsonb
);

-- ---- Magic Link Uses (deduplication) ----
create table magic_link_uses (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  jti text unique not null,
  user_id uuid not null references auth.users(id) on delete cascade
);

-- ---- Triggers ----
create trigger user_concept_states_updated_at before update on user_concept_states
  for each row execute procedure update_updated_at();

-- ---- RLS ----
alter table user_concept_states enable row level security;
alter table study_sessions enable row level security;
alter table question_attempts enable row level security;
alter table magic_link_uses enable row level security;

create policy "concept_states_own" on user_concept_states
  using (user_id = auth.uid());

create policy "study_sessions_own" on study_sessions
  using (user_id = auth.uid());

-- Question attempts: insert + select only (immutable)
create policy "attempts_insert" on question_attempts
  for insert with check (user_id = auth.uid());

create policy "attempts_select" on question_attempts
  for select using (user_id = auth.uid());

create policy "magic_link_uses_own" on magic_link_uses
  using (user_id = auth.uid());
