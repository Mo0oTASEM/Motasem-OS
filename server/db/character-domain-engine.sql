-- Nova OS — Character Domain Engine
-- Run after character-full-schema.sql in Supabase SQL Editor.
-- Adds XP ledger, achievements, config table, enhanced server-side functions,
-- anti-farming, exposure progression, recovery mode.
-- ============================================================

-- ── XP Configuration Table ──────────────────────────────────
create table if not exists public.character_xp_config (
  key         text primary key,
  value       integer not null,
  description text not null default ''
);

insert into public.character_xp_config (key, value, description) values
  ('level_curve_base', 100, 'Base multiplier for level curve: round(base * level^exponent)'),
  ('level_curve_exponent', 150, 'Exponent * 100 for level curve (stored as integer)'),
  ('habit_easy_xp', 5, 'XP for easy habit (difficulty 1-2)'),
  ('habit_medium_xp', 10, 'XP for medium habit (difficulty 3-4)'),
  ('habit_hard_xp', 15, 'XP for hard habit (difficulty 5+)'),
  ('quest_base_xp', 15, 'Base XP for quest, multiplied by difficulty factor'),
  ('exposure_step_base_xp', 20, 'Base XP for completing an exposure step'),
  ('boss_fight_base_xp', 100, 'Base XP for boss fight, scaled by complexity'),
  ('bad_guy_resist_xp', 50, 'XP for resisting a bad guy'),
  ('power_up_use_xp', 10, 'XP for using a power-up'),
  ('if_then_follow_xp', 25, 'XP for following an if-then rule'),
  ('contract_complete_xp', 100, 'XP for completing an accountability contract'),
  ('reflection_xp', 15, 'XP for submitting a meaningful reflection'),
  ('integrity_bonus_xp', 10, 'Bonus XP for completing despite logged resistance'),
  ('recovery_action_xp', 8, 'XP for recovery action after a lapse'),
  ('daily_habit_cap', 20, 'Max habit completions per day'),
  ('daily_quest_cap', 5, 'Max quest completions per day'),
  ('grace_tokens_per_week', 3, 'Number of streak grace tokens per week'),
  ('streak_bonus_pct_7', 15, 'Percentage XP bonus at 7-day streak'),
  ('streak_bonus_pct_14', 30, 'Percentage XP bonus at 14-day streak'),
  ('streak_bonus_pct_30', 50, 'Percentage XP bonus at 30-day streak'),
  ('integrity_bonus_interval_hours', 24, 'Hours between integrity bonus eligibility'),
  ('recovery_cooldown_hours', 48, 'Minimum hours before another recovery XP is eligible'),
  ('reflection_min_chars', 30, 'Minimum characters for meaningful reflection'),
  ('trivial_quest_xp_threshold', 10, 'Quests with reward_xp below this earn 0 XP after N completions'),
  ('trivial_quest_cap', 5, 'Number of completions before trivial XP kicks in'),
  ('trait_decay_days', 90, 'Days of inactivity before trait score begins softening'),
  ('trait_decay_rate', 5, 'Points of trait score decay per month after inactivity'),
on conflict (key) do nothing;

-- ── Immutable XP Ledger ─────────────────────────────────────
create table if not exists public.xp_ledger (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  amount         integer not null check (amount > 0),
  balance_before integer not null,
  balance_after  integer not null,
  xp_category    text not null default 'general',
  entity_type    text,
  entity_id      text,
  reason         text,
  created_at     timestamptz not null default now()
);

create index if not exists xp_ledger_user_idx
  on public.xp_ledger (user_id, created_at desc);

-- ── Character Achievements ──────────────────────────────────
create table if not exists public.character_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  title          text not null,
  description    text not null,
  icon           text not null default 'award',
  unlocked_at    timestamptz not null default now(),
  unique(user_id, achievement_id)
);

create index if not exists character_achievements_user_idx
  on public.character_achievements (user_id);

-- ── Helper: get XP config value ─────────────────────────────
create or replace function public.get_xp_config(p_key text) returns integer
language plpgsql stable
as $$
declare
  v_val integer;
begin
  select value into v_val from public.character_xp_config where key = p_key;
  return coalesce(v_val, 0);
end;
$$;

-- ── Helper: level curve ─────────────────────────────────────
create or replace function public.xp_for_level(p_level integer) returns integer
language plpgsql stable
as $$
declare
  v_base integer;
  v_exp  numeric;
begin
  v_base := public.get_xp_config('level_curve_base');
  v_exp  := public.get_xp_config('level_curve_exponent')::numeric / 100.0;
  return round(v_base * power(p_level::numeric, v_exp));
end;
$$;

-- ── Helper: determine level from cumulative XP ─────────────
create or replace function public.level_from_xp(p_total_xp integer) returns integer
language plpgsql stable
as $$
declare
  v_lvl  integer := 10;
  v_req  integer;
begin
  while v_lvl > 1 loop
    v_req := public.xp_for_level(v_lvl);
    if p_total_xp >= v_req then
      return v_lvl;
    end if;
    v_lvl := v_lvl - 1;
  end loop;
  return 1;
end;
$$;

-- ── Helper: current-level XP offset ─────────────────────────
create or replace function public.current_level_xp_offset(p_total_xp integer, p_level integer) returns integer
language plpgsql stable
as $$
declare
  v_prev integer;
