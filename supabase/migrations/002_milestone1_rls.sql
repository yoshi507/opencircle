-- Extra RLS policies needed for Milestone 1

-- Allow authenticated users to insert themselves as members (for ownership)
create policy "Users can join as members"
  on public.server_members for insert
  with check (auth.uid() = user_id);

-- Allow members to read channels of their servers
alter table public.channels enable row level security;

create policy "Members can view channels"
  on public.channels for select
  using (
    exists (
      select 1 from public.server_members
      where server_id = channels.server_id
        and user_id = auth.uid()
        and membership_status = 'active'
    )
  );

create policy "Owners can create channels"
  on public.channels for insert
  with check (
    exists (
      select 1 from public.servers
      where id = channels.server_id
        and owner_id = auth.uid()
    )
  );

-- Messages
alter table public.messages enable row level security;

create policy "Members can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = messages.channel_id
        and sm.user_id = auth.uid()
        and sm.membership_status = 'active'
    )
  );

create policy "Members can send messages"
  on public.messages for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = messages.channel_id
        and sm.user_id = auth.uid()
        and sm.membership_status = 'active'
    )
  );

-- Allow realtime
alter publication supabase_realtime add table public.messages;
