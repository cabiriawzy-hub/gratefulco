-- GratefulCo Initial Schema
-- Run this against your Supabase project via the SQL editor or Supabase CLI

-- =============================================
-- EXTENSIONS
-- =============================================
create extension if not exists "uuid-ossp";

-- =============================================
-- USERS (extends Supabase Auth)
-- =============================================
-- Note: Supabase Auth manages auth.users. We create a public.users profile table.
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  timezone    text not null default 'UTC',
  settings    jsonb not null default '{}'::jsonb
  -- settings keys:
  --   aiInsightsOptOut    boolean  (default false)
  --   notificationsEnabled boolean (default true)
);

-- Automatically create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS for users
alter table public.users enable row level security;

create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- =============================================
-- ENTRIES
-- =============================================
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  body        text not null check (char_length(body) between 3 and 280),
  category    text not null check (category in ('people', 'health', 'work', 'moments', 'nature', 'learning', 'default')),
  plant_type  text not null,
  plant_stage int not null default 1 check (plant_stage between 1 and 3),
  grid_x      int not null,
  grid_y      int not null,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now(),
  local_date  date not null
);

-- Indexes from PRD §4
create index if not exists entries_user_created on public.entries(user_id, created_at desc);
create index if not exists entries_local_date   on public.entries(user_id, local_date);
create index if not exists entries_hidden       on public.entries(user_id, hidden) where hidden = false;

-- RLS for entries
alter table public.entries enable row level security;

create policy "Users can view own entries"
  on public.entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own entries"
  on public.entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on public.entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own entries"
  on public.entries for delete
  using (auth.uid() = user_id);

-- =============================================
-- WEEKLY INSIGHTS (cached AI summaries)
-- =============================================
create table if not exists public.weekly_insights (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  week_start   date not null,  -- Monday of the week
  headline     text not null,
  summary      text not null,
  top_category text not null,
  generated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- RLS for weekly_insights
alter table public.weekly_insights enable row level security;

create policy "Users can view own weekly insights"
  on public.weekly_insights for select
  using (auth.uid() = user_id);

-- Insights are inserted by the Edge Function with service role key; no insert policy needed for anon users