begin
  if p_level <= 1 then
    return p_total_xp;
  end if;
  v_prev := public.xp_for_level(p_level - 1);
  return p_total_xp - v_prev;
end;
$$;

-- ── Helper: write to XP ledger ─────────────────────────────
create or replace function public.write_xp_ledger(
  p_user_id    uuid,
  p_amount     integer,
  p_balance_before integer,
  p_category   text,
  p_entity_type text default null,
  p_entity_id   text default null,
  p_reason      text default null
) returns void
language plpgsql security definer
as $$
begin
  insert into public.xp_ledger
    (user_id, amount, balance_before, balance_after, xp_category, entity_type, entity_id, reason)
  values
    (p_user_id, p_amount, p_balance_before, p_balance_before + p_amount,
     p_category, p_entity_type, p_entity_id, p_reason);
end;
$$;

-- ── Helper: check daily completion cap ─────────────────────
create or replace function public.check_daily_cap(
  p_user_id    uuid,
  p_entity_type text,
  p_max_key    text
) returns boolean
language plpgsql security definer
as $$
declare
  v_cap   integer;
  v_count integer;
begin
  v_cap := public.get_xp_config(p_max_key);
  if v_cap <= 0 then
    return true; -- no cap
  end if;

  select count(*) into v_count
  from public.character_activity_logs
  where user_id = p_user_id
    and entity_type = p_entity_type
    and created_at::date = current_date;

  return v_count < v_cap;
end;
$$;

-- ── Helper: check integrity bonus eligibility ─────────────
create or replace function public.can_award_integrity_bonus(
  p_user_id uuid,
  p_trait_id uuid
) returns boolean
language plpgsql security definer
as $$
declare
  v_interval_hours integer;
  v_last_bonus     timestamptz;
begin
  v_interval_hours := public.get_xp_config('integrity_bonus_interval_hours');
  if v_interval_hours <= 0 then
    return true;
  end if;

  select max(created_at) into v_last_bonus
  from public.xp_ledger
  where user_id = p_user_id
    and xp_category = 'integrity_bonus'
    and entity_id = p_trait_id::text;

  if v_last_bonus is null then
    return true;
  end if;

  return extract(epoch from (now() - v_last_bonus)) / 3600 >= v_interval_hours;
end;
$$;

-- ============================================================
-- REWRITTEN: award_character_xp
-- Formula-based level curve, immutable ledger, category support
-- ============================================================
create or replace function public.award_character_xp(
  p_user_id      uuid,
  p_amount       integer,
  p_entity_type  text default null,
  p_entity_id    text default null,
  p_trait_id     uuid default null,
  p_note         text default null,
  p_xp_category  text default 'general'
) returns jsonb
language plpgsql security definer
as $$
declare
  v_profile      record;
  v_new_xp       integer;
  v_new_lvl      integer;
  v_lvl_xp       integer;
  v_leveled      boolean := false;
  v_prev_lvl     integer;
  v_achievements text[] := '{}';
begin
  if p_amount <= 0 then
    return jsonb_build_object('total_xp', 0, 'level', 1,
      'current_level_xp', 0, 'did_level_up', false, 'awarded_xp', 0,
      'error', 'Amount must be positive');
  end if;

  -- Get or auto-create profile
  select * into v_profile
  from public.character_profiles
  where user_id = p_user_id;

  if not found then
    insert into public.character_profiles
      (user_id, total_xp, current_level, current_level_xp)
    values
      (p_user_id, p_amount, 1, p_amount)
    returning * into v_profile;
    v_new_xp := p_amount;
    v_new_lvl := 1;
  else
    v_new_xp := v_profile.total_xp + p_amount;
    v_prev_lvl := v_profile.current_level;
    v_new_lvl := public.level_from_xp(v_new_xp);

    if v_new_lvl > v_prev_lvl then
      v_leveled := true;
    end if;
  end if;

  v_lvl_xp := public.current_level_xp_offset(v_new_xp, v_new_lvl);

  update public.character_profiles
  set total_xp = v_new_xp,
      current_level = v_new_lvl,
      current_level_xp = v_lvl_xp,
      updated_at = now()
  where id = v_profile.id;

  -- Immutable ledger entry
  perform public.write_xp_ledger(
    p_user_id, p_amount, v_new_xp - p_amount,
    p_xp_category, p_entity_type, p_entity_id, p_note
  );

  -- Award XP to linked trait
  if p_trait_id is not null then
    update public.character_traits
    set lifetime_xp = lifetime_xp + p_amount,
        current_score = least(100,
          floor((lifetime_xp + p_amount) / 20.0)::integer + 1
        ),
        current_rank = floor((lifetime_xp + p_amount) / 100.0)::integer + 1,
        updated_at = now()
    where id = p_trait_id and user_id = p_user_id;
  end if;

  -- Log activity
  insert into public.character_activity_logs
    (user_id, event_type, entity_type, entity_id, xp_delta, trait_impact, note)
  values
    (p_user_id, 'xp_earned', p_entity_type, p_entity_id, p_amount,
     case when p_trait_id is not null
       then jsonb_build_object('xp_category', p_xp_category, 'trait_id', p_trait_id::text)
       else jsonb_build_object('xp_category', p_xp_category)
     end,
     p_note);

  -- Level-up achievements
  if v_leveled then
    insert into public.character_achievements
      (user_id, achievement_id, title, description, icon)
    values
      (p_user_id,
       'level_' || v_new_lvl,
       'Level ' || v_new_lvl,
       'Reached Level ' || v_new_lvl || ' — ' ||
       case v_new_lvl
         when 1 then 'Initiate'
         when 2 then 'Consistent Builder'
         when 3 then 'Courage Apprentice'
         when 4 then 'Clear Communicator'
         when 5 then 'Resilient Operator'
         when 6 then 'Calm Leader'
         when 7 then 'Disciplined Creator'
         when 8 then 'Trusted Professional'
         when 9 then 'Respected Guide'
         else 'Transcendent'
       end,
       'trophy')
    on conflict (user_id, achievement_id) do nothing;
  end if;

  return jsonb_build_object(
    'total_xp',         v_new_xp,
    'level',            v_new_lvl,
    'current_level_xp', v_lvl_xp,
    'did_level_up',     v_leveled,
    'awarded_xp',       p_amount
  );
