-- DMs / blocks / roles RLS

alter table public.dm_conversations enable row level security;
alter table public.dm_participants enable row level security;
alter table public.blocks enable row level security;
alter table public.roles enable row level security;
alter table public.member_roles enable row level security;
alter table public.reports enable row level security;

-- Blocks
create policy "Users manage own blocks"
  on public.blocks for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

-- DM participants: users see their own rows
create policy "Users see own dm participation"
  on public.dm_participants for select
  using (auth.uid() = user_id);

create policy "Users can join dms"
  on public.dm_participants for insert
  with check (auth.uid() = user_id);

-- DM conversations: participants only
create policy "Participants see conversations"
  on public.dm_conversations for select
  using (
    exists (
      select 1 from public.dm_participants
      where conversation_id = id and user_id = auth.uid()
    )
  );

create policy "Authenticated can create dm conversations"
  on public.dm_conversations for insert
  with check (auth.uid() is not null);

-- Roles
create policy "Members can view roles"
  on public.roles for select
  using (public.is_server_member(server_id));

create policy "Owners can manage roles"
  on public.roles for all
  using (
    exists (select 1 from public.servers where id = server_id and owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.servers where id = server_id and owner_id = auth.uid())
  );

create policy "Members can view member_roles"
  on public.member_roles for select
  using (public.is_server_member(server_id));

create policy "Owners can manage member_roles"
  on public.member_roles for all
  using (
    exists (select 1 from public.servers where id = server_id and owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.servers where id = server_id and owner_id = auth.uid())
  );

-- Reports
create policy "Users can submit reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "Users can view own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);
