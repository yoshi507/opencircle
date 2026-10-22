-- Bot support
alter table public.profiles
  add column if not exists is_bot boolean not null default false;

-- Developer applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  icon_url text,
  client_id text not null unique,
  client_secret text not null,
  bot_token text not null unique,
  scopes text[] not null default array['bot', 'messages.read', 'messages.write'],
  bot_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_owner_id_idx on public.applications(owner_id);

alter table public.applications enable row level security;

create policy "Owners manage their apps"
  on public.applications for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- System OpenCircle bot profile (optional seed — run once)
-- insert into auth.users is not available from SQL easily; bot replies use service-style inserts via app code with a dedicated profile row:
insert into public.profiles (id, username, display_name, is_bot, status)
values (
  '00000000-0000-0000-0000-0000000000b0',
  'opencircle',
  'OpenCircle',
  true,
  'online'
) on conflict (id) do update set is_bot = true, display_name = 'OpenCircle';
