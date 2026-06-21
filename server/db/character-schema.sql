-- Motasem OS — Character Module Schema
-- Run in Supabase SQL Editor.
-- All tables prefixed character_ to coexist with existing tables.

create table character_state (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  xp                 integer not null default 0,
  level              integer not null default 1,
  stats              jsonb not null default '{"presence":20,"discipline":10,"social":5,"physique":15,"craft":40,"frame":10}',
  week_streak        jsonb not null default '[false,false,false,false,false,false,false]',
  approach_progress  jsonb not null default '[0,0,0,0]',
  updated_at         timestamptz not null default now()
);

create table character_habit_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  habit_id       text not null,
  habit_name     text,
  xp_awarded     integer,
  stat_affected  text,
  is_never_do    boolean default false,
  logged_date    date not null default current_date
);

create unique index habit_log_unique_per_day
  on character_habit_logs(user_id, habit_id, logged_date);

create table character_challenge_completions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  challenge_id    text not null,
  challenge_title text,
  xp_awarded      integer,
  tag             text,
  difficulty      text,
  completed_at    timestamptz not null default now()
);

create unique index challenge_unique_per_user
  on character_challenge_completions(user_id, challenge_id);

create table character_ai_challenges (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  title               text not null,
  description         text,
  tag                 text,
  xp                  integer,
  difficulty          text,
  rationale           text,
  parent_challenge_id text,
  is_completed        boolean default false,
  created_at          timestamptz not null default now()
);

create table character_dopamine (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  current_streak     integer not null default 0,
  longest_streak     integer not null default 0,
  last_checkin_date  date,
  relapse_log        jsonb not null default '[]',
  updated_at         timestamptz not null default now()
);

create table character_coaching_cache (
  user_id     uuid not null references auth.users(id) on delete cascade,
  cache_date  date not null default current_date,
  daily_brief text,
  primary key (user_id, cache_date)
);

alter table character_state                  enable row level security;
alter table character_habit_logs             enable row level security;
alter table character_challenge_completions  enable row level security;
alter table character_ai_challenges          enable row level security;
alter table character_dopamine               enable row level security;
alter table character_coaching_cache         enable row level security;

create policy "Users access own rows" on character_state
  for all using (auth.uid() = user_id);

create policy "Users access own rows" on character_habit_logs
  for all using (auth.uid() = user_id);

create policy "Users access own rows" on character_challenge_completions
  for all using (auth.uid() = user_id);

create policy "Users access own rows" on character_ai_challenges
  for all using (auth.uid() = user_id);

create policy "Users access own rows" on character_dopamine
  for all using (auth.uid() = user_id);

create policy "Users access own rows" on character_coaching_cache
  for all using (auth.uid() = user_id);
