-- Knowledge graph: domains, topics, concepts, questions

create type question_type as enum ('multiple_choice', 'scenario', 'drag_drop');

-- ---- Knowledge Domains ----
create table knowledge_domains (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  certification_id text not null,
  slug text not null,
  name text not null,
  description text,
  exam_weight_percent int not null check (exam_weight_percent between 0 and 100),
  color text not null default '#6366f1',
  icon text,
  sort_order int not null default 0,
  unique (certification_id, slug)
);

-- ---- Domain Topics ----
create table domain_topics (
  id uuid primary key default uuid_generate_v4(),
  domain_id uuid not null references knowledge_domains(id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order int not null default 0,
  unique (domain_id, slug)
);

-- ---- Concepts ----
create table concepts (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  certification_id text not null,
  domain_id uuid not null references knowledge_domains(id) on delete cascade,
  topic_id uuid references domain_topics(id) on delete set null,
  slug text not null,
  name text not null,
  description text not null default '',
  key_facts jsonb not null default '[]',
  exam_tips jsonb not null default '[]',
  aws_services jsonb not null default '[]',
  confused_with jsonb not null default '[]',
  difficulty float not null default 0.5 check (difficulty between 0 and 1),
  is_active boolean not null default true,
  unique (certification_id, slug)
);

-- ---- Questions ----
create table questions (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  concept_id uuid not null references concepts(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  correct_index int not null check (correct_index between 0 and 3),
  explanation text not null,
  difficulty float not null default 0.5 check (difficulty between 0 and 1),
  question_type question_type not null default 'multiple_choice',
  source text not null default 'ai-generated',
  is_active boolean not null default true,
  times_shown int not null default 0,
  times_correct int not null default 0
);

-- ---- Question Feedback ----
create table question_feedback (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  question_id uuid not null references questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  feedback_type text not null check (feedback_type in ('wrong_answer', 'unclear', 'outdated', 'good')),
  comment text
);

-- ---- RLS ----
alter table knowledge_domains enable row level security;
alter table domain_topics enable row level security;
alter table concepts enable row level security;
alter table questions enable row level security;
alter table question_feedback enable row level security;

-- Knowledge is public (readable by all authenticated users)
create policy "knowledge_domains_readable" on knowledge_domains
  for select using (auth.role() = 'authenticated');

create policy "domain_topics_readable" on domain_topics
  for select using (auth.role() = 'authenticated');

create policy "concepts_readable" on concepts
  for select using (auth.role() = 'authenticated');

create policy "questions_readable" on questions
  for select using (auth.role() = 'authenticated');

-- Feedback: only owner
create policy "feedback_insert" on question_feedback
  for insert with check (user_id = auth.uid());

create policy "feedback_select_own" on question_feedback
  for select using (user_id = auth.uid());
