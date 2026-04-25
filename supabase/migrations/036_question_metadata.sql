-- 036_question_metadata.sql
-- Extend `questions` with metadata that powers (a) the digital-twin trap
-- analysis and (b) batch seed/template generation tracking.
--
-- New columns:
--   pattern_tag                — categorical question-style label
--                                 (most-cost-effective, least-operational-overhead,
--                                  highest-availability, dr-rpo-rto, ...).
--                                 Drives `cognitive_fingerprint.trap_susceptibility`.
--   is_canonical               — true for hand-curated "spine" questions
--                                 derived from official AWS sample/exam-readiness
--                                 sources. Selector treats them as authoritative.
--   variation_seed             — deterministic seed for templated/combinatorial
--                                 generation. Lets us regenerate variants of the
--                                 same template without colliding text.
--   expected_distractor_type   — for each non-correct option, what kind of
--                                 wrong reasoning it represents (eg.
--                                 "underestimates-availability",
--                                 "ignores-cost-in-multi-region"). When the
--                                 user picks a wrong answer, we record which
--                                 distractor type they fell for to build the
--                                 distractor_pattern fingerprint dimension.
--   blueprint_task_id          — FK-by-text to `data/saa-c03-blueprint.csv`
--                                 task_id (eg. "1.2", "3.5"). Lets us prove
--                                 coverage objectively per official task
--                                 statement.
--
-- All columns are nullable / defaulted so existing rows stay valid.

alter table public.questions
  add column if not exists pattern_tag text,
  add column if not exists is_canonical boolean not null default false,
  add column if not exists variation_seed text,
  add column if not exists expected_distractor_type jsonb,
  add column if not exists blueprint_task_id text;

-- Constrain pattern_tag to the known taxonomy. Use a check constraint
-- (not enum) so we can extend the list via plain ALTER without a
-- multi-step type migration.
alter table public.questions
  drop constraint if exists questions_pattern_tag_check;

alter table public.questions
  add constraint questions_pattern_tag_check
  check (pattern_tag is null or pattern_tag in (
    'most-cost-effective',
    'least-operational-overhead',
    'highest-availability',
    'most-secure',
    'lowest-latency',
    'highest-throughput',
    'dr-rpo-rto',
    'migrate-minimal-disruption',
    'compliance-immutable',
    'event-driven-decoupling',
    'cross-account-access',
    'fault-tolerant-design',
    'scalable-elastic',
    'caching-strategy',
    'serverless-vs-container',
    'storage-tier-selection',
    'network-segmentation',
    'identity-federation',
    'data-encryption',
    'monitoring-observability'
  ));

-- expected_distractor_type schema (validated at app layer, not DB):
--   array indexed parallel to `options`. The slot at correct_index is null.
--   Other slots: { "type": string, "explanation": string }.
-- Example for a question where correct_index=0:
--   [
--     null,
--     { "type": "underestimates-availability", "explanation": "single-AZ" },
--     { "type": "ignores-cost-in-multi-region", "explanation": "DX everywhere" },
--     { "type": "confuses-async-with-sync", "explanation": "Lambda calling Lambda" }
--   ]

-- Indexes:
-- (a) trap-susceptibility queries hit on pattern_tag → narrow index.
-- (b) blueprint coverage reports group by task_id → filtered index since
--     most rows will have it null until backfill.
create index if not exists questions_pattern_tag_idx
  on public.questions (pattern_tag)
  where pattern_tag is not null;

create index if not exists questions_blueprint_task_idx
  on public.questions (blueprint_task_id)
  where blueprint_task_id is not null;

create index if not exists questions_canonical_idx
  on public.questions (is_canonical) where is_canonical = true;

-- Coverage view: how many approved questions exist per blueprint task.
-- Powers the "we cover N/13 official tasks with ≥X questions each" claim.
create or replace view blueprint_coverage as
select
  blueprint_task_id,
  count(*) filter (where is_active and review_status = 'approved')::int as approved_count,
  count(*) filter (where is_canonical and is_active and review_status = 'approved')::int as canonical_count,
  count(distinct concept_id) filter (where is_active and review_status = 'approved')::int as concept_diversity
from public.questions
where blueprint_task_id is not null
group by blueprint_task_id;

-- Allow authenticated users to read coverage (it's aggregate, no PII).
grant select on blueprint_coverage to authenticated;

comment on column public.questions.pattern_tag is
  'Categorical question-style label. Drives cognitive_fingerprint.trap_susceptibility.';

comment on column public.questions.is_canonical is
  'True for hand-curated questions derived from official AWS sources. Authoritative spine.';

comment on column public.questions.variation_seed is
  'Deterministic seed for templated/combinatorial generation. Same template + same seed = same text.';

comment on column public.questions.expected_distractor_type is
  'Per-option wrong-reasoning labels (parallel to options array). Slot at correct_index is null.';

comment on column public.questions.blueprint_task_id is
  'Maps the question to an official SAA-C03 task statement (e.g. "1.2"). See data/saa-c03-blueprint.csv.';
