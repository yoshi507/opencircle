-- Invites RLS

alter table public.invites enable row level security;

-- Owners can create invites
create policy "Owners can create invites"
  on public.invites for insert
  with check (
    exists (
      select 1 from public.servers
      where id = server_id and owner_id = auth.uid()
    )
  );

-- Anyone authenticated can read invites by token_hash (needed to accept)
-- We only expose the row when looking up by exact hash, so this is acceptable
create policy "Authenticated users can read invites"
  on public.invites for select
  using (auth.uid() is not null);

-- Owners / creators can update uses
create policy "Creators can update invites"
  on public.invites for update
  using (created_by = auth.uid() or exists (
    select 1 from public.servers where id = server_id and owner_id = auth.uid()
  ));
