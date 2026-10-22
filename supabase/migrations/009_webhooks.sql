-- Outgoing webhooks for integrations
create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  url text not null,
  secret text,
  events text[] not null default array['message.created'],
  enabled boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists webhooks_server_id_idx on public.webhooks(server_id);

alter table public.webhooks enable row level security;

create policy "Owners can manage webhooks"
  on public.webhooks for all
  using (
    exists (
      select 1 from public.servers
      where id = server_id and owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.servers
      where id = server_id and owner_id = auth.uid()
    )
  );
