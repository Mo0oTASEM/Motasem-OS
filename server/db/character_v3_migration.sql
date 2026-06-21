-- Nova OS — Character Development System (v3 Migration)
-- Idempotent schema modifications for Profiles, Habits, Goals, Challenges, Identity Rules, and Connections.
-- ==================================================================================================

-- 1. Update public.character_profiles table
ALTER TABLE public.character_profiles ADD COLUMN IF NOT EXISTS current_score INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.character_profiles ADD COLUMN IF NOT EXISTS selected_focus_areas TEXT[] DEFAULT '{}'::TEXT[] NOT NULL;
ALTER TABLE public.character_profiles ADD COLUMN IF NOT EXISTS active_development_phase TEXT DEFAULT 'initial' NOT NULL;
ALTER TABLE public.character_profiles ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT '{}'::JSONB NOT NULL;

-- 2. Update public.character_habits table
ALTER TABLE public.character_habits ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '' NOT NULL;
ALTER TABLE public.character_habits ADD COLUMN IF NOT EXISTS selected_weekdays INTEGER[] DEFAULT NULL;
ALTER TABLE public.character_habits ADD COLUMN IF NOT EXISTS target_value NUMERIC DEFAULT 1 NOT NULL;
ALTER TABLE public.character_habits ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '' NOT NULL;
ALTER TABLE public.character_habits ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' NOT NULL;
ALTER TABLE public.character_habits ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' NOT NULL;
ALTER TABLE public.character_habits ADD COLUMN IF NOT EXISTS reminder_settings JSONB DEFAULT '{}'::JSONB NOT NULL;
ALTER TABLE public.character_habits ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '' NOT NULL;
ALTER TABLE public.character_habits ADD COLUMN IF NOT EXISTS archive_status BOOLEAN DEFAULT FALSE NOT NULL;

-- 3. Drop and Recreate character_habit_logs (empty v1 table with TEXT habit_id, recreate with UUID and v2 fields)
DROP TABLE IF EXISTS public.character_habit_logs CASCADE;

CREATE TABLE public.character_habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES public.character_habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'skipped')),
    completed_value NUMERIC DEFAULT 0 NOT NULL,
    note TEXT DEFAULT '' NOT NULL,
    xp_awarded INTEGER DEFAULT 0 NOT NULL,
    source TEXT DEFAULT 'user' NOT NULL, -- 'user', 'planner', 'system'
    linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (habit_id, logged_date)
);

CREATE INDEX IF NOT EXISTS character_habit_logs_user_date_idx ON public.character_habit_logs(user_id, logged_date DESC);

-- 4. Create public.character_goals table
CREATE TABLE IF NOT EXISTS public.character_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    category TEXT DEFAULT '' NOT NULL,
    target_outcome TEXT DEFAULT '' NOT NULL,
    measurable_success_criteria TEXT DEFAULT '' NOT NULL,
    priority TEXT DEFAULT 'medium' NOT NULL, -- 'low', 'medium', 'high', 'critical'
    status TEXT DEFAULT 'active' NOT NULL, -- 'active', 'completed', 'archived'
    start_date DATE,
    target_date DATE,
    progress_percentage NUMERIC DEFAULT 0 NOT NULL,
    linked_monthly_goal_id UUID REFERENCES public.monthly_outcomes(id) ON DELETE SET NULL,
    linked_weekly_goal_id UUID REFERENCES public.weekly_objectives(id) ON DELETE SET NULL,
    parent_goal_id UUID REFERENCES public.character_goals(id) ON DELETE SET NULL,
    xp_reward INTEGER DEFAULT 50 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS character_goals_user_idx ON public.character_goals(user_id);

-- 5. Create public.character_challenges table
CREATE TABLE IF NOT EXISTS public.character_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    difficulty TEXT DEFAULT 'medium' NOT NULL, -- 'easy', 'medium', 'hard', 'epic'
    category TEXT DEFAULT '' NOT NULL,
    challenge_type TEXT DEFAULT 'standard' NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL, -- 'active', 'completed', 'failed', 'archived'
    target NUMERIC DEFAULT 1 NOT NULL,
    progress NUMERIC DEFAULT 0 NOT NULL,
    start_date DATE,
    deadline DATE,
    xp_reward INTEGER DEFAULT 100 NOT NULL,
    linked_daily_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    linked_weekly_goal_id UUID REFERENCES public.weekly_objectives(id) ON DELETE SET NULL,
    linked_monthly_goal_id UUID REFERENCES public.monthly_outcomes(id) ON DELETE SET NULL,
    ai_generated BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS character_challenges_user_idx ON public.character_challenges(user_id);

-- 6. Create public.character_identity_rules table
CREATE TABLE IF NOT EXISTS public.character_identity_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    rule_statement TEXT NOT NULL,
    category TEXT DEFAULT '' NOT NULL,
    priority TEXT DEFAULT 'medium' NOT NULL, -- 'low', 'medium', 'high'
    active_status BOOLEAN DEFAULT TRUE NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS character_identity_rules_user_idx ON public.character_identity_rules(user_id);

