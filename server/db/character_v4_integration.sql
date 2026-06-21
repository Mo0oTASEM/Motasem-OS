-- Nova OS — Character Development System (v4 Integration Migration)
-- Idempotent schema modifications for habit log reversals and connection constraints.
-- ==================================================================================================

-- 1. Create public.xp_ledger table if it doesn't exist, or alter it if it does
CREATE TABLE IF NOT EXISTS public.xp_ledger (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  amount         integer not null,
  balance_before integer not null,
  balance_after  integer not null,
  xp_category    text not null default 'general',
  entity_type    text,
  entity_id      text,
  reason         text,
  created_at     timestamptz not null default now()
);

ALTER TABLE public.xp_ledger DROP CONSTRAINT IF EXISTS xp_ledger_amount_check;
ALTER TABLE public.xp_ledger ADD CONSTRAINT xp_ledger_amount_check CHECK (amount <> 0);

CREATE INDEX IF NOT EXISTS xp_ledger_user_idx ON public.xp_ledger (user_id, created_at desc);

-- 1b. Recreate public.write_xp_ledger function
CREATE OR REPLACE FUNCTION public.write_xp_ledger(
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

-- 2. Add unique constraint on character_connections to prevent duplicate links
ALTER TABLE public.character_connections DROP CONSTRAINT IF EXISTS character_connections_unique_link;
ALTER TABLE public.character_connections ADD CONSTRAINT character_connections_unique_link UNIQUE (source_entity_id, target_entity_type, target_entity_id);

-- 3. Create public.undo_character_habit_log function
CREATE OR REPLACE FUNCTION public.undo_character_habit_log(
  p_log_id uuid,
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_log record;
  v_habit record;
  v_profile record;
  v_new_xp integer;
  v_new_lvl integer;
  v_lvl_xp integer;
  v_streak integer := 0;
  v_expected_date date;
  v_r record;
  v_max_completed_date date;
BEGIN
  -- Get the log
  select * into v_log
  from public.character_habit_logs
  where id = p_log_id and user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Log not found');
  end if;

  -- Get habit
  select * into v_habit
  from public.character_habits
  where id = v_log.habit_id and user_id = p_user_id;

  -- Delete the log
  delete from public.character_habit_logs
  where id = p_log_id and user_id = p_user_id;

  -- If status was completed and there was XP awarded, reverse XP
  if v_log.status = 'completed' then
    if v_log.xp_awarded > 0 then
      select * into v_profile
      from public.character_profiles
      where user_id = p_user_id;

      if found then
        v_new_xp := greatest(0, v_profile.total_xp - v_log.xp_awarded);
        v_new_lvl := public.level_from_xp(v_new_xp);
        v_lvl_xp := public.current_level_xp_offset(v_new_xp, v_new_lvl);

        update public.character_profiles
        set total_xp = v_new_xp,
            current_level = v_new_lvl,
            current_level_xp = v_lvl_xp,
            updated_at = now()
        where id = v_profile.id;

        -- Immutable ledger entry (negative to show deduction)
        perform public.write_xp_ledger(
          p_user_id, -v_log.xp_awarded, v_profile.total_xp,
          'habit_reversal', 'habit', v_log.habit_id::text,
          format('Reversion of log on %s', v_log.logged_date)
        );

        -- Reverse XP from linked trait if applicable
        if v_habit.linked_trait_id is not null then
          update public.character_traits
          set lifetime_xp = greatest(0, lifetime_xp - v_log.xp_awarded),
              current_score = least(100,
                floor(greatest(0, lifetime_xp - v_log.xp_awarded) / 20.0)::integer + 1
              ),
              current_rank = floor(greatest(0, lifetime_xp - v_log.xp_awarded) / 100.0)::integer + 1,
              updated_at = now()
          where id = v_habit.linked_trait_id and user_id = p_user_id;
        end if;
      end if;
    end if;

    -- Recalculate streak
    -- Walk backward from today/yesterday to rebuild streak
    for v_r in
      select logged_date from public.character_habit_logs
      where habit_id = v_log.habit_id and status = 'completed'
      order by logged_date desc
    loop
      if v_expected_date is null then
        if v_r.logged_date = current_date or v_r.logged_date = current_date - 1 then
          v_streak := 1;
          v_expected_date := v_r.logged_date - 1;
          v_max_completed_date := v_r.logged_date;
        else
          exit; -- streak broken
        end if;
      elsif v_r.logged_date = v_expected_date then
        v_streak := v_streak + 1;
        v_expected_date := v_r.logged_date - 1;
      else
        exit; -- streak broken
      end if;
    end loop;

    -- If no logs left, set max completed date to null/max of remaining
    if v_max_completed_date is null then
      select max(logged_date) into v_max_completed_date
      from public.character_habit_logs
      where habit_id = v_log.habit_id and status = 'completed';
    end if;

    update public.character_habits
    set current_streak = v_streak,
        last_completed_date = v_max_completed_date,
        updated_at = now()
    where id = v_log.habit_id;

    -- Log activity
    insert into public.character_activity_logs
      (user_id, event_type, entity_type, entity_id, xp_delta, note)
    values
      (p_user_id, 'habit_log_reversed', 'habit', v_log.habit_id::text, -v_log.xp_awarded,
       format('Reverted habit log for date %s (deducted %s XP, streak is now %s)', v_log.logged_date, v_log.xp_awarded, v_streak));
  end if;

  return jsonb_build_object(
    'success', true,
    'xp_deducted', v_log.xp_awarded,
    'new_streak', v_streak
  );
END;
$$;
