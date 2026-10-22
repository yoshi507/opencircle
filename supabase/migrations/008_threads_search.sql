-- Threads: parent message reference
alter table public.messages
  add column if not exists parent_id uuid references public.messages(id) on delete cascade;

create index if not exists messages_parent_id_idx on public.messages(parent_id);
create index if not exists messages_content_trgm on public.messages using gin (content gin_trgm_ops);

-- Optional: enable pg_trgm for better search (ignore error if already enabled)
-- create extension if not exists pg_trgm;
