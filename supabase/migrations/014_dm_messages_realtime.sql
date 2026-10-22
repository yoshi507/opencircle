-- Shared DM messages with solid RLS + Realtime
-- Run this entire file in Supabase SQL Editor

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

-- Membership helper (create if missing)
create or replace function public.is_dm_member(conv_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dm_participants
    where conversation_id = conv_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_dm_member(uuid) to authenticated;

-- Both participants can read ALL messages in the conversation
create policy "dm_messages_select"
  on public.dm_messages for select to authenticated
  using (public.is_dm_member(conversation_id));

-- Both can insert as themselves
create policy "dm_messages_insert"
  on public.dm_messages for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_dm_member(conversation_id)
  );

create policy "dm_messages_update_own"
  on public.dm_messages for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- Enable Realtime so the other person sees messages live
do $$
begin
  alter publication supabase_realtime add table public.dm_messages;
exception
  when duplicate_object then null;
  when others then null;
end $$;
