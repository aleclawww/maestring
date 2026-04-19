-- User data: documents, content chunks, concept links

create type processing_status as enum ('pending', 'processing', 'completed', 'failed');

-- ---- User Documents ----
create table user_documents (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) on delete set null,
  filename text not null,
  file_path text not null,
  file_size bigint not null default 0,
  mime_type text not null default 'application/pdf',
  processing_status processing_status not null default 'pending',
  chunk_count int not null default 0,
  error_message text,
  metadata jsonb not null default '{}'
);

-- ---- Content Chunks ----
create table content_chunks (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  document_id uuid not null references user_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  token_count int not null default 0,
  metadata jsonb not null default '{}',
  unique (document_id, chunk_index)
);

-- ---- Chunk → Concept Links ----
create table chunk_concept_links (
  id uuid primary key default uuid_generate_v4(),
  chunk_id uuid not null references content_chunks(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  relevance_score float not null default 0.5 check (relevance_score between 0 and 1),
  unique (chunk_id, concept_id)
);

-- ---- Triggers ----
create trigger user_documents_updated_at before update on user_documents
  for each row execute procedure update_updated_at();

-- ---- RLS ----
alter table user_documents enable row level security;
alter table content_chunks enable row level security;
alter table chunk_concept_links enable row level security;

create policy "user_documents_own" on user_documents
  using (user_id = auth.uid());

create policy "content_chunks_own" on content_chunks
  using (
    document_id in (
      select id from user_documents where user_id = auth.uid()
    )
  );

create policy "chunk_concept_links_own" on chunk_concept_links
  using (
    chunk_id in (
      select cc.id from content_chunks cc
      join user_documents ud on cc.document_id = ud.id
      where ud.user_id = auth.uid()
    )
  );