end;
$$;

-- ============================================================
-- REWRITTEN: complete_character_habit
-- Daily cap, grace tokens, category-based XP, integrity bonus
-- ============================================================
create or replace function public.complete_character_habit(
  p_habit_id uuid,
  p_user_id  uuid,
  p_resisted_before boolean default false
) returns jsonb
language plpgsql security definer
as $$
declare
  v_habit      record;
  v_today      date;
  v_already    boolean;
  v_xp         integer;
  v_streak     integer;
  v_max_streak integer;
  v_category   text;
  v_cap_ok     boolean;
  v_bonus      integer := 0;
  v_result     jsonb;
begin
  v_today := current_date;

  select * into v_habit
  from public.character_habits
  where id = p_habit_id and user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Habit not found');
  end if;

  -- Anti-farming: already completed today?
  select exists(
    select 1 from public.character_activity_logs
    where user_id = p_user_id
      and event_type = 'habit_completed'
      and entity_id = p_habit_id::text
      and created_at::date = v_today
  ) into v_already;

  if v_already then
    return jsonb_build_object('error', 'Already completed today',
      'idempotent', true,
      'total_xp', 0, 'level', 1, 'did_level_up', false, 'awarded_xp', 0);
  end if;

  -- Anti-farming: daily cap
  v_cap_ok := public.check_daily_cap(p_user_id, 'habit', 'daily_habit_cap');
  if not v_cap_ok then
    return jsonb_build_object('error', 'Daily habit cap reached',
      'total_xp', 0, 'level', 1, 'did_level_up', false, 'awarded_xp', 0);
  end if;

  -- XP by difficulty
  if v_habit.difficulty <= 2 then
    v_xp := public.get_xp_config('habit_easy_xp');
  elsif v_habit.difficulty <= 4 then
    v_xp := public.get_xp_config('habit_medium_xp');
  else
    v_xp := public.get_xp_config('habit_hard_xp');
  end if;

  -- Streak calculation
  if v_habit.last_completed_date = v_today - 1 then
    v_streak := v_habit.current_streak + 1;
  elsif v_habit.last_completed_date >= v_today then
    v_streak := v_habit.current_streak;
  else
    v_streak := 1;
  end if;

  v_max_streak := greatest(v_habit.max_streak, v_streak);

  -- Streak XP bonus
  if v_streak >= 30 then
    v_xp := floor(v_xp * (1 + public.get_xp_config('streak_bonus_pct_30') / 100.0));
  elsif v_streak >= 14 then
    v_xp := floor(v_xp * (1 + public.get_xp_config('streak_bonus_pct_14') / 100.0));
  elsif v_streak >= 7 then
    v_xp := floor(v_xp * (1 + public.get_xp_config('streak_bonus_pct_7') / 100.0));
  end if;

  -- Determine XP category
  v_category := 'consistency';

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

  -- Award XP
  v_result := public.award_character_xp(
    p_user_id, v_xp, 'habit', p_habit_id::text,
    v_habit.linked_trait_id,
    format('Habit: %s', v_habit.title),
    v_category
  );

  -- Integrity bonus: completed despite logged resistance
  if p_resisted_before and v_habit.linked_trait_id is not null
     and public.can_award_integrity_bonus(p_user_id, v_habit.linked_trait_id)
  then
    v_bonus := public.get_xp_config('integrity_bonus_xp');
    if v_bonus > 0 then
      v_result := public.award_character_xp(
        p_user_id, v_bonus, 'habit', p_habit_id::text,
        v_habit.linked_trait_id,
        format('Integrity bonus: %s', v_habit.title),
        'integrity'
      );
    end if;
  end if;

  return jsonb_build_object(
    'xp_awarded', v_xp + v_bonus,
    'streak', v_streak,
    'max_streak', v_max_streak,
    'integrity_bonus', v_bonus
  ) || v_result;
end;
$$;

