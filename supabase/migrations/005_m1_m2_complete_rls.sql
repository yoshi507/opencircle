-- Reactions RLS
alter table public.message_reactions enable row level security;

create policy "Members can view reactions"
  on public.message_reactions for select
  using (
    exists (
      select 1 from public.messages m
      join public.channels c on c.id = m.channel_id
      where m.id = message_id and public.is_server_member(c.server_id)
    )
  );

create policy "Members can add reactions"
  on public.message_reactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.messages m
      join public.channels c on c.id = m.channel_id
      where m.id = message_id and public.is_server_member(c.server_id)
    )
  );

create policy "Users can remove own reactions"
  on public.message_reactions for delete
  using (auth.uid() = user_id);

-- Allow message authors to update their messages
create policy "Authors can update own messages"
  on public.messages for update
  using (auth.uid() = author_id);

-- Owners can update any message in their server (for moderation delete)
create policy "Owners can update server messages"
  on public.messages for update
  using (
    exists (
      select 1 from public.channels c
      join public.servers s on s.id = c.server_id
      where c.id = channel_id and s.owner_id = auth.uid()
    )
  );

-- Audit logs & moderation cases
alter table public.audit_logs enable row level security;
alter table public.moderation_cases enable row level security;

create policy "Owners can view audit logs"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.servers where id = server_id and owner_id = auth.uid()
    )
  );

create policy "System can insert audit logs"
  on public.audit_logs for insert
  with check (auth.uid() = actor_id);

create policy "Owners can view moderation cases"
  on public.moderation_cases for select
  using (
    exists (
      select 1 from public.servers where id = server_id and owner_id = auth.uid()
    )
  );

create policy "Actors can insert moderation cases"
  on public.moderation_cases for insert
  with check (auth.uid() = actor_id);

-- Allow members to update membership status (for kick/ban by owner via service)
create policy "Owners can update memberships"
  on public.server_members for update
  using (
    exists (
      select 1 from public.servers where id = server_id and owner_id = auth.uid()
    )
  );
