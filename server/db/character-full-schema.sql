-- Nova OS — Character Development Engine (Full Schema)
-- Run in Supabase SQL Editor.
-- All tables prefixed character_ for namespace isolation.
-- ============================================================

-- ── Helper: auto-update updated_at ─────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 1. CHARACTER TRAITS
-- ============================================================
create table if not exists public.character_traits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  description     text not null default '',
  icon            text not null default 'star',
  visual_key      text,
  current_score   integer not null default 1,
  lifetime_xp     integer not null default 0,
  current_rank    integer not null default 1,
  target_score    integer not null default 10,
  status          text not null default 'active',
  display_order   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists character_traits_user_idx
  on public.character_traits (user_id);

create trigger trg_character_traits_updated_at
  before update on public.character_traits
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. CHARACTER SEASONS
-- ============================================================
create table if not exists public.character_seasons (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null,
  identity_focus    text not null default '',
  target_trait_ids  uuid[] default '{}',
  target_habit_ids  uuid[] default '{}',
  target_ladder_ids uuid[] default '{}',
  start_date        date not null,
  end_date          date,
  status            text not null default 'planning',
  opening_xp        integer not null default 0,
  earned_xp         integer not null default 0,
  completion_score  integer,
  final_reflection  text default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists character_seasons_user_idx
  on public.character_seasons (user_id);

create trigger trg_character_seasons_updated_at
  before update on public.character_seasons
  for each row execute function public.set_updated_at();

-- ============================================================
-- 3. CHARACTER PROFILE  (depends on seasons)
-- ============================================================
create table if not exists public.character_profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references auth.users(id) on delete cascade,
  title                 text not null default 'The Initiate',
  identity_statement    text not null default '',
  current_level         integer not null default 1,
  total_xp              integer not null default 0,
  current_level_xp      integer not null default 0,
  selected_archetype    text,
  active_season_id      uuid references public.character_seasons(id) on delete set null,
  onboarding_status     text not null default 'not_started',
  preferred_difficulty  integer not null default 3,
  recovery_mode         boolean not null default false,
  current_streak        integer not null default 0,
  max_streak            integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger trg_character_profiles_updated_at
  before update on public.character_profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- 4. CHARACTER HABITS
-- ============================================================
create table if not exists public.character_habits (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  title               text not null,
  description         text not null default '',
  linked_trait_id     uuid references public.character_traits(id) on delete set null,
  habit_type          text not null default 'build',
  cue                 text not null default '',
  expected_response   text not null default '',
  replacement_behavior text not null default '',
  frequency           text not null default 'daily',
  scheduled_days      integer[],
  preferred_time      time,
  target_count        integer not null default 1,
  difficulty          integer not null default 3,
  base_xp             integer not null default 10,
  is_active           boolean not null default true,
  start_date          date not null default current_date,
  end_date            date,
  planner_task_id     text,
  reminder_enabled    boolean not null default false,
  reminder_time       time,
  current_streak      integer not null default 0,
  max_streak          integer not null default 0,
  last_completed_date date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists character_habits_user_idx
  on public.character_habits (user_id);

create index if not exists character_habits_trait_idx
  on public.character_habits (linked_trait_id);

create trigger trg_character_habits_updated_at
  before update on public.character_habits
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. CHARACTER QUESTS
-- ============================================================
create table if not exists public.character_quests (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  quest_type            text not null default 'standard',
  title                 text not null,
  description           text not null default '',
  why_it_matters        text not null default '',
  linked_trait_ids      uuid[] default '{}',
  difficulty            integer not null default 5,
  estimated_discomfort  integer not null default 5,
  target_date           date,
  checklist_steps       jsonb not null default '[]',
  required_proof        text not null default '',
  proof_type            text not null default 'text',
  reward_xp             integer not null default 50,
  bonus_conditions      jsonb not null default '[]',
  failure_rule          text not null default 'retry',
  retry_count           integer not null default 0,
  status                text not null default 'active',
  source                text not null default 'user',
  ai_generation_metadata jsonb not null default '{}',
  planner_task_id       text,
  goal_id               text,
  crm_contact_id        text,
  crm_opportunity_id    text,
  completed_at          timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists character_quests_user_idx
  on public.character_quests (user_id);

create index if not exists character_quests_status_idx
  on public.character_quests (user_id, status);

-- ============================================================
-- 6. CHARACTER EXPOSURE LADDERS
-- ============================================================
create table if not exists public.character_exposure_ladders (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  title                 text not null,
  description           text not null default '',
  linked_trait_id       uuid references public.character_traits(id) on delete set null,
  desired_end_behavior  text not null default '',
  status                text not null default 'active',
  current_step          integer not null default 0,
  completion_percentage numeric not null default 0,
  difficulty_policy     text not null default 'graduated',
  ai_adaptation_enabled boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists character_exposure_ladders_user_idx
  on public.character_exposure_ladders (user_id);

create trigger trg_character_exposure_ladders_updated_at
  before update on public.character_exposure_ladders
  for each row execute function public.set_updated_at();

-- ============================================================
-- 7. CHARACTER EXPOSURE STEPS
-- ============================================================
create table if not exists public.character_exposure_steps (
  id                      uuid primary key default gen_random_uuid(),
  ladder_id               uuid not null references public.character_exposure_ladders(id) on delete cascade,
  step_order              integer not null,
  title                   text not null,
  instructions            text not null default '',
  difficulty              integer not null default 5,
  discomfort_estimate     integer not null default 5,
  repetition_target       integer not null default 1,
  successful_repetitions  integer not null default 0,
  reflection_required     boolean not null default false,
  proof_required          boolean not null default false,
  status                  text not null default 'locked',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists character_exposure_steps_ladder_idx
  on public.character_exposure_steps (ladder_id, step_order);

create trigger trg_character_exposure_steps_updated_at
  before update on public.character_exposure_steps
  for each row execute function public.set_updated_at();

-- ============================================================
-- 8. CHARACTER IF-THEN RULES (created before bad_guys to break circular FK)
-- ============================================================
create table if not exists public.character_if_then_rules (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  trigger_condition text not null,
  response_action   text not null,
  linked_trait_id   uuid references public.character_traits(id) on delete set null,
  linked_bad_guy_id uuid,  -- FK added after character_bad_guys is created
  is_active         boolean not null default true,
  success_count     integer not null default 0,
  failure_count     integer not null default 0,
  effectiveness_score numeric default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists character_if_then_rules_user_idx
  on public.character_if_then_rules (user_id);

create trigger trg_character_if_then_rules_updated_at
  before update on public.character_if_then_rules
  for each row execute function public.set_updated_at();

-- ============================================================
-- 9. CHARACTER BAD GUYS
-- ============================================================
create table if not exists public.character_bad_guys (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  title                 text not null,
  trigger_description   text not null default '',
  warning_signs         text not null default '',
  usual_behavior        text not null default '',
  cost_consequence      text not null default '',
  replacement_response  text not null default '',
  linked_rule_id        uuid references public.character_if_then_rules(id) on delete set null,
  severity              integer not null default 3,
  occurrence_count      integer not null default 0,
  defeated_count        integer not null default 0,
  last_occurrence_at    timestamptz,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists character_bad_guys_user_idx
  on public.character_bad_guys (user_id);

create trigger trg_character_bad_guys_updated_at
  before update on public.character_bad_guys
  for each row execute function public.set_updated_at();

-- Now wire the circular FK: if_then_rules.linked_bad_guy_id → bad_guys
alter table public.character_if_then_rules
  add constraint fk_if_then_rules_bad_guy
  foreign key (linked_bad_guy_id) references public.character_bad_guys(id)
  on delete set null;

-- ============================================================
-- 10. CHARACTER POWER-UPS
-- ============================================================
create table if not exists public.character_power_ups (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  title                 text not null,
  description           text not null default '',
  duration_minutes      integer not null default 5,
  category              text not null default 'reset',
  instructions          text not null default '',
  linked_bad_guy_ids    uuid[] default '{}',
  usage_count           integer not null default 0,
  effectiveness_rating  numeric default 0,
  is_favorite           boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists character_power_ups_user_idx
  on public.character_power_ups (user_id);

create trigger trg_character_power_ups_updated_at
  before update on public.character_power_ups
  for each row execute function public.set_updated_at();

-- ============================================================
-- 11. CHARACTER ACCOUNTABILITY CONTRACTS
-- ============================================================
create table if not exists public.character_contracts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  title                 text not null,
  goal_description      text not null default '',
  measurable_commitment text not null default '',
  reporting_frequency   text not null default 'weekly',
  start_date            date not null,
  end_date              date,
  proof_requirement     text not null default '',
  accountability_person text not null default '',
  crm_contact_id        text,
  stake_type            text not null default 'none',
  stake_description     text not null default '',
  consequence           text not null default '',
  grace_rules           text not null default '',
  is_active             boolean not null default true,
  completion_status     text not null default 'pending',
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists character_contracts_user_idx
  on public.character_contracts (user_id);

create trigger trg_character_contracts_updated_at
  before update on public.character_contracts
  for each row execute function public.set_updated_at();

-- ============================================================
-- 12. CHARACTER ACTIVITY LOG
-- ============================================================
create table if not exists public.character_activity_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  event_type    text not null,
  entity_type   text,
  entity_id     text,
  xp_delta      integer not null default 0,
  trait_impact  jsonb not null default '{}',
  metadata      jsonb not null default '{}',
  note          text default '',
  created_at    timestamptz not null default now()
);

create index if not exists character_activity_logs_user_idx
  on public.character_activity_logs (user_id, created_at desc);

create index if not exists character_activity_logs_event_idx
  on public.character_activity_logs (user_id, event_type);

-- ============================================================
-- 13. CHARACTER REFLECTIONS
-- ============================================================
create table if not exists public.character_reflections (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  pre_action_fear         text not null default '',
  post_action_result      text not null default '',
  what_happened           text not null default '',
  what_learned            text not null default '',
  emotional_intensity_before integer not null default 5,
  emotional_intensity_after  integer not null default 5,
  next_step               text not null default '',
  privacy_setting         text not null default 'private',
  ai_summary_status       text not null default 'pending',
  linked_entity_type      text,
  linked_entity_id        uuid,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists character_reflections_user_idx
  on public.character_reflections (user_id, created_at desc);

create trigger trg_character_reflections_updated_at
  before update on public.character_reflections
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array[
    'character_profiles', 'character_traits', 'character_habits', 'character_quests',
    'character_exposure_ladders', 'character_exposure_steps', 'character_bad_guys',
    'character_power_ups', 'character_if_then_rules', 'character_contracts',
    'character_activity_logs', 'character_reflections', 'character_seasons'
  ])
  loop
    execute format('alter table public.%I enable row level security;', tbl);
    execute format(
      'create policy "Users own their %I rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      tbl, tbl
    );
  end loop;
end;
$$;

-- ============================================================
-- SERVER-SIDE XP FUNCTIONS
-- ============================================================

-- ── award_character_xp ─────────────────────────────────────
-- Idempotent XP awarding with level-up detection and activity logging.
create or replace function public.award_character_xp(
  p_user_id      uuid,
  p_amount       integer,
  p_entity_type  text default null,
  p_entity_id    text default null,
  p_trait_id     uuid default null,
  p_note         text default null
) returns jsonb
language plpgsql security definer
as $$
declare
  v_profile  record;
  v_new_xp   integer;
  v_new_lvl  integer;
  v_lvl_xp   integer;
  v_leveled  boolean := false;
  v_trait    record;
begin
  if p_amount <= 0 then
    return jsonb_build_object('total_xp', 0, 'level', 1, 'did_level_up', false, 'awarded_xp', 0);
  end if;

  -- Get or auto-create profile
  select * into v_profile
  from public.character_profiles
  where user_id = p_user_id;

  if not found then
    insert into public.character_profiles (user_id, total_xp, current_level_xp)
    values (p_user_id, p_amount, least(p_amount, 99))
    returning * into v_profile;
    v_new_xp := p_amount;
    v_new_lvl := 1;
  else
    v_new_xp := v_profile.total_xp + p_amount;
    v_new_lvl := v_profile.current_level;

    -- Level thresholds: 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000
    if v_new_xp >= 32000 and v_new_lvl < 10 then
      v_new_lvl := 10; v_leveled := true;
    elsif v_new_xp >= 16000 and v_new_lvl < 9 then
      v_new_lvl := 9; v_leveled := true;
    elsif v_new_xp >= 8000 and v_new_lvl < 8 then
      v_new_lvl := 8; v_leveled := true;
    elsif v_new_xp >= 4000 and v_new_lvl < 7 then
      v_new_lvl := 7; v_leveled := true;
    elsif v_new_xp >= 2000 and v_new_lvl < 6 then
      v_new_lvl := 6; v_leveled := true;
    elsif v_new_xp >= 1000 and v_new_lvl < 5 then
      v_new_lvl := 5; v_leveled := true;
    elsif v_new_xp >= 500 and v_new_lvl < 4 then
      v_new_lvl := 4; v_leveled := true;
    elsif v_new_xp >= 250 and v_new_lvl < 3 then
      v_new_lvl := 3; v_leveled := true;
    elsif v_new_xp >= 100 and v_new_lvl < 2 then
      v_new_lvl := 2; v_leveled := true;
    end if;
  end if;

  -- Calculate current-level XP
  v_lvl_xp := case v_new_lvl
    when 1  then v_new_xp
    when 2  then v_new_xp - 100
    when 3  then v_new_xp - 250
    when 4  then v_new_xp - 500
    when 5  then v_new_xp - 1000
    when 6  then v_new_xp - 2000
    when 7  then v_new_xp - 4000
    when 8  then v_new_xp - 8000
    when 9  then v_new_xp - 16000
    when 10 then least(v_new_xp - 32000, 100000)
    else v_new_xp
  end;

  update public.character_profiles
  set total_xp = v_new_xp,
      current_level = v_new_lvl,
      current_level_xp = v_lvl_xp,
      updated_at = now()
  where id = v_profile.id;

  -- Award XP to linked trait
  if p_trait_id is not null then
    update public.character_traits
    set lifetime_xp = lifetime_xp + p_amount,
        current_score = least(
          (select target_score from public.character_traits where id = p_trait_id),
          floor((lifetime_xp + p_amount) / 100) + 1
        ),
        current_rank = floor((lifetime_xp + p_amount) / 100) + 1,
        updated_at = now()
    where id = p_trait_id and user_id = p_user_id;
  end if;

  -- Log activity
  insert into public.character_activity_logs
    (user_id, event_type, entity_type, entity_id, xp_delta, trait_impact, note)
  values
    (p_user_id, 'xp_earned', p_entity_type, p_entity_id, p_amount,
     case when p_trait_id is not null
       then jsonb_build_object('trait_id', p_trait_id::text)
       else '{}'::jsonb
     end,
     p_note);

  return jsonb_build_object(
    'total_xp',    v_new_xp,
    'level',       v_new_lvl,
    'current_level_xp', v_lvl_xp,
    'did_level_up', v_leveled,
    'awarded_xp',  p_amount
  );
end;
$$;

-- ── complete_character_habit ───────────────────────────────
-- Idempotent: same habit can only be completed once per day.
create or replace function public.complete_character_habit(
  p_habit_id uuid,
  p_user_id  uuid
) returns jsonb
language plpgsql security definer
as $$
declare
  v_habit        record;
  v_today        date;
  v_already      boolean;
  v_xp           integer;
  v_streak       integer;
  v_max_streak   integer;
  v_result       jsonb;
begin
  v_today := current_date;

  select * into v_habit
  from public.character_habits
  where id = p_habit_id and user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Habit not found');
  end if;

  -- Idempotency: already logged today?
  select exists(
    select 1 from public.character_activity_logs
    where user_id = p_user_id
      and event_type = 'habit_completed'
      and entity_id = p_habit_id::text
      and created_at::date = v_today
  ) into v_already;

  if v_already then
    return jsonb_build_object('error', 'Already completed today', 'idempotent', true);
  end if;

  -- Calculate streak
  if v_habit.last_completed_date = v_today - 1 then
    v_streak := v_habit.current_streak + 1;
  elsif v_habit.last_completed_date >= v_today then
    v_streak := v_habit.current_streak;
  else
    v_streak := 1;
  end if;

  v_max_streak := greatest(v_habit.max_streak, v_streak);

  -- XP with streak bonus
  v_xp := v_habit.base_xp;
  if v_streak >= 30 then
    v_xp := floor(v_xp * 1.5);
  elsif v_streak >= 14 then
    v_xp := floor(v_xp * 1.3);
  elsif v_streak >= 7 then
    v_xp := floor(v_xp * 1.15);
  end if;

  update public.character_habits
  set current_streak = v_streak,
      max_streak = v_max_streak,
      last_completed_date = v_today,
      updated_at = now()
  where id = p_habit_id;

  -- Log activity
  insert into public.character_activity_logs
    (user_id, event_type, entity_type, entity_id, xp_delta, note)
  values
    (p_user_id, 'habit_completed', 'habit', p_habit_id::text, v_xp,
     format('Completed habit "%s" (streak %s)', v_habit.title, v_streak));

  -- Award XP server-side
  v_result := public.award_character_xp(
    p_user_id, v_xp, 'habit', p_habit_id::text,
    v_habit.linked_trait_id,
    format('Habit: %s', v_habit.title)
  );

  return jsonb_build_object(
    'xp_awarded', v_xp,
    'streak', v_streak,
    'max_streak', v_max_streak
  ) || v_result;
end;
$$;

-- ── complete_character_quest ───────────────────────────────
-- Idempotent: prevents double-completion of the same quest.
create or replace function public.complete_character_quest(
  p_quest_id uuid,
  p_user_id  uuid
) returns jsonb
language plpgsql security definer
as $$
declare
  v_quest   record;
  v_already boolean;
  v_any_trait uuid;
  v_result  jsonb;
begin
  select * into v_quest
  from public.character_quests
  where id = p_quest_id and user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Quest not found');
  end if;

  if v_quest.status = 'completed' then
    return jsonb_build_object('error', 'Already completed', 'idempotent', true);
  end if;

  -- Pick first linked trait for XP routing
  if array_length(v_quest.linked_trait_ids, 1) > 0 then
    v_any_trait := v_quest.linked_trait_ids[1];
  end if;

  update public.character_quests
  set status = 'completed',
      completed_at = now()
  where id = p_quest_id;

  insert into public.character_activity_logs
    (user_id, event_type, entity_type, entity_id, xp_delta, note)
  values
    (p_user_id, 'quest_completed', 'quest', p_quest_id::text, v_quest.reward_xp,
     format('Completed quest "%s"', v_quest.title));

  v_result := public.award_character_xp(
    p_user_id, v_quest.reward_xp, 'quest', p_quest_id::text,
    v_any_trait,
    format('Quest: %s', v_quest.title)
  );

  return jsonb_build_object(
    'quest_id', p_quest_id::text,
    'xp_awarded', v_quest.reward_xp
  ) || v_result;
end;
$$;

-- ── resist_character_bad_guy ───────────────────────────────
create or replace function public.resist_character_bad_guy(
  p_bad_guy_id uuid,
  p_user_id    uuid
) returns jsonb
language plpgsql security definer
as $$
declare
  v_bad_guy record;
  v_linked_trait uuid;
  v_result jsonb;
begin
  select * into v_bad_guy
  from public.character_bad_guys
  where id = p_bad_guy_id and user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Bad guy not found');
  end if;

  -- Find linked trait from the associated if-then rule
  select linked_trait_id into v_linked_trait
  from public.character_if_then_rules
  where id = v_bad_guy.linked_rule_id;

  update public.character_bad_guys
  set occurrence_count = occurrence_count + 1,
      defeated_count = defeated_count + 1,
      last_occurrence_at = now(),
      updated_at = now()
  where id = p_bad_guy_id;

  insert into public.character_activity_logs
    (user_id, event_type, entity_type, entity_id, xp_delta, note)
  values
    (p_user_id, 'bad_guy_resisted', 'bad_guy', p_bad_guy_id::text, 50,
     format('Resisted "%s"', v_bad_guy.title));

  v_result := public.award_character_xp(
    p_user_id, 50, 'bad_guy', p_bad_guy_id::text,
    v_linked_trait,
    format('Resisted bad guy: %s', v_bad_guy.title)
  );

  return jsonb_build_object('bad_guy', p_bad_guy_id::text, 'resisted', true) || v_result;
end;
$$;

-- ── trigger_bad_guy (give in, no XP) ──────────────────────
create or replace function public.trigger_character_bad_guy(
  p_bad_guy_id uuid,
  p_user_id    uuid
) returns jsonb
language plpgsql security definer
as $$
declare
  v_bad_guy record;
begin
  select * into v_bad_guy
  from public.character_bad_guys
  where id = p_bad_guy_id and user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Bad guy not found');
  end if;

  update public.character_bad_guys
  set occurrence_count = occurrence_count + 1,
      last_occurrence_at = now(),
      updated_at = now()
  where id = p_bad_guy_id;

  insert into public.character_activity_logs
    (user_id, event_type, entity_type, entity_id, xp_delta, note)
  values
    (p_user_id, 'bad_guy_triggered', 'bad_guy', p_bad_guy_id::text, 0,
     format('Triggered "%s"', v_bad_guy.title));

  return jsonb_build_object('bad_guy', p_bad_guy_id::text, 'triggered', true);
end;
$$;

-- ── complete_character_contract ────────────────────────────
create or replace function public.complete_character_contract(
  p_contract_id uuid,
  p_user_id     uuid
) returns jsonb
language plpgsql security definer
as $$
declare
  v_contract record;
  v_result   jsonb;
begin
  select * into v_contract
  from public.character_contracts
  where id = p_contract_id and user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Contract not found');
  end if;

  if v_contract.completion_status = 'completed' then
    return jsonb_build_object('error', 'Already completed', 'idempotent', true);
  end if;

  update public.character_contracts
  set completion_status = 'completed',
      is_active = false,
      completed_at = now(),
      updated_at = now()
  where id = p_contract_id;

  insert into public.character_activity_logs
    (user_id, event_type, entity_type, entity_id, xp_delta, note)
  values
    (p_user_id, 'contract_completed', 'contract', p_contract_id::text, 100,
     format('Completed contract "%s"', v_contract.title));

  v_result := public.award_character_xp(
    p_user_id, 100, 'contract', p_contract_id::text,
    null,
    format('Contract: %s', v_contract.title)
  );

  return jsonb_build_object('contract', p_contract_id::text, 'completed', true) || v_result;
end;
$$;

-- ── use_character_power_up ─────────────────────────────────
create or replace function public.use_character_power_up(
  p_power_up_id uuid,
  p_user_id     uuid
) returns jsonb
language plpgsql security definer
as $$
declare
  v_power_up record;
  v_result   jsonb;
begin
  select * into v_power_up
  from public.character_power_ups
  where id = p_power_up_id and user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Power-up not found');
  end if;

  update public.character_power_ups
  set usage_count = usage_count + 1,
      updated_at = now()
  where id = p_power_up_id;

  insert into public.character_activity_logs
    (user_id, event_type, entity_type, entity_id, xp_delta, note)
  values
    (p_user_id, 'power_up_used', 'power_up', p_power_up_id::text, 10,
     format('Used power-up "%s"', v_power_up.title));

  v_result := public.award_character_xp(
    p_user_id, 10, 'power_up', p_power_up_id::text,
    null,
    format('Power-up: %s', v_power_up.title)
  );

  return jsonb_build_object('power_up', p_power_up_id::text, 'used', true) || v_result;
end;
$$;

-- ── trigger_if_then_rule ────────────────────────────────────
create or replace function public.trigger_character_if_then(
  p_rule_id    uuid,
  p_user_id    uuid,
  p_followed   boolean
) returns jsonb
language plpgsql security definer
as $$
declare
  v_rule record;
  v_xp   integer;
  v_result jsonb;
begin
  select * into v_rule
  from public.character_if_then_rules
  where id = p_rule_id and user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Rule not found');
  end if;

  if p_followed then
    update public.character_if_then_rules
    set success_count = success_count + 1,
        effectiveness_score = case
          when success_count + failure_count > 0
          then round((success_count + 1)::numeric / (success_count + failure_count + 1) * 100)
          else 100
        end,
        updated_at = now()
    where id = p_rule_id;

    insert into public.character_activity_logs
      (user_id, event_type, entity_type, entity_id, xp_delta, note)
    values
      (p_user_id, 'if_then_followed', 'if_then_rule', p_rule_id::text, 25,
       format('Followed rule: If "%s" then "%s"', v_rule.trigger_condition, v_rule.response_action));

    v_result := public.award_character_xp(
      p_user_id, 25, 'if_then_rule', p_rule_id::text,
      v_rule.linked_trait_id,
      format('If-Then rule: %s → %s', v_rule.trigger_condition, v_rule.response_action)
    );

    return jsonb_build_object('followed', true, 'xp_awarded', 25) || v_result;
  else
    update public.character_if_then_rules
    set failure_count = failure_count + 1,
        effectiveness_score = case
          when success_count + failure_count > 0
          then round(success_count::numeric / (success_count + failure_count + 1) * 100)
          else 0
        end,
        updated_at = now()
    where id = p_rule_id;

    insert into public.character_activity_logs
      (user_id, event_type, entity_type, entity_id, xp_delta, note)
    values
      (p_user_id, 'if_then_missed', 'if_then_rule', p_rule_id::text, 0,
       format('Missed rule: If "%s" then "%s"', v_rule.trigger_condition, v_rule.response_action));

    return jsonb_build_object('followed', false, 'xp_awarded', 0);
  end if;
end;
$$;

-- ============================================================
-- INDEXES FOR QUERY PERFORMANCE
-- ============================================================
create index if not exists character_activity_logs_lookup
  on public.character_activity_logs (user_id, event_type, created_at desc);

create index if not exists character_quests_linked_traits
  on public.character_quests using gin (linked_trait_ids);

create index if not exists character_exposure_steps_status
  on public.character_exposure_steps (ladder_id, status);

-- ============================================================
-- CLEANUP: old schema tables from v1 (no longer needed)
-- These are NOT dropped automatically; existing data is retained.
-- Run manually after verifying migration:
--   drop table if exists public.character_state cascade;
--   drop table if exists public.character_habit_logs cascade;
--   drop table if exists public.character_challenge_completions cascade;
--   drop table if exists public.character_ai_challenges cascade;
--   drop table if exists public.character_dopamine cascade;
--   drop table if exists public.character_coaching_cache cascade;
-- ============================================================