-- ============================================================
-- REWRITTEN: complete_character_quest
-- Scaled XP, proof validation, category routing, trivial-farming prevention
-- ============================================================
create or replace function public.complete_character_quest(
  p_quest_id uuid,
  p_user_id  uuid
) returns jsonb
language plpgsql security definer
as $$
declare
  v_quest        record;
  v_already      boolean;
  v_any_trait    uuid;
  v_xp           integer;
  v_category     text;
  v_cap_ok       boolean;
  v_prev_count   integer;
  v_trivial_cap  integer;
  v_trivial_xp   integer;
  v_result       jsonb;
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

  -- Anti-farming: proof-required quests must have proof
  if v_quest.required_proof != '' and v_quest.required_proof is not null then
    -- Proof should be submitted before calling this function
    -- If no proof text exists, reject
    return jsonb_build_object('error', 'Proof required before completion');
  end if;

  -- Anti-farming: daily cap
  v_cap_ok := public.check_daily_cap(p_user_id, 'quest', 'daily_quest_cap');
  if not v_cap_ok then
    return jsonb_build_object('error', 'Daily quest cap reached');
  end if;

  -- Anti-farming: trivial quest detection
  v_trivial_xp := public.get_xp_config('trivial_quest_xp_threshold');
  v_trivial_cap := public.get_xp_config('trivial_quest_cap');

  if v_quest.reward_xp < v_trivial_xp and v_trivial_xp > 0 then
    select count(*) into v_prev_count
    from public.character_activity_logs
    where user_id = p_user_id
      and entity_type = 'quest'
      and created_at::date = current_date;

    if v_prev_count >= v_trivial_cap then
      return jsonb_build_object('error', 'Trivial quest cap reached', 'trivial_capped', true);
    end if;
  end if;

  -- XP scaling by quest type
  v_xp := v_quest.reward_xp;
  v_category := case v_quest.quest_type
    when 'exposure' then 'courage'
    when 'boss_fight' then 'courage'
    when 'reflection' then 'integrity'
    else 'general'
  end;

  -- Pick first linked trait
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
    (p_user_id, 'quest_completed', 'quest', p_quest_id::text, v_xp,
     format('Completed quest "%s"', v_quest.title));

  v_result := public.award_character_xp(
    p_user_id, v_xp, 'quest', p_quest_id::text,
    v_any_trait,
    format('Quest: %s', v_quest.title),
    v_category
  );

  return jsonb_build_object(
    'quest_id', p_quest_id::text,
    'xp_awarded', v_xp
  ) || v_result;
end;
$$;

-- ============================================================
-- REWRITTEN: resist_character_bad_guy
-- Category XP, linked trait routing
-- ============================================================
create or replace function public.resist_character_bad_guy(
  p_bad_guy_id uuid,
  p_user_id    uuid
) returns jsonb
language plpgsql security definer
as $$
declare
  v_bad_guy     record;
  v_linked_trait uuid;
  v_xp          integer;
  v_result      jsonb;
begin
  select * into v_bad_guy
  from public.character_bad_guys
  where id = p_bad_guy_id and user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Bad guy not found');
  end if;

  select linked_trait_id into v_linked_trait
  from public.character_if_then_rules
  where id = v_bad_guy.linked_rule_id;

  v_xp := public.get_xp_config('bad_guy_resist_xp');

  update public.character_bad_guys
  set occurrence_count = occurrence_count + 1,
      defeated_count = defeated_count + 1,
      last_occurrence_at = now(),
      updated_at = now()
  where id = p_bad_guy_id;

  insert into public.character_activity_logs
    (user_id, event_type, entity_type, entity_id, xp_delta, note)
  values
    (p_user_id, 'bad_guy_resisted', 'bad_guy', p_bad_guy_id::text, v_xp,
     format('Resisted "%s"', v_bad_guy.title));

  v_result := public.award_character_xp(
    p_user_id, v_xp, 'bad_guy', p_bad_guy_id::text,
    v_linked_trait,
    format('Resisted bad guy: %s', v_bad_guy.title),
    'discipline'
  );

  return jsonb_build_object('bad_guy', p_bad_guy_id::text, 'resisted', true) || v_result;
end;
$$;

-- ============================================================
-- REWRITTEN: complete_character_contract
-- ============================================================
create or replace function public.complete_character_contract(
  p_contract_id uuid,
  p_user_id     uuid
) returns jsonb
language plpgsql security definer
as $$
declare
  v_contract record;
  v_xp       integer;
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

  v_xp := public.get_xp_config('contract_complete_xp');

  update public.character_contracts
  set completion_status = 'completed',
      is_active = false,
      completed_at = now(),
      updated_at = now()
  where id = p_contract_id;

  insert into public.character_activity_logs
    (user_id, event_type, entity_type, entity_id, xp_delta, note)
  values
    (p_user_id, 'contract_completed', 'contract', p_contract_id::text, v_xp,
     format('Completed contract "%s"', v_contract.title));

  v_result := public.award_character_xp(
    p_user_id, v_xp, 'contract', p_contract_id::text,
    null,
    format('Contract: %s', v_contract.title),
    'integrity'
  );

  return jsonb_build_object('contract', p_contract_id::text, 'completed', true) || v_result;
end;
$$;

-- ============================================================
-- REWRITTEN: use_character_power_up
-- ============================================================
create or replace function public.use_character_power_up(
  p_power_up_id uuid,
  p_user_id     uuid
) returns jsonb
language plpgsql security definer
as $$
declare
  v_power_up record;
  v_xp       integer;
  v_result   jsonb;
