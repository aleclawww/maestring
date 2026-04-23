-- Two unrelated concerns bundled for one migration:
-- 1. pick_pool_question now returns the rich-content columns added in 017.
-- 2. llm_usage ledger for per-call cost tracking + Slack alerting (A5.2).

-- ---------------------------------------------------------------------------
-- 1. Pool picker returns rich content
-- ---------------------------------------------------------------------------
drop function if exists pick_pool_question(uuid, uuid);

create or replace function pick_pool_question(p_user_id uuid, p_concept_id uuid)
returns table (
  id uuid,
  question_text text,
  options jsonb,
  correct_index int,
  explanation text,
  difficulty double precision,
  question_type question_type,
  hint text,
  explanation_deep text,
  key_insight text,
  scenario_context jsonb,
  tags text[]
)
language sql
stable
as $$
  select
    q.id,
    q.question_text,
    q.options,
    q.correct_index,
    q.explanation,
    q.difficulty,
    q.question_type,
    q.hint,
    q.explanation_deep,
    q.key_insight,
    q.scenario_context,
    q.tags
  from questions q
  where q.concept_id = p_concept_id
    and q.is_active = true
    and not exists (
      select 1 from question_attempts a
      where a.user_id = p_user_id and a.question_id = q.id
    )
  order by q.times_shown asc, random()
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- 2. LLM usage ledger — every call logged for cost tracking.
-- ---------------------------------------------------------------------------
create table if not exists llm_usage (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  route text not null,                 -- e.g. 'study.generate', 'study.elaborate', 'pool.seed'
  model text not null,                 -- e.g. 'claude-haiku-4-5-20251001'
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cached_input_tokens int not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  latency_ms int,
  success boolean not null default true,
  error_code text,
  metadata jsonb
);

create index if not exists llm_usage_user_day on llm_usage (user_id, created_at desc);
create index if not exists llm_usage_created on llm_usage (created_at desc);

alter table llm_usage enable row level security;

-- Users see only their own usage; admins (service role) see everything.
create policy "llm_usage_own" on llm_usage
  for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Daily cost helpers (used by cron + dashboards)
-- ---------------------------------------------------------------------------
create or replace function llm_cost_today(p_user_id uuid default null)
returns numeric
language sql
stable
as $$
  select coalesce(sum(cost_usd), 0)::numeric
  from llm_usage
  where created_at >= date_trunc('day', now() at time zone 'utc')
    and (p_user_id is null or user_id = p_user_id)
$$;

-- Top spenders in the last 24 h — feed for cost-alert cron.
create or replace function llm_top_spenders_24h(p_limit int default 20)
returns table (user_id uuid, cost_usd numeric, call_count int)
language sql
stable
as $$
  select
    u.user_id,
    sum(u.cost_usd)::numeric as cost_usd,
    count(*)::int as call_count
  from llm_usage u
  where u.created_at >= now() - interval '24 hours'
    and u.user_id is not null
  group by u.user_id
  order by sum(u.cost_usd) desc
  limit p_limit
$$;
