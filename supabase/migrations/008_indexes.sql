-- Performance indexes

-- HNSW vector index for semantic search
create index if not exists content_chunks_embedding_idx on content_chunks
using hnsw (embedding vector_cosine_ops)
with (m = 16, ef_construction = 64);

-- FSRS query optimization
create index if not exists user_concept_states_next_review
  on user_concept_states(user_id, next_review_date);

create index if not exists user_concept_states_user_concept
  on user_concept_states(user_id, concept_id);

create index if not exists user_concept_states_state
  on user_concept_states(user_id, state);

-- Question attempts
create index if not exists question_attempts_session
  on question_attempts(session_id);

create index if not exists question_attempts_user_date
  on question_attempts(user_id, created_at desc);

create index if not exists question_attempts_question
  on question_attempts(question_id);

-- Study sessions
create index if not exists study_sessions_user_date
  on study_sessions(user_id, created_at desc);

-- Subscriptions
create index if not exists subscriptions_user
  on subscriptions(user_id);

create index if not exists subscriptions_stripe
  on subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Documents
create index if not exists user_documents_user
  on user_documents(user_id);

create index if not exists user_documents_status
  on user_documents(processing_status)
  where processing_status in ('pending', 'processing');

-- Magic links (cleanup)
create index if not exists magic_link_uses_created
  on magic_link_uses(created_at);

-- Concepts
create index if not exists concepts_certification
  on concepts(certification_id)
  where is_active = true;

create index if not exists concepts_domain
  on concepts(domain_id)
  where is_active = true;

-- Questions
create index if not exists questions_concept
  on questions(concept_id)
  where is_active = true;