begin
  select * into v_power_up
  from public.character_power_ups
  where id = p_power_up_id and user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Power-up not found');
  end if;

  v_xp := public.get_xp_config('power_up_use_xp');

  update public.character_power_ups
  set usage_count = usage_count + 1,
      updated_at = now()
  where id = p_power_up_id;

  insert into public.character_activity_logs
    (user_id, event_type, entity_type, entity_id, xp_delta, note)
  values
    (p_user_id, 'power_up_used', 'power_up', p_power_up_id::text, v_xp,
     format('Used power-up "%s"', v_power_up.title));

  v_result := public.award_character_xp(
    p_user_id, v_xp, 'power_up', p_power_up_id::text,
    null,
    format('Power-up: %s', v_power_up.title),
    'recovery'
  );

  return jsonb_build_object('power_up', p_power_up_id::text, 'used', true) || v_result;
end;
$$;

-- ============================================================
-- NEW FUNCTION: complete_exposure_step
-- Advances step, awards Courage XP, logs reflection requirement
-- ============================================================
create or replace function public.complete_exposure_step(
  p_step_id        uuid,
  p_user_id        uuid,
  p_self_discomfort integer default null,
  p_reflection_text text default null
) returns jsonb
language plpgsql security definer
as $$
declare
  v_step      record;
  v_ladder    record;
  v_xp        integer;
  v_new_reps  integer;
  v_advance   boolean := false;
  v_result    jsonb;
begin
  select * into v_step
  from public.character_exposure_steps
  where id = p_step_id;

  if not found then
    return jsonb_build_object('error', 'Step not found');
  end if;

  select * into v_ladder
  from public.character_exposure_ladders
  where id = v_step.ladder_id and user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Ladder not found for this user');
  end if;

  -- Check step is in a completable state
  if v_step.status = 'completed' then
    return jsonb_build_object('error', 'Step already completed', 'idempotent', true);
  end if;

  -- Mark as in_progress if locked
  if v_step.status = 'locked' then
    update public.character_exposure_steps
    set status = 'in_progress',
        successful_repetitions = 1,
        updated_at = now()
    where id = p_step_id;

    v_new_reps := 1;
  else
    v_new_reps := v_step.successful_repetitions + 1;
    update public.character_exposure_steps
    set successful_repetitions = v_new_reps,
        updated_at = now()
    where id = p_step_id;
  end if;

  -- Check if step is complete
  if v_new_reps >= v_step.repetition_target then
    -- If reflection is required, validate it
    if v_step.reflection_required and (p_reflection_text is null or length(p_reflection_text) < 30) then
      return jsonb_build_object('error', 'Reflection required (min 30 chars)',
        'step_id', p_step_id::text, 'successful_repetitions', v_new_reps);
    end if;

    update public.character_exposure_steps
    set status = 'completed',
        updated_at = now()
    where id = p_step_id;

    -- Advance ladder current_step
    update public.character_exposure_ladders
    set current_step = v_step.step_order,
        completion_percentage = round(
          (select count(*) from public.character_exposure_steps
           where ladder_id = v_ladder.id and status = 'completed')::numeric /
          nullif((select count(*) from public.character_exposure_steps
                  where ladder_id = v_ladder.id), 0) * 100
        ),
        status = case when (select bool_and(status = 'completed')
                            from public.character_exposure_steps
                            where ladder_id = v_ladder.id)
                  then 'completed' else v_ladder.status end,
        updated_at = now()
    where id = v_ladder.id;

    v_advance := true;
    v_xp := public.get_xp_config('exposure_step_base_xp') + v_step.difficulty * 5;

    -- Log
    insert into public.character_activity_logs
      (user_id, event_type, entity_type, entity_id, xp_delta, note)
    values
      (p_user_id, 'exposure_step_completed', 'exposure_step', p_step_id::text, v_xp,
       format('Completed step "%s" on ladder "%s"', v_step.title, v_ladder.title));

    -- Award XP
    v_result := public.award_character_xp(
      p_user_id, v_xp, 'exposure_step', p_step_id::text,
      v_ladder.linked_trait_id,
      format('Exposure step: %s — %s', v_ladder.title, v_step.title),
      'courage'
    );

    -- Unlock next step
    update public.character_exposure_steps
    set status = 'available'
    where ladder_id = v_ladder.id
      and step_order = v_step.step_order + 1
      and status = 'locked';
  else
    v_xp := floor(public.get_xp_config('exposure_step_base_xp') / 2);
    v_result := public.award_character_xp(
      p_user_id, v_xp, 'exposure_step_attempt', p_step_id::text,
      v_ladder.linked_trait_id,
      format('Exposure step attempt: %s — %s (rep %s/%s)',
        v_ladder.title, v_step.title, v_new_reps, v_step.repetition_target),
      'courage'
    );
  end if;

  return jsonb_build_object(
    'step_id', p_step_id::text,
    'successful_repetitions', v_new_reps,
    'repetition_target', v_step.repetition_target,
    'advanced', v_advance,
    'xp_awarded', v_xp
  ) || coalesce(v_result, jsonb_build_object());
end;
$$;

-- ============================================================
-- NEW FUNCTION: submit_reflection
-- Validates minimum content, awards Integrity XP, prevents reuse
-- ============================================================
create or replace function public.submit_character_reflection(
  p_user_id    uuid,
  p_content    text,
  p_entity_type text default null,
  p_entity_id   text default null
) returns jsonb
language plpgsql security definer
as $$
declare
  v_min_chars  integer;
  v_xp         integer;
  v_similar    boolean;
  v_result     jsonb;