-- 7. Create public.character_connections table
CREATE TABLE IF NOT EXISTS public.character_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_entity_type TEXT NOT NULL, -- 'habit', 'goal', 'challenge', 'quest', 'rule'
    source_entity_id UUID NOT NULL,
    target_entity_type TEXT NOT NULL, -- 'brain_note', 'second_brain_resource', 'daily_task', 'weekly_goal', 'monthly_goal', 'project'
    target_entity_id TEXT NOT NULL, -- Text because notes table id is bigint
    relationship_type TEXT DEFAULT 'relates_to' NOT NULL, -- 'supports', 'requires', 'prevents', 'mitigates'
    metadata JSONB DEFAULT '{}'::JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS character_connections_user_src_idx ON public.character_connections(user_id, source_entity_id);
CREATE INDEX IF NOT EXISTS character_connections_target_idx ON public.character_connections(target_entity_type, target_entity_id);

-- 8. Enable Row-Level Security
ALTER TABLE public.character_habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_identity_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_connections ENABLE ROW LEVEL SECURITY;

-- 9. Recreate user_access RLS policies
DROP POLICY IF EXISTS user_access ON public.character_habit_logs;
CREATE POLICY user_access ON public.character_habit_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_access ON public.character_goals;
CREATE POLICY user_access ON public.character_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_access ON public.character_challenges;
CREATE POLICY user_access ON public.character_challenges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_access ON public.character_identity_rules;
CREATE POLICY user_access ON public.character_identity_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_access ON public.character_connections;
CREATE POLICY user_access ON public.character_connections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. Add auto-update triggers for updated_at
DROP TRIGGER IF EXISTS trg_character_habit_logs_updated_at ON public.character_habit_logs;
CREATE TRIGGER trg_character_habit_logs_updated_at BEFORE UPDATE ON public.character_habit_logs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_character_goals_updated_at ON public.character_goals;
CREATE TRIGGER trg_character_goals_updated_at BEFORE UPDATE ON public.character_goals
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_character_challenges_updated_at ON public.character_challenges;
CREATE TRIGGER trg_character_challenges_updated_at BEFORE UPDATE ON public.character_challenges
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_character_identity_rules_updated_at ON public.character_identity_rules;
CREATE TRIGGER trg_character_identity_rules_updated_at BEFORE UPDATE ON public.character_identity_rules
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 11. Recreate complete_character_habit with logging support
CREATE OR REPLACE FUNCTION public.complete_character_habit(
  p_habit_id uuid,
  p_user_id  uuid,
  p_logged_date date default current_date,
  p_status text default 'completed',
  p_completed_value numeric default 1,
  p_note text default '',
  p_source text default 'user',
  p_linked_task_id uuid default null
) returns jsonb
language plpgsql security definer
as $$
declare
  v_habit        record;
  v_already      boolean;
  v_xp           integer := 0;
  v_streak       integer;
  v_max_streak   integer;
  v_result       jsonb := '{}'::jsonb;
begin
  select * into v_habit
  from public.character_habits
  where id = p_habit_id and user_id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Habit not found');
  end if;

  -- Idempotency check on character_habit_logs
  select exists(
    select 1 from public.character_habit_logs
    where habit_id = p_habit_id
      and logged_date = p_logged_date
  ) into v_already;

  if v_already then
    return jsonb_build_object('error', 'Already logged for this date', 'idempotent', true);
  end if;

  -- Calculate streak and XP if status is 'completed'
  if p_status = 'completed' then
    if v_habit.last_completed_date = p_logged_date - 1 then
      v_streak := v_habit.current_streak + 1;
    elsif v_habit.last_completed_date >= p_logged_date then
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

    -- Update habit
    update public.character_habits
    set current_streak = v_streak,
        max_streak = v_max_streak,
        last_completed_date = p_logged_date,
        updated_at = now()
    where id = p_habit_id;

    -- Award XP server-side
    v_result := public.award_character_xp(
      p_user_id, v_xp, 'habit', p_habit_id::text,
      v_habit.linked_trait_id,
      format('Habit: %s', v_habit.title)
    );
  else
    -- Reset streak if failed/skipped
    v_streak := 0;
    v_max_streak := v_habit.max_streak;
    v_xp := 0;

    update public.character_habits
    set current_streak = v_streak,
        updated_at = now()
    where id = p_habit_id;
  end if;

  -- Insert into habit log
  insert into public.character_habit_logs (
    habit_id, user_id, logged_date, status, completed_value, note, xp_awarded, source, linked_task_id
  ) values (
    p_habit_id, p_user_id, p_logged_date, p_status, p_completed_value, p_note, v_xp, p_source, p_linked_task_id
  );

  -- Log activity
  insert into public.character_activity_logs
    (user_id, event_type, entity_type, entity_id, xp_delta, note)
  values
    (p_user_id, 'habit_log_created', 'habit', p_habit_id::text, v_xp,
     format('Logged habit "%s" as %s (streak %s)', v_habit.title, p_status, v_streak));

  return jsonb_build_object(
    'xp_awarded', v_xp,
    'streak', v_streak,
    'max_streak', v_max_streak,
    'status', p_status
  ) || v_result;
end;
$$;
