-- Fix infinite recursion in server_members policies
-- The old policy queried server_members from inside a server_members policy.

-- Drop the broken policies
drop policy if exists "Members can view server membership" on public.server_members;
drop policy if exists "Members can view their servers" on public.servers;
drop policy if exists "Users can join as members" on public.server_members;
drop policy if exists "Authenticated users can create servers" on public.servers;
drop policy if exists "Members can view channels" on public.channels;
drop policy if exists "Owners can create channels" on public.channels;
drop policy if exists "Members can view messages" on public.messages;
drop policy if exists "Members can send messages" on public.messages;

-- ============================================================
-- SERVERS
-- ============================================================

-- Anyone authenticated can create a server (as owner)
create policy "Authenticated users can create servers"
  on public.servers for insert
  with check (auth.uid() = owner_id);

-- Members can see servers they belong to
-- (uses a security definer function to avoid recursion)
create or replace function public.is_server_member(p_server_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.server_members
    where server_id = p_server_id
      and user_id = auth.uid()
      and membership_status = 'active'
  );
$$;

create policy "Members can view their servers"
  on public.servers for select
  using (public.is_server_member(id) or owner_id = auth.uid());

create policy "Owners can update their servers"
  on public.servers for update
  using (owner_id = auth.uid());

-- ============================================================
-- SERVER MEMBERS
-- ============================================================

-- Users can insert themselves as members
create policy "Users can join as members"
  on public.server_members for insert
  with check (auth.uid() = user_id);

-- Users can see membership rows for servers they belong to
-- (simple: you can always see your own membership row)
create policy "Users can view own membership"
  on public.server_members for select
  using (user_id = auth.uid());

-- Members can see other members of the same server
create policy "Members can view fellow members"
  on public.server_members for select
  using (public.is_server_member(server_id));

-- ============================================================
-- CHANNELS
-- ============================================================

alter table public.channels enable row level security;

create policy "Members can view channels"
  on public.channels for select
  using (public.is_server_member(server_id));

create policy "Owners can create channels"
  on public.channels for insert
  with check (
    exists (
      select 1 from public.servers
      where id = server_id and owner_id = auth.uid()
    )
  );

-- ============================================================
-- MESSAGES
-- ============================================================

alter table public.messages enable row level security;

create policy "Members can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.channels c
      where c.id = channel_id
        and public.is_server_member(c.server_id)
    )
  );

create policy "Members can send messages"
  on public.messages for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.channels c
      where c.id = channel_id
        and public.is_server_member(c.server_id)
    )
  );

-- Realtime (ignore error if already added)
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then
  null;
end $$;