begin
  -- Anti-farming: minimum content length
  v_min_chars := public.get_xp_config('reflection_min_chars');
  if length(coalesce(p_content, '')) < v_min_chars then
    return jsonb_build_object('error', format('Reflection too short (min %s chars)', v_min_chars));
  end if;

  -- Anti-farming: reject near-duplicate reflections
  select exists(
    select 1 from public.character_reflections
    where user_id = p_user_id
      and what_learned = p_content
      and created_at > now() - interval '24 hours'
  ) into v_similar;

  if v_similar then
    return jsonb_build_object('error', 'Duplicate reflection rejected',
      'duplicate', true);
  end if;

  v_xp := public.get_xp_config('reflection_xp');

  insert into public.character_reflections
    (user_id, pre_action_fear, post_action_result, what_happened, what_learned,
     emotional_intensity_before, emotional_intensity_after, next_step,
     privacy_setting, ai_summary_status, linked_entity_type, linked_entity_id)
  values
    (p_user_id, '', '', '', p_content,
     0, 0, '', 'private', 'pending', p_entity_type, p_entity_id);

  insert into public.character_activity_logs
    (user_id, event_type, entity_type, entity_id, xp_delta, note)
  values
    (p_user_id, 'reflection_submitted', p_entity_type, p_entity_id, v_xp,
     'Submitted a reflection');

  v_result := public.award_character_xp(
    p_user_id, v_xp, 'reflection', null, null,
    'Reflection submitted',
    'integrity'
  );

  return jsonb_build_object('xp_awarded', v_xp) || v_result;
end;
$$;

-- ============================================================
-- NEW FUNCTION: toggle_recovery_mode
-- Anti-farming: cooldown, minimum actions requirement
-- ============================================================
create or replace function public.set_character_recovery_mode(
  p_user_id uuid,
  p_enabled boolean
) returns jsonb
language plpgsql security definer
as $$
declare
  v_profile record;
  v_recent_completions integer;
  v_cooldown_hours integer;
  v_prev_toggle timestamptz;
begin
  select * into v_profile
  from public.character_profiles
  where user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Profile not found');
  end if;

  if p_enabled and not v_profile.recovery_mode then
    -- Anti-farming: check cooldown
    v_cooldown_hours := public.get_xp_config('recovery_cooldown_hours');
    if v_cooldown_hours > 0 then
      select max(created_at) into v_prev_toggle
      from public.character_activity_logs
      where user_id = p_user_id
        and event_type = 'recovery_mode_toggled'
        and note = 'enabled';

      if v_prev_toggle is not null and
         extract(epoch from (now() - v_prev_toggle)) / 3600 < v_cooldown_hours
      then
        return jsonb_build_object('error',
          'Recovery mode can only be toggled once every ' || v_cooldown_hours || ' hours',
          'cooldown_active', true);
      end if;
    end if;

    -- Anti-farming: must have some recent completions to be eligible
    select count(*) into v_recent_completions
    from public.character_activity_logs
    where user_id = p_user_id
      and created_at > now() - interval '7 days'
      and event_type in ('habit_completed', 'quest_completed', 'bad_guy_resisted');

    if v_recent_completions = 0 then
      return jsonb_build_object('error',
        'Recovery mode requires recent activity. Complete at least one action first.',
        'no_activity', true);
    end if;
  end if;

  update public.character_profiles
  set recovery_mode = p_enabled,
      updated_at = now()
  where id = v_profile.id;

  insert into public.character_activity_logs
    (user_id, event_type, entity_type, xp_delta, note)
  values
    (p_user_id, 'recovery_mode_toggled', 'profile', 0,
     case when p_enabled then 'enabled' else 'disabled' end);

  return jsonb_build_object('recovery_mode', p_enabled, 'success', true);
end;
$$;

-- ============================================================
-- NEW FUNCTION: check_character_achievements
-- Scans state and unlocks eligible achievements
-- ============================================================
create or replace function public.check_character_achievements(
  p_user_id uuid
) returns jsonb
language plpgsql security definer
as $$
declare
  v_new_achievements jsonb := '[]'::jsonb;
  v_trait_count     integer;
  v_habit_count     integer;
  v_streak_7        boolean;
  v_quest_courage   boolean;
  v_quest_exposure  boolean;
  v_bad_guy_resists integer;
  v_ladder_count    integer;
  v_season_count    integer;
  v_contract_count  integer;
  v_reflection_count integer;
  v_recovery_count  integer;
  v_profile         record;
  v_exists          boolean;
