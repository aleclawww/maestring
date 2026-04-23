-- Rich question content: hint, deep explanation, memorable insight, structured scenario.
-- Enables the progressive-explanation flow (A3.2) and future interactive scenario widgets.

alter table questions
  add column if not exists hint text,
  add column if not exists explanation_deep text,
  add column if not exists key_insight text,
  add column if not exists scenario_context jsonb,
  add column if not exists tags text[] not null default '{}';

-- scenario_context shape (nullable, free-form):
--   { "numbers": {...}, "architecture": "text description", "cost_table": [...] }
-- Tags power future filters ("show me all cost-optimization questions I got wrong").
create index if not exists questions_tags_gin on questions using gin (tags);
