-- Allow authenticated users to see public servers (for Discover)
create policy "Anyone authenticated can view public servers"
  on public.servers for select
  using (
    visibility = 'public'
    or owner_id = auth.uid()
    or public.is_server_member(id)
  );

-- Note: if an older "members can view servers" policy already exists,
-- you may need to drop the restrictive one first:
-- drop policy if exists "Members can view servers" on public.servers;