begin
  select * into v_profile
  from public.character_profiles
  where user_id = p_user_id;

  -- Traits unlocked
  select count(*) into v_trait_count
  from public.character_traits
  where user_id = p_user_id;

  if v_trait_count >= 14 then
    select exists(
      select 1 from public.character_achievements
      where user_id = p_user_id and achievement_id = 'all_traits'
    ) into v_exists;
    if not v_exists then
      insert into public.character_achievements
        (user_id, achievement_id, title, description, icon)
      values
        (p_user_id, 'all_traits', 'Full Trait Spectrum',
         'Unlocked all 14 character traits', 'layers');
      v_new_achievements := v_new_achievements || jsonb_build_object('id', 'all_traits');
    end if;
  end if;

  -- 7-day streak on any habit
  select exists(
    select 1 from public.character_habits
    where user_id = p_user_id and current_streak >= 7
  ) into v_streak_7;

  if v_streak_7 then
    select exists(
      select 1 from public.character_achievements
      where user_id = p_user_id and achievement_id = 'streak_7'
    ) into v_exists;
    if not v_exists then
      insert into public.character_achievements
        (user_id, achievement_id, title, description, icon)
      values
        (p_user_id, 'streak_7', 'Seven Days of Consistency',
         'Maintained a 7-day streak on any habit', 'flame');
      v_new_achievements := v_new_achievements || jsonb_build_object('id', 'streak_7');
    end if;
  end if;

  -- First courage quest
  select exists(
    select 1 from public.character_quests
    where user_id = p_user_id
      and quest_type in ('exposure', 'courage')
      and status = 'completed'
  ) into v_quest_courage;

  if v_quest_courage then
    select exists(
      select 1 from public.character_achievements
      where user_id = p_user_id and achievement_id = 'first_courage_quest'
    ) into v_exists;
    if not v_exists then
      insert into public.character_achievements
        (user_id, achievement_id, title, description, icon)
      values
        (p_user_id, 'first_courage_quest', 'First Courage Quest',
         'Completed your first courage or exposure quest', 'target');
      v_new_achievements := v_new_achievements || jsonb_build_object('id', 'first_courage_quest');
    end if;
  end if;

  -- First exposure quest
  select exists(
    select 1 from public.character_quests
    where user_id = p_user_id and quest_type = 'exposure' and status = 'completed'
  ) into v_quest_exposure;

  if v_quest_exposure then
    select exists(
      select 1 from public.character_achievements
      where user_id = p_user_id and achievement_id = 'first_exposure_quest'
    ) into v_exists;
    if not v_exists then
      insert into public.character_achievements
        (user_id, achievement_id, title, description, icon)
      values
        (p_user_id, 'first_exposure_quest', 'First Exposure Quest',
         'Started the exposure ladder journey', 'eye');
      v_new_achievements := v_new_achievements || jsonb_build_object('id', 'first_exposure_quest');
    end if;
  end if;

  -- Bad guy resists
  select coalesce(sum(defeated_count), 0) into v_bad_guy_resists
  from public.character_bad_guys
  where user_id = p_user_id;

  if v_bad_guy_resists >= 5 then
    select exists(
      select 1 from public.character_achievements
      where user_id = p_user_id and achievement_id = 'five_resists'
    ) into v_exists;
    if not v_exists then
      insert into public.character_achievements
        (user_id, achievement_id, title, description, icon)
      values
        (p_user_id, 'five_resists', 'Five Rejections Handled',
         'Resisted bad guy patterns 5 times', 'shield');
      v_new_achievements := v_new_achievements || jsonb_build_object('id', 'five_resists');
    end if;
  end if;

  -- Completed exposure ladder
  select count(*) into v_ladder_count
  from public.character_exposure_ladders
  where user_id = p_user_id and status = 'completed';

  if v_ladder_count >= 1 then
    select exists(
      select 1 from public.character_achievements
      where user_id = p_user_id and achievement_id = 'completed_ladder'
    ) into v_exists;
    if not v_exists then
      insert into public.character_achievements
        (user_id, achievement_id, title, description, icon)
      values
        (p_user_id, 'completed_ladder', 'Exposure Ladder Master',
         'Completed an entire exposure ladder', 'stairs');
      v_new_achievements := v_new_achievements || jsonb_build_object('id', 'completed_ladder');
    end if;
  end if;

  -- Completed season
  select count(*) into v_season_count
  from public.character_seasons
  where user_id = p_user_id and status = 'completed';

  if v_season_count >= 1 then
    select exists(
      select 1 from public.character_achievements
      where user_id = p_user_id and achievement_id = 'completed_season'
    ) into v_exists;
    if not v_exists then
      insert into public.character_achievements
        (user_id, achievement_id, title, description, icon)
      values
        (p_user_id, 'completed_season', 'Character Season Completed',
         'Finished a full character season', 'calendar');
      v_new_achievements := v_new_achievements || jsonb_build_object('id', 'completed_season');
    end if;
  end if;

  -- Completed contract
  select count(*) into v_contract_count
  from public.character_contracts
  where user_id = p_user_id and completion_status = 'completed';

  if v_contract_count >= 1 then
    select exists(
      select 1 from public.character_achievements
      where user_id = p_user_id and achievement_id = 'first_contract'
    ) into v_exists;
    if not v_exists then
      insert into public.character_achievements
        (user_id, achievement_id, title, description, icon)
      values
        (p_user_id, 'first_contract', 'First Accountability Contract',
         'Fulfilled your first accountability contract', 'file-check');
      v_new_achievements := v_new_achievements || jsonb_build_object('id', 'first_contract');
    end if;
  end if;

  -- Reflections submitted
  select count(*) into v_reflection_count
  from public.character_reflections
  where user_id = p_user_id;

  if v_reflection_count >= 5 then
    select exists(
      select 1 from public.character_achievements
      where user_id = p_user_id and achievement_id = 'five_reflections'
    ) into v_exists;
    if not v_exists then
      insert into public.character_achievements
        (user_id, achievement_id, title, description, icon)
      values
        (p_user_id, 'five_reflections', 'Reflective Practitioner',
         'Submitted 5 meaningful reflections', 'book-open');
      v_new_achievements := v_new_achievements || jsonb_build_object('id', 'five_reflections');
    end if;
  end if;

  -- Recovery mode used (return after lapse)
  select count(*) into v_recovery_count
  from public.character_activity_logs
  where user_id = p_user_id
    and event_type = 'recovery_mode_toggled'
    and note = 'enabled';

  if v_recovery_count >= 1 then
    select exists(
      select 1 from public.character_achievements
      where user_id = p_user_id and achievement_id = 'returned_from_lapse'
    ) into v_exists;
    if not v_exists then
      insert into public.character_achievements
        (user_id, achievement_id, title, description, icon)
      values
        (p_user_id, 'returned_from_lapse', 'Returned After a Bad Week',
         'Used recovery mode to get back on track', 'rotate-ccw');
      v_new_achievements := v_new_achievements || jsonb_build_object('id', 'returned_from_lapse');
    end if;
  end if;

  return jsonb_build_object(
    'new_achievements', v_new_achievements
  );
