-- Fix DM RLS: allow creating conversations + adding the other participant
drop policy if exists "Authenticated can create dm conversations" on public.dm_conversations;
drop policy if exists "Users can join dms" on public.dm_participants;
drop policy if exists "Participants see conversations" on public.dm_conversations;
drop policy if exists "Users see own dm participation" on public.dm_participants;

create policy "dm_conversations_insert"
  on public.dm_conversations for insert
  with check (auth.uid() is not null);

create policy "dm_conversations_select"
  on public.dm_conversations for select
  using (
    exists (
      select 1 from public.dm_participants p
      where p.conversation_id = id and p.user_id = auth.uid()
    )
  );

create policy "dm_participants_select"
  on public.dm_participants for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.dm_participants me
      where me.conversation_id = conversation_id and me.user_id = auth.uid()
    )
  );

-- You can add yourself, or add someone else if you are already in the conversation
create policy "dm_participants_insert"
  on public.dm_participants for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.dm_participants me
      where me.conversation_id = conversation_id and me.user_id = auth.uid()
    )
  );

-- Bot flag on profiles
alter table public.profiles
  add column if not exists is_bot boolean not null default false;

alter table public.profiles
  add column if not exists bot_owner_id uuid references public.profiles(id) on delete set null;

-- Developer applications / bots
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

drop policy if exists "Owners manage applications" on public.applications;
create policy "Owners manage applications"
  on public.applications for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Built-in OpenCircle bot profile (id fixed for consistency)
insert into public.profiles (id, username, display_name, is_bot, bio, status)
values (
  '00000000-0000-4000-8000-000000000001',
  'opencircle',
  'OpenCircle',
  true,
  'Official bot — moderation, games, utilities & AI. Type !help',
  'online'
)
on conflict (id) do update set
  is_bot = true,
  display_name = 'OpenCircle',
  username = 'opencircle';
