-- Reliable DM creation: bypass brittle multi-step RLS with one SECURITY DEFINER function

-- Clean up old policies that conflict
drop policy if exists "dm_conversations_insert" on public.dm_conversations;
drop policy if exists "dm_conversations_select" on public.dm_conversations;
drop policy if exists "Authenticated can create dm conversations" on public.dm_conversations;
drop policy if exists "Participants see conversations" on public.dm_conversations;
drop policy if exists "dm_participants_insert" on public.dm_participants;
drop policy if exists "dm_participants_select" on public.dm_participants;
drop policy if exists "Users can join dms" on public.dm_participants;
drop policy if exists "Users see own dm participation" on public.dm_participants;

-- Simple, correct policies
create policy "dm_conversations_select"
  on public.dm_conversations for select
  using (
    exists (
      select 1 from public.dm_participants p
      where p.conversation_id = id and p.user_id = auth.uid()
    )
  );

-- Inserts go through the RPC below (no direct insert policy needed for clients)
-- Optional: allow authenticated insert as fallback
create policy "dm_conversations_insert_auth"
  on public.dm_conversations for insert
  to authenticated
  with check (true);

create policy "dm_participants_select"
  on public.dm_participants for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.dm_participants me
      where me.conversation_id = conversation_id and me.user_id = auth.uid()
    )
  );

create policy "dm_participants_insert_auth"
  on public.dm_participants for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.dm_participants me
      where me.conversation_id = conversation_id and me.user_id = auth.uid()
    )
  );

-- Single atomic create: finds existing or creates conversation + both participants
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
    raise exception 'Not authenticated';
  end if;

  if other_user_id is null or other_user_id = me then
    raise exception 'Invalid user';
  end if;

  -- Blocked?
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = me and b.blocked_id = other_user_id)
       or (b.blocker_id = other_user_id and b.blocked_id = me)
  ) then
    raise exception 'Cannot message this user';
  end if;

  -- Existing 1:1 conversation?
  select p1.conversation_id into existing
  from public.dm_participants p1
  join public.dm_participants p2
    on p1.conversation_id = p2.conversation_id
  where p1.user_id = me
    and p2.user_id = other_user_id
  limit 1;

  if existing is not null then
    return existing;
  end if;

  insert into public.dm_conversations (type)
  values ('direct')
  returning id into new_id;

  insert into public.dm_participants (conversation_id, user_id)
  values (new_id, me), (new_id, other_user_id);

  return new_id;
end;
$$;

revoke all on function public.create_or_get_dm(uuid) from public;
grant execute on function public.create_or_get_dm(uuid) to authenticated;
