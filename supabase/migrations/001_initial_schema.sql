-- OpenCircle Milestone 0 / 1 schema skeleton
-- Run this in the Supabase SQL editor after creating your project.

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  status text default 'offline' check (status in ('online', 'idle', 'busy', 'invisible', 'offline')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- USER SETTINGS
-- ============================================================
create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text default 'dark',
  privacy_settings jsonb default '{}'::jsonb,
  notification_settings jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- SERVERS
-- ============================================================
create table public.servers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  description text,
  icon_url text,
  banner_url text,
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.server_members (
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  nickname text,
  joined_at timestamptz not null default now(),
  membership_status text not null default 'active' check (membership_status in ('active', 'banned', 'left')),
  primary key (server_id, user_id)
);

-- ============================================================
-- ROLES & PERMISSIONS (skeleton)
-- ============================================================
create table public.roles (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  permissions bigint not null default 0, -- bitset
  color text,
  created_at timestamptz not null default now()
);

create table public.member_roles (
  server_id uuid not null,
  user_id uuid not null,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (server_id, user_id, role_id),
  foreign key (server_id, user_id) references public.server_members(server_id, user_id) on delete cascade
);

-- ============================================================
-- CHANNELS
-- ============================================================
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  name text not null,
  position integer not null default 0
);

create table public.channels (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  type text not null default 'text' check (type in ('text', 'voice', 'announcement', 'forum')),
  position integer not null default 0,
  topic text,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.channel_overrides (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  subject_type text not null check (subject_type in ('role', 'member')),
  subject_id uuid not null,
  allow_bits bigint not null default 0,
  deny_bits bigint not null default 0
);

-- ============================================================
-- MESSAGES
-- ============================================================
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete set null,
  content text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index messages_channel_created_idx on public.messages (channel_id, created_at desc);

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table public.attachments (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_key text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FRIENDS / DMs / BLOCKS
-- ============================================================
create table public.friendships (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  primary key (requester_id, recipient_id),
  check (requester_id <> recipient_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.dm_conversations (
  id uuid primary key default uuid_generate_v4(),
  type text not null default 'direct' check (type in ('direct', 'group')),
  created_at timestamptz not null default now()
);

create table public.dm_participants (
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ============================================================
-- INVITES
-- ============================================================
create table public.invites (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  max_uses integer,
  uses integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- MODERATION & AUDIT
-- ============================================================
create table public.moderation_cases (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  target_id uuid not null references public.profiles(id),
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.profiles(id),
  target_type text not null,
  target_id uuid not null,
  reason text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.profiles(id),
  server_id uuid references public.servers(id) on delete cascade,
  action text not null,
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  resource_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- BASIC RLS (expand in later milestones)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.servers enable row level security;
alter table public.server_members enable row level security;

-- Profiles: anyone can read public fields, users can update their own
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- User settings: only owner
create policy "Users can manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id);

-- Servers: members can see servers they belong to
create policy "Members can view their servers"
  on public.servers for select
  using (
    exists (
      select 1 from public.server_members
      where server_id = id and user_id = auth.uid() and membership_status = 'active'
    )
  );

create policy "Authenticated users can create servers"
  on public.servers for insert
  with check (auth.uid() = owner_id);

-- Server members
create policy "Members can view server membership"
  on public.server_members for select
  using (
    exists (
      select 1 from public.server_members sm
      where sm.server_id = server_members.server_id
        and sm.user_id = auth.uid()
        and sm.membership_status = 'active'
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================
create index profiles_username_idx on public.profiles (username);
create index server_members_user_idx on public.server_members (user_id);
create index channels_server_idx on public.channels (server_id);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
