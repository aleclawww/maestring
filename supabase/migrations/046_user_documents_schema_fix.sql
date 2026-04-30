-- Migration 046: Align user_documents schema with application code
--
-- Migration 004 created file_path/file_size but the application code
-- (upload, process, cleanup routes) references storage_path/title instead.
-- This caused document uploads to fail at runtime with a PostgREST column-not-found
-- error even though TypeScript compiled cleanly (Supabase client's insert()
-- uses structural subtyping that doesn't enforce excess-property errors).
--
-- Fix:
--   1. Rename file_path → storage_path  (all app code uses storage_path)
--   2. Add title column                 (upload route writes title)
--
-- The file_size column stays as-is; the upload route's 'file_size_bytes'
-- field is corrected in the application code (see upload/route.ts change).

alter table user_documents
  rename column file_path to storage_path;

alter table user_documents
  add column if not exists title text;

-- Back-fill title for any rows that already exist (filename without extension
-- is a reasonable default for historical rows).
update user_documents
  set title = regexp_replace(filename, '\.[^.]+$', '', 'i')
  where title is null;

comment on column user_documents.storage_path is
  'Path inside the user-documents Supabase Storage bucket, e.g. <user_id>/<timestamp>-<name>.pdf';
comment on column user_documents.title is
  'Human-readable display name for the document (defaults to filename without extension).';
