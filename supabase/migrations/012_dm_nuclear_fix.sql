-- ============================================================
-- NUCLEAR DM FIX — paste entire file into Supabase SQL Editor
-- ============================================================

-- 1. Drop every policy on DM tables (ignore errors if names differ)
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'dm_conversations'
  loop
    execute format('drop policy if exists %I on public.dm_conversations', r.policyname);
  end loop;
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'dm_participants'
  loop
    execute format('drop policy if exists %I on public.dm_participants', r.policyname);
  end loop;
end $$;

alter table public.dm_conversations enable row level security;
alter table public.dm_participants enable row level security;

-- 2. Helpers (SECURITY DEFINER = bypass RLS when checking/creating)
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

create or replace function public.create_or_get_dm(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing uuid;
  new_id uuid;
begin
  if me is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if other_user_id is null or other_user_id = me then
    raise exception 'INVALID_USER';
  end if;
  if not exists (select 1 from public.profiles where id = other_user_id) then
    raise exception 'USER_NOT_FOUND';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = me and b.blocked_id = other_user_id)
       or (b.blocker_id = other_user_id and b.blocked_id = me)
  ) then
    raise exception 'BLOCKED';
  end if;

  select p1.conversation_id into existing
  from public.dm_participants p1
  inner join public.dm_participants p2
    on p1.conversation_id = p2.conversation_id
  where p1.user_id = me and p2.user_id = other_user_id
  limit 1;

  if existing is not null then
    return existing;
  end if;

  insert into public.dm_conversations (type)
  values ('direct')
  returning id into new_id;

  insert into public.dm_participants (conversation_id, user_id)
  values
    (new_id, me),
    (new_id, other_user_id);

  return new_id;
end;
$$;

-- Peer profile for a conversation (for UI header)
create or replace function public.get_dm_peer(conv_id uuid)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url
  from public.dm_participants dp
  join public.profiles p on p.id = dp.user_id
  where dp.conversation_id = conv_id
    and dp.user_id <> auth.uid()
    and public.is_dm_member(conv_id)
  limit 1;
$$;

revoke all on function public.is_dm_member(uuid) from public;
revoke all on function public.create_or_get_dm(uuid) from public;
revoke all on function public.get_dm_peer(uuid) from public;
grant execute on function public.is_dm_member(uuid) to authenticated;
grant execute on function public.create_or_get_dm(uuid) to authenticated;
grant execute on function public.get_dm_peer(uuid) to authenticated;

-- 3. Simple non-recursive policies
create policy "dm_conv_select"
  on public.dm_conversations for select to authenticated
  using (public.is_dm_member(id));

create policy "dm_conv_insert"
  on public.dm_conversations for insert to authenticated
  with check (auth.uid() is not null);

create policy "dm_part_select"
  on public.dm_participants for select to authenticated
  using (user_id = auth.uid() or public.is_dm_member(conversation_id));

create policy "dm_part_insert"
  on public.dm_participants for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.is_dm_member(conversation_id)
  );
