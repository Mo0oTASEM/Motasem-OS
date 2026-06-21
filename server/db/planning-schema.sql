-- Nova OS Planning System Schema
-- Run: supabase db push or psql

-- ============================================================
-- Enums
-- ============================================================

create type planning_status as enum ('draft', 'active', 'completed', 'archived', 'cancelled');
create type goal_status as enum ('draft', 'active', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled');
create type progress_type as enum ('task_completion', 'numeric', 'percentage', 'currency', 'milestone', 'boolean', 'manual', 'weighted');
create type task_type as enum ('goal_aligned', 'operational', 'meeting', 'deep_work', 'administrative', 'personal', 'recurring', 'waiting', 'delegated');
create type task_status as enum ('inbox', 'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed');
create type priority_level as enum ('critical', 'high', 'medium', 'low');
create type energy_level as enum ('high', 'medium', 'low');
create type review_type as enum ('daily', 'weekly', 'monthly', 'quarterly');
create type ai_suggestion_status as enum ('pending', 'accepted', 'rejected', 'modified', 'expired');
create type block_type as enum ('deep_work', 'meeting', 'admin', 'break', 'buffer', 'personal');
create type calendar_source as enum ('internal', 'google', 'other');
create type sync_status as enum ('local_only', 'synced', 'pending', 'conflict', 'error');
create type workspace_role as enum ('owner', 'admin', 'member');
create type dependency_type as enum ('finish_to_start', 'start_to_start');

-- ============================================================
-- Workspaces
-- ============================================================

create table if not exists public.workspaces (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    owner_id uuid not null references auth.users(id) on delete cascade,
    settings jsonb default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists workspaces_owner_id_idx on public.workspaces (owner_id);

create table if not exists public.workspace_members (
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role workspace_role not null default 'member',
    joined_at timestamptz not null default now(),
    primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_id_idx on public.workspace_members (user_id);

-- ============================================================
-- User Settings
-- ============================================================

create table if not exists public.user_capacity_settings (
    user_id uuid not null,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    work_start_time time not null default '09:00',
    work_end_time time not null default '17:00',
    work_days integer[] not null default array[0,1,2,3,4,5,6],
    daily_work_hours numeric not null default 8,
    buffer_percentage numeric not null default 20 check (buffer_percentage between 5 and 50),
    deep_work_preferred_start time,
    deep_work_preferred_end time,
    timezone text not null default 'America/New_York',
    updated_at timestamptz not null default now(),
    primary key (user_id, workspace_id)
);

create index if not exists user_capacity_settings_workspace_idx on public.user_capacity_settings (workspace_id);

create table if not exists public.planning_preferences (
    user_id uuid not null,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    daily_big3_reminder_time time,
    weekly_planning_day integer,
    weekly_planning_time time,
    monthly_planning_day integer,
    ai_suggestions_enabled boolean not null default true,
    notification_settings jsonb default '{}',
    updated_at timestamptz not null default now(),
    primary key (user_id, workspace_id)
);

-- ============================================================
-- Annual Planning
-- ============================================================

create table if not exists public.annual_directions (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    year integer not null,
    vision_statement text,
    theme text,
    status planning_status not null default 'draft',
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists annual_directions_workspace_idx on public.annual_directions (workspace_id);
create index if not exists annual_directions_user_idx on public.annual_directions (user_id);

create table if not exists public.quarters (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    annual_direction_id uuid references public.annual_directions(id) on delete set null,
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    quarter_number integer not null check (quarter_number between 1 and 4),
    year integer not null,
    start_date date not null,
    end_date date not null,
    theme text,
    strategic_vision text,
    status planning_status not null default 'draft',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists quarters_workspace_idx on public.quarters (workspace_id);
create index if not exists quarters_annual_direction_idx on public.quarters (annual_direction_id);

-- ============================================================
-- Quarterly Goals & Key Results
-- ============================================================

create table if not exists public.quarterly_goals (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    quarter_id uuid references public.quarters(id) on delete set null,
    owner_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    category text,
    priority priority_level not null default 'medium',
    status goal_status not null default 'draft',
    confidence_score integer check (confidence_score between 0 and 100),
    expected_impact text,
    progress_percentage numeric not null default 0,
    risks text,
    dependencies text,
    success_criteria text,
    review_notes text,
    position integer default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists quarterly_goals_workspace_idx on public.quarterly_goals (workspace_id);
create index if not exists quarterly_goals_quarter_idx on public.quarterly_goals (quarter_id, status);
create index if not exists quarterly_goals_owner_idx on public.quarterly_goals (owner_id);

create table if not exists public.key_results (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    quarterly_goal_id uuid not null references public.quarterly_goals(id) on delete cascade,
    title text not null,
    description text,
    progress_type progress_type not null default 'numeric',
    start_value numeric,
    target_value numeric,
    current_value numeric default 0,
    unit text,
    weight numeric not null default 1.0 check (weight >= 0),
    status goal_status not null default 'draft',
    due_date date,
    owner_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists key_results_workspace_idx on public.key_results (workspace_id);
create index if not exists key_results_goal_idx on public.key_results (quarterly_goal_id);

-- ============================================================
-- Monthly Planning
-- ============================================================

create table if not exists public.monthly_plans (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    quarter_id uuid references public.quarters(id) on delete set null,
    user_id uuid not null references auth.users(id) on delete cascade,
    month_number integer not null check (month_number between 1 and 12),
    year integer not null,
    start_date date not null,
    end_date date not null,
    status planning_status not null default 'draft',
    theme text,
    notes text,
    planned_capacity_hours numeric default 0,
    actual_capacity_hours numeric default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists monthly_plans_workspace_idx on public.monthly_plans (workspace_id);
create index if not exists monthly_plans_quarter_idx on public.monthly_plans (quarter_id);

create table if not exists public.monthly_outcomes (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    monthly_plan_id uuid not null references public.monthly_plans(id) on delete cascade,
    quarterly_goal_id uuid references public.quarterly_goals(id) on delete set null,
    owner_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    desired_outcome text,
    metric_or_deliverable text,
    start_date date,
    end_date date,
    priority priority_level not null default 'medium',
    status goal_status not null default 'draft',
    progress_percentage numeric not null default 0,
    risks text,
    dependencies text,
    planned_effort_hours numeric default 0,
    actual_effort_hours numeric default 0,
    position integer default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists monthly_outcomes_workspace_idx on public.monthly_outcomes (workspace_id);
create index if not exists monthly_outcomes_plan_idx on public.monthly_outcomes (monthly_plan_id);

-- ============================================================
-- Weekly Planning
-- ============================================================

create table if not exists public.weekly_plans (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    monthly_plan_id uuid references public.monthly_plans(id) on delete set null,
    user_id uuid not null references auth.users(id) on delete cascade,
    week_number integer not null check (week_number between 1 and 53),
    year integer not null,
    start_date date not null,
    end_date date not null,
    status planning_status not null default 'draft',
    total_available_hours numeric default 0,
    fixed_commitment_hours numeric default 0,
    planned_task_hours numeric default 0,
    deep_work_hours numeric default 0,
    buffer_hours numeric default 0,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists weekly_plans_workspace_idx on public.weekly_plans (workspace_id);
create index if not exists weekly_plans_monthly_idx on public.weekly_plans (monthly_plan_id);

create table if not exists public.weekly_objectives (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
    monthly_outcome_id uuid references public.monthly_outcomes(id) on delete set null,
    owner_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    definition_of_done text,
    priority priority_level not null default 'medium',
    estimated_effort_hours numeric,
    due_date date,
    progress_percentage numeric not null default 0,
    risk_indicator boolean default false,
    confidence_level integer check (confidence_level between 0 and 100),
    status goal_status not null default 'draft',
    position integer default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists weekly_objectives_workspace_idx on public.weekly_objectives (workspace_id);
create index if not exists weekly_objectives_week_idx on public.weekly_objectives (weekly_plan_id);

-- ============================================================
-- Daily Planning
-- ============================================================

create table if not exists public.daily_plans (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    weekly_plan_id uuid references public.weekly_plans(id) on delete set null,
    user_id uuid not null references auth.users(id) on delete cascade,
    plan_date date not null,
    status planning_status not null default 'draft',
    notes text,
    shutdown_completed_at timestamptz,
    daily_win text,
    blockers text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists daily_plans_workspace_idx on public.daily_plans (workspace_id);
create index if not exists daily_plans_user_date_idx on public.daily_plans (user_id, plan_date);

-- ============================================================
-- Tasks
-- ============================================================

create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    daily_plan_id uuid references public.daily_plans(id) on delete set null,
    weekly_objective_id uuid references public.weekly_objectives(id) on delete set null,
    monthly_outcome_id uuid references public.monthly_outcomes(id) on delete set null,
    quarterly_goal_id uuid references public.quarterly_goals(id) on delete set null,
    project_id uuid,
    owner_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    task_type task_type not null default 'operational',
    status task_status not null default 'inbox',
    priority priority_level not null default 'medium',
    urgency_score integer check (urgency_score between 1 and 5),
    importance_score integer check (importance_score between 1 and 5),
    energy_requirement energy_level,
    estimated_duration_minutes integer,
    actual_duration_minutes integer,
    deadline date,
    scheduled_start timestamptz,
    scheduled_end timestamptz,
    completed_at timestamptz,
    completion_notes text,
    context text,
    is_big3 boolean not null default false,
    is_locked boolean not null default false,
    position integer default 0,
    recurrence_rule_id uuid,
    parent_task_id uuid references public.tasks(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists tasks_workspace_status_start_idx on public.tasks (workspace_id, status, scheduled_start);
create index if not exists tasks_workspace_owner_deadline_idx on public.tasks (workspace_id, owner_id, deadline);
create index if not exists tasks_parent_idx on public.tasks (parent_task_id);
create index if not exists tasks_objective_idx on public.tasks (weekly_objective_id);

create table if not exists public.task_dependencies (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
    dependency_type dependency_type not null default 'finish_to_start',
    created_at timestamptz not null default now(),
    constraint no_self_dependency check (task_id != depends_on_task_id)
);

create index if not exists task_dependencies_task_idx on public.task_dependencies (task_id);
create index if not exists task_dependencies_depends_idx on public.task_dependencies (depends_on_task_id);

-- ============================================================
-- Recurrence Rules
-- ============================================================

create table if not exists public.task_recurrence_rules (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'custom')),
    interval_value integer,
    days_of_week integer[],
    day_of_month integer,
    end_date date,
    max_occurrences integer,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists task_recurrence_rules_workspace_idx on public.task_recurrence_rules (workspace_id);

-- ============================================================
-- Projects (extended)
-- ============================================================

create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    owner_id uuid not null references auth.users(id) on delete cascade,
    settings jsonb default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

alter table if exists public.projects add column if not exists quarterly_goal_id uuid references public.quarterly_goals(id) on delete set null;
alter table if exists public.projects add column if not exists monthly_outcome_id uuid references public.monthly_outcomes(id) on delete set null;

-- ============================================================
-- Project Milestones
-- ============================================================

create table if not exists public.project_milestones (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    project_id uuid not null references public.projects(id) on delete cascade,
    title text not null,
    description text,
    due_date date,
    completed_at timestamptz,
    status text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists project_milestones_workspace_idx on public.project_milestones (workspace_id);
create index if not exists project_milestones_project_idx on public.project_milestones (project_id);

-- ============================================================
-- Time Blocks
-- ============================================================

create table if not exists public.time_blocks (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    daily_plan_id uuid references public.daily_plans(id) on delete set null,
    task_id uuid references public.tasks(id) on delete set null,
    calendar_event_id uuid,
    title text not null,
    block_type block_type not null default 'deep_work',
    start_time timestamptz not null,
    end_time timestamptz not null,
    is_locked boolean not null default false,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists time_blocks_workspace_idx on public.time_blocks (workspace_id);
create index if not exists time_blocks_user_time_idx on public.time_blocks (user_id, start_time, end_time);

-- ============================================================
-- Calendar Events
-- ============================================================

create table if not exists public.calendar_events (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    external_id text,
    source calendar_source not null default 'internal',
    title text not null,
    description text,
    start_time timestamptz not null,
    end_time timestamptz not null,
    timezone text,
    is_all_day boolean not null default false,
    is_recurring boolean not null default false,
    recurrence_data jsonb default '{}',
    is_locked boolean not null default false,
    sync_status sync_status not null default 'synced',
    last_synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table if exists public.calendar_events add column if not exists external_provider text;
alter table if exists public.calendar_events add column if not exists external_calendar_id text;
alter table if exists public.calendar_events add column if not exists external_event_id text;
alter table if exists public.calendar_events add column if not exists provider_updated_at timestamptz;
alter table if exists public.calendar_events add column if not exists html_link text;
alter table if exists public.calendar_events add column if not exists conflict_reason text;

create index if not exists calendar_events_user_time_idx on public.calendar_events (user_id, start_time, end_time);
create index if not exists calendar_events_workspace_idx on public.calendar_events (workspace_id);
create unique index if not exists calendar_events_google_identity_idx
    on public.calendar_events (user_id, workspace_id, external_provider, external_calendar_id, external_event_id)
    where external_provider is not null and external_calendar_id is not null and external_event_id is not null;

-- ============================================================
-- Planning Reviews
-- ============================================================

create table if not exists public.planning_reviews (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    review_type review_type not null,
    reference_id uuid,
    reference_table text,
    period_start date,
    period_end date,
    wins text,
    missed_items text,
    lessons text,
    bottlenecks text,
    metrics jsonb default '{}',
    planned_vs_actual jsonb default '{}',
    ai_generated_summary text,
    status text,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists planning_reviews_workspace_idx on public.planning_reviews (workspace_id);
create index if not exists planning_reviews_user_idx on public.planning_reviews (user_id);

-- ============================================================
-- Progress Updates
-- ============================================================

create table if not exists public.progress_updates (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    entity_type text not null check (entity_type in ('key_result', 'monthly_outcome', 'weekly_objective', 'quarterly_goal')),
    entity_id uuid not null,
    previous_value numeric,
    new_value numeric,
    progress_type progress_type,
    note text,
    updated_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists progress_updates_workspace_idx on public.progress_updates (workspace_id);
create index if not exists progress_updates_entity_idx on public.progress_updates (entity_type, entity_id);

-- ============================================================
-- AI Suggestions
-- ============================================================

create table if not exists public.ai_suggestions (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    suggestion_type text not null,
    context_entity_type text,
    context_entity_id uuid,
    title text not null,
    summary text,
    payload jsonb default '{}',
    status ai_suggestion_status not null default 'pending',
    expires_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists ai_suggestions_workspace_idx on public.ai_suggestions (workspace_id);
create index if not exists ai_suggestions_user_idx on public.ai_suggestions (user_id);
create index if not exists ai_suggestions_status_idx on public.ai_suggestions (status);

-- ============================================================
-- AI Action Previews
-- ============================================================

create type ai_action_preview_status as enum ('pending', 'approved', 'rejected', 'expired');

create table if not exists public.ai_action_previews (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    action_type text not null,
    description text not null,
    proposed_changes jsonb not null,
    explanation text,
    status ai_action_preview_status not null default 'pending',
    reviewed_at timestamptz,
    reviewed_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists ai_action_previews_workspace_idx on public.ai_action_previews (workspace_id);

-- ============================================================
-- AI Action Logs
-- ============================================================

create table if not exists public.ai_action_logs (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    preview_id uuid references public.ai_action_previews(id) on delete set null,
    action_type text not null,
    applied_changes jsonb default '{}',
    success boolean not null default false,
    error_message text,
    created_at timestamptz not null default now()
);

create index if not exists ai_action_logs_workspace_idx on public.ai_action_logs (workspace_id);

-- ============================================================
-- Notifications
-- ============================================================

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    type text not null,
    title text not null,
    body text not null,
    entity_type text,
    entity_id uuid,
    read_at timestamptz,
    dismissed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id);
create index if not exists notifications_workspace_idx on public.notifications (workspace_id);

-- ============================================================
-- Activity Logs
-- ============================================================

create table if not exists public.activity_logs (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    action text not null,
    entity_type text not null,
    entity_id uuid,
    old_value jsonb,
    new_value jsonb,
    ip_address text,
    created_at timestamptz not null default now()
);

create index if not exists activity_logs_workspace_entity_idx on public.activity_logs (workspace_id, entity_type, entity_id);

-- ============================================================
-- Trigger Functions
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end $$;

-- Apply updated_at trigger to all tables
create trigger if not exists set_workspaces_updated_at before update on public.workspaces for each row execute function set_updated_at();
create trigger if not exists set_quarters_updated_at before update on public.quarters for each row execute function set_updated_at();
create trigger if not exists set_quarterly_goals_updated_at before update on public.quarterly_goals for each row execute function set_updated_at();
create trigger if not exists set_key_results_updated_at before update on public.key_results for each row execute function set_updated_at();
create trigger if not exists set_monthly_plans_updated_at before update on public.monthly_plans for each row execute function set_updated_at();
create trigger if not exists set_monthly_outcomes_updated_at before update on public.monthly_outcomes for each row execute function set_updated_at();
create trigger if not exists set_weekly_plans_updated_at before update on public.weekly_plans for each row execute function set_updated_at();
create trigger if not exists set_weekly_objectives_updated_at before update on public.weekly_objectives for each row execute function set_updated_at();
create trigger if not exists set_daily_plans_updated_at before update on public.daily_plans for each row execute function set_updated_at();
create trigger if not exists set_tasks_updated_at before update on public.tasks for each row execute function set_updated_at();
create trigger if not exists set_task_recurrence_rules_updated_at before update on public.task_recurrence_rules for each row execute function set_updated_at();
create trigger if not exists set_project_milestones_updated_at before update on public.project_milestones for each row execute function set_updated_at();
create trigger if not exists set_time_blocks_updated_at before update on public.time_blocks for each row execute function set_updated_at();
create trigger if not exists set_calendar_events_updated_at before update on public.calendar_events for each row execute function set_updated_at();
create trigger if not exists set_planning_reviews_updated_at before update on public.planning_reviews for each row execute function set_updated_at();
create trigger if not exists set_ai_suggestions_updated_at before update on public.ai_suggestions for each row execute function set_updated_at();
create trigger if not exists set_ai_action_previews_updated_at before update on public.ai_action_previews for each row execute function set_updated_at();

-- ============================================================
-- Down Migration (drop all created objects in reverse order)
-- ============================================================

-- View this separately - run after backing up data
-- DROP TRIGGER IF EXISTS set_ai_action_previews_updated_at ON public.ai_action_previews;
-- DROP TRIGGER IF EXISTS set_ai_suggestions_updated_at ON public.ai_suggestions;
-- DROP TRIGGER IF EXISTS set_planning_reviews_updated_at ON public.planning_reviews;
-- DROP TRIGGER IF EXISTS set_calendar_events_updated_at ON public.calendar_events;
-- DROP TRIGGER IF EXISTS set_time_blocks_updated_at ON public.time_blocks;
-- DROP TRIGGER IF EXISTS set_project_milestones_updated_at ON public.project_milestones;
-- DROP TRIGGER IF EXISTS set_task_recurrence_rules_updated_at ON public.task_recurrence_rules;
-- DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
-- DROP TRIGGER IF EXISTS set_daily_plans_updated_at ON public.daily_plans;
-- DROP TRIGGER IF EXISTS set_weekly_objectives_updated_at ON public.weekly_objectives;
-- DROP TRIGGER IF EXISTS set_weekly_plans_updated_at ON public.weekly_plans;
-- DROP TRIGGER IF EXISTS set_monthly_outcomes_updated_at ON public.monthly_outcomes;
-- DROP TRIGGER IF EXISTS set_monthly_plans_updated_at ON public.monthly_plans;
-- DROP TRIGGER IF EXISTS set_key_results_updated_at ON public.key_results;
-- DROP TRIGGER IF EXISTS set_quarterly_goals_updated_at ON public.quarterly_goals;
-- DROP TRIGGER IF EXISTS set_quarters_updated_at ON public.quarters;
-- DROP TRIGGER IF EXISTS set_workspaces_updated_at ON public.workspaces;
-- DROP FUNCTION IF EXISTS set_updated_at();
-- DROP INDEX IF EXISTS activity_logs_workspace_entity_idx;
-- DROP INDEX IF EXISTS notifications_workspace_idx;
-- DROP INDEX IF EXISTS notifications_user_idx;
-- DROP INDEX IF EXISTS ai_action_logs_workspace_idx;
-- DROP INDEX IF EXISTS ai_action_previews_workspace_idx;
-- DROP INDEX IF EXISTS ai_suggestions_status_idx;
-- DROP INDEX IF EXISTS ai_suggestions_user_idx;
-- DROP INDEX IF EXISTS ai_suggestions_workspace_idx;
-- DROP INDEX IF EXISTS progress_updates_entity_idx;
-- DROP INDEX IF EXISTS progress_updates_workspace_idx;
-- DROP INDEX IF EXISTS planning_reviews_user_idx;
-- DROP INDEX IF EXISTS planning_reviews_workspace_idx;
-- DROP INDEX IF EXISTS calendar_events_workspace_idx;
-- DROP INDEX IF EXISTS calendar_events_user_time_idx;
-- DROP INDEX IF EXISTS time_blocks_user_time_idx;
-- DROP INDEX IF EXISTS time_blocks_workspace_idx;
-- DROP INDEX IF EXISTS project_milestones_project_idx;
-- DROP INDEX IF EXISTS project_milestones_workspace_idx;
-- DROP TYPE IF EXISTS ai_action_preview_status;
-- DROP TABLE IF EXISTS activity_logs;
-- DROP TABLE IF EXISTS ai_action_logs;
-- DROP TABLE IF EXISTS ai_action_previews;
-- DROP TABLE IF EXISTS ai_suggestions;
-- DROP TABLE IF EXISTS progress_updates;
-- DROP TABLE IF EXISTS planning_reviews;
-- DROP TABLE IF EXISTS calendar_events;
-- DROP TABLE IF EXISTS time_blocks;
-- DROP TABLE IF EXISTS project_milestones;
-- DROP TABLE IF EXISTS task_recurrence_rules;
-- DROP TABLE IF EXISTS task_dependencies;
-- DROP TABLE IF EXISTS tasks;
-- DROP TABLE IF EXISTS daily_plans;
-- DROP TABLE IF EXISTS weekly_objectives;
-- DROP TABLE IF EXISTS weekly_plans;
-- DROP TABLE IF EXISTS monthly_outcomes;
-- DROP TABLE IF EXISTS monthly_plans;
-- DROP TABLE IF EXISTS key_results;
-- DROP TABLE IF EXISTS quarterly_goals;
-- DROP TABLE IF EXISTS quarters;
-- DROP TABLE IF EXISTS annual_directions;
-- DROP TABLE IF EXISTS planning_preferences;
-- DROP TABLE IF EXISTS user_capacity_settings;
-- DROP TABLE IF EXISTS workspace_members;
-- DROP TYPE IF EXISTS workspace_role;
-- DROP TYPE IF EXISTS dependency_type;
-- DROP TYPE IF EXISTS block_type;
-- DROP TYPE IF EXISTS calendar_source;
-- DROP TYPE IF EXISTS sync_status;
-- DROP TYPE IF EXISTS ai_suggestion_status;
-- DROP TYPE IF EXISTS review_type;
-- DROP TYPE IF EXISTS energy_level;
-- DROP TYPE IF EXISTS priority_level;
-- DROP TYPE IF EXISTS task_status;
-- DROP TYPE IF EXISTS task_type;
-- DROP TYPE IF EXISTS progress_type;
-- DROP TYPE IF EXISTS goal_status;
-- DROP TYPE IF EXISTS planning_status;