end;
$$;

-- ============================================================
-- NEW FUNCTION: get_adaptive_recommendations
-- Analyzes recent behavior and returns suggestions
-- ============================================================
create or replace function public.get_character_adaptive_recommendations(
  p_user_id uuid
) returns jsonb
language plpgsql security definer
as $$
declare
  v_profile             record;
  v_total_completed     integer;
  v_total_attempted     integer;
  v_completion_rate     numeric;
  v_avoided_count       integer;
  v_suggestions         jsonb := '[]'::jsonb;
  v_avg_discomfort      numeric;
  v_recent_traits       integer;
begin
  select * into v_profile
  from public.character_profiles
  where user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Profile not found');
  end if;

  -- Past 14 day completion rate
  select
    count(*) filter (where event_type like '%_completed' or event_type like '%_resisted' or event_type = 'if_then_followed') as completed,
    count(*) filter (where event_type like '%_completed' or event_type like '%_resisted' or event_type = 'if_then_followed' or event_type like '%_triggered' or event_type = 'if_then_missed') as attempted
  into v_total_completed, v_total_attempted
  from public.character_activity_logs
  where user_id = p_user_id
    and created_at > now() - interval '14 days';

  v_completion_rate := case when v_total_attempted > 0
    then round(v_total_completed::numeric / v_total_attempted * 100)
    else 0
  end;

  -- Avoided actions count
  select count(*) into v_avoided_count
  from public.character_activity_logs
  where user_id = p_user_id
    and event_type = 'if_then_missed'
    and created_at > now() - interval '14 days';

  -- Difficulty suggestions
  if v_completion_rate >= 80 and v_total_attempted >= 10 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'type', 'difficulty_increase',
      'reason', 'Your completion rate is ' || v_completion_rate || '%. Consider increasing difficulty slightly.',
      'action', 'Add harder habits or increase quest difficulty by 1 step',
      'priority', 'low'
    );
  elsif v_completion_rate <= 40 and v_total_attempted >= 5 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'type', 'difficulty_decrease',
      'reason', 'Your completion rate is ' || v_completion_rate || '%. Consider reducing scope or friction.',
      'action', 'Break down quests into smaller steps or reduce habit difficulty',
      'priority', 'medium'
    );
  end if;

  -- Avoidance pattern
  if v_avoided_count >= 5 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'type', 'avoidance_pattern',
      'reason', 'You have avoided ' || v_avoided_count || ' actions recently. Try smaller versions.',
      'action', 'Use the "smaller version" option or set up stronger accountability',
      'priority', 'high'
    );
  end if;

  -- Low recent activity
  if v_total_attempted = 0 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'type', 'restart',
      'reason', 'No character activity in 14 days. Consider recovery mode or a single small habit.',
      'action', 'Start with one easy habit or enable recovery mode',
      'priority', 'high'
    );
  end if;

  -- Level milestone
  if v_profile.current_level < 3 and v_total_attempted >= 10 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'type', 'level_progress',
      'reason', 'You are building momentum. A few more completions will unlock Level ' || (v_profile.current_level + 1),
      'action', 'Focus on consistency over difficulty',
      'priority', 'low'
    );
  end if;

  return jsonb_build_object(
    'completion_rate', v_completion_rate,
    'total_attempted', v_total_attempted,
    'total_completed', v_total_completed,
    'avoided_count', v_avoided_count,
    'suggestions', v_suggestions
  );
end;
$$;

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists xp_ledger_category_idx
  on public.xp_ledger (user_id, xp_category, created_at desc);

create index if not exists character_achievements_lookup
  on public.character_achievements (user_id, achievement_id);

create index if not exists activity_logs_daily_cap_idx
  on public.character_activity_logs (user_id, entity_type, (created_at::date));

-- ============================================================
-- RLS (idempotent — safe to re-run)
-- ============================================================
do $$
declare
  r record;
begin
  for r in select tablename from pg_tables
    where schemaname = 'public'
      and tablename in ('xp_ledger', 'character_achievements')
  loop
    execute format(
      'alter table public.%I enable row level security;', r.tablename
    );
    execute format(
      'drop policy if exists user_access on public.%I;', r.tablename
    );
    execute format(
      'create policy user_access on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      r.tablename
    );
  end loop;
end;
$$;
