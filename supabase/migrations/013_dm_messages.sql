-- Shared DM messages (both participants read/write the same rows)

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists dm_messages_conversation_id_created_at_idx
  on public.dm_messages (conversation_id, created_at);

alter table public.dm_messages enable row level security;

do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'dm_messages'
  loop
    execute format('drop policy if exists %I on public.dm_messages', r.policyname);
  end loop;
end $$;

-- Prefer is_dm_member if present; otherwise inline exists check
create policy "dm_messages_select"
  on public.dm_messages for select to authenticated
  using (
    exists (
      select 1 from public.dm_participants p
      where p.conversation_id = conversation_id and p.user_id = auth.uid()
    )
  );

create policy "dm_messages_insert"
  on public.dm_messages for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.dm_participants p
      where p.conversation_id = conversation_id and p.user_id = auth.uid()
    )
  );

create policy "dm_messages_update_own"
  on public.dm_messages for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- Realtime (optional — enable in Dashboard → Replication if needed)
-- alter publication supabase_realtime add table public.dm_messages;
