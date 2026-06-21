import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '../../../lib/supabase/client';
import type {
  CharacterProfile,
  CharacterTrait,
  CharacterHabit,
  CharacterQuest,
  CharacterBadGuy,
  CharacterPowerUp,
  CharacterIfThenRule,
  CharacterContract,
  CharacterReflection,
  CharacterSeason,
  ActivityLogEntry,
  ExposureLadder,
  ExposureStep,
  CharacterHabitLog,
  CharacterGoal,
  CharacterChallenge,
  CharacterIdentityRule,
  CharacterConnection,
} from '../types';



// ── RPC response types ─────────────────────────────────────
export interface XpAwardResult {
  total_xp: number;
  level: number;
  current_level_xp: number;
  did_level_up: boolean;
  awarded_xp: number;
  error?: string;
}

export interface HabitCompleteResult extends XpAwardResult {
  xp_awarded: number;
  streak: number;
  max_streak: number;
}

export interface QuestCompleteResult extends XpAwardResult {
  quest_id: string;
  xp_awarded: number;
}

export interface BadGuyResult extends XpAwardResult {
  bad_guy: string;
  resisted?: boolean;
  triggered?: boolean;
}

export interface ContractResult extends XpAwardResult {
  contract: string;
  completed?: boolean;
}

export interface PowerUpResult extends XpAwardResult {
  power_up: string;
  used?: boolean;
}

export interface IfThenResult extends XpAwardResult {
  followed?: boolean;
  xp_awarded?: number;
}

// ── Full character data snapshot (returned by loadAll) ──────
export interface AllCharacterData {
  profile: CharacterProfile | null;
  traits: CharacterTrait[];
  habits: CharacterHabit[];
  quests: CharacterQuest[];
  ladders: ExposureLadder[];
  badGuys: CharacterBadGuy[];
  powerUps: CharacterPowerUp[];
  ifThenRules: CharacterIfThenRule[];
  contracts: CharacterContract[];
  reflections: CharacterReflection[];
  seasons: CharacterSeason[];
  activityLog: ActivityLogEntry[];
  goals: CharacterGoal[];
  challenges: CharacterChallenge[];
  identityRules: CharacterIdentityRule[];
  connections: CharacterConnection[];
  habitLogs: CharacterHabitLog[];
}

// ── Helpers ──────────────────────────────────────────────────
function getSupabase(): SupabaseClient | null {
  return getSupabaseBrowserClient();
}

function rowToCamel<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = value;
  }
  return out as T;
}

function rowsToCamel<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map(r => rowToCamel<T>(r));
}

// ── Profile ──────────────────────────────────────────────────

export async function loadProfile(userId: string): Promise<CharacterProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('character_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load profile: ${error.message}`);
  return data ? rowToCamel<CharacterProfile>(data as Record<string, unknown>) : null;
}

export async function upsertProfile(userId: string, updates: Partial<CharacterProfile>): Promise<CharacterProfile> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('character_profiles')
    .upsert({ user_id: userId, ...updatesToDb(updates) })
    .select()
    .single();
  if (error) throw new Error(`Failed to save profile: ${error.message}`);
  return rowToCamel<CharacterProfile>(data as Record<string, unknown>);
}

// ── Traits ───────────────────────────────────────────────────

export async function loadTraits(userId: string): Promise<CharacterTrait[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_traits')
    .select('*')
    .eq('user_id', userId)
    .order('display_order');
  if (error) throw new Error(`Failed to load traits: ${error.message}`);
  return rowsToCamel<CharacterTrait>(((data || []) as Record<string, unknown>[]) as Record<string, unknown>[]);
}

export async function saveTraits(userId: string, traits: CharacterTrait[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = traits.map(t => ({ ...toDbTrait(t), user_id: userId }));
  const { error } = await supabase.from('character_traits').upsert(rows);
  if (error) throw new Error(`Failed to save traits: ${error.message}`);
}

export async function deleteTraitRows(userId: string, traitIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('character_traits')
    .delete()
    .eq('user_id', userId)
    .in('id', traitIds);
  if (error) throw new Error(`Failed to delete traits: ${error.message}`);
}

// ── Habits ───────────────────────────────────────────────────

export async function loadHabits(userId: string): Promise<CharacterHabit[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw new Error(`Failed to load habits: ${error.message}`);
  return rowsToCamel<CharacterHabit>((data || []) as Record<string, unknown>[]);
}

export async function saveHabits(userId: string, habits: CharacterHabit[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = habits.map(h => ({ ...toDbHabit(h), user_id: userId }));
  const { error } = await supabase.from('character_habits').upsert(rows);
  if (error) throw new Error(`Failed to save habits: ${error.message}`);
}

export async function deleteHabitRows(userId: string, habitIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('character_habits')
    .delete()
    .eq('user_id', userId)
    .in('id', habitIds);
  if (error) throw new Error(`Failed to delete habits: ${error.message}`);
}

// ── Quests ───────────────────────────────────────────────────

export async function loadQuests(userId: string): Promise<CharacterQuest[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_quests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to load quests: ${error.message}`);
  return rowsToCamel<CharacterQuest>((data || []) as Record<string, unknown>[]);
}

export async function saveQuests(userId: string, quests: CharacterQuest[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = quests.map(q => ({ ...toDbQuest(q), user_id: userId }));
  const { error } = await supabase.from('character_quests').upsert(rows);
  if (error) throw new Error(`Failed to save quests: ${error.message}`);
}

export async function deleteQuestRows(userId: string, questIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('character_quests')
    .delete()
    .eq('user_id', userId)
    .in('id', questIds);
  if (error) throw new Error(`Failed to delete quests: ${error.message}`);
}

// ── Bad Guys ─────────────────────────────────────────────────

export async function loadBadGuys(userId: string): Promise<CharacterBadGuy[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_bad_guys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw new Error(`Failed to load bad guys: ${error.message}`);
  return rowsToCamel<CharacterBadGuy>((data || []) as Record<string, unknown>[]);
}

export async function saveBadGuys(userId: string, badGuys: CharacterBadGuy[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = badGuys.map(b => ({ ...toDbBadGuy(b), user_id: userId }));
  const { error } = await supabase.from('character_bad_guys').upsert(rows);
  if (error) throw new Error(`Failed to save bad guys: ${error.message}`);
}

export async function deleteBadGuyRows(userId: string, badGuyIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('character_bad_guys')
    .delete()
    .eq('user_id', userId)
    .in('id', badGuyIds);
  if (error) throw new Error(`Failed to delete bad guys: ${error.message}`);
}

// ── Power-Ups ────────────────────────────────────────────────

export async function loadPowerUps(userId: string): Promise<CharacterPowerUp[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_power_ups')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw new Error(`Failed to load power-ups: ${error.message}`);
  return rowsToCamel<CharacterPowerUp>((data || []) as Record<string, unknown>[]);
}

export async function savePowerUps(userId: string, powerUps: CharacterPowerUp[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = powerUps.map(p => ({ ...toDbPowerUp(p), user_id: userId }));
  const { error } = await supabase.from('character_power_ups').upsert(rows);
  if (error) throw new Error(`Failed to save power-ups: ${error.message}`);
}

export async function deletePowerUpRows(userId: string, powerUpIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('character_power_ups')
    .delete()
    .eq('user_id', userId)
    .in('id', powerUpIds);
  if (error) throw new Error(`Failed to delete power-ups: ${error.message}`);
}

// ── If-Then Rules ────────────────────────────────────────────

export async function loadIfThenRules(userId: string): Promise<CharacterIfThenRule[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_if_then_rules')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw new Error(`Failed to load if-then rules: ${error.message}`);
  return rowsToCamel<CharacterIfThenRule>((data || []) as Record<string, unknown>[]);
}

export async function saveIfThenRules(userId: string, rules: CharacterIfThenRule[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = rules.map(r => ({ ...toDbIfThenRule(r), user_id: userId }));
  const { error } = await supabase.from('character_if_then_rules').upsert(rows);
  if (error) throw new Error(`Failed to save if-then rules: ${error.message}`);
}

export async function deleteIfThenRuleRows(userId: string, ruleIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('character_if_then_rules')
    .delete()
    .eq('user_id', userId)
    .in('id', ruleIds);
  if (error) throw new Error(`Failed to delete if-then rules: ${error.message}`);
}

// ── Contracts ────────────────────────────────────────────────

export async function loadContracts(userId: string): Promise<CharacterContract[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_contracts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to load contracts: ${error.message}`);
  return rowsToCamel<CharacterContract>((data || []) as Record<string, unknown>[]);
}

export async function saveContracts(userId: string, contracts: CharacterContract[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = contracts.map(c => ({ ...toDbContract(c), user_id: userId }));
  const { error } = await supabase.from('character_contracts').upsert(rows);
  if (error) throw new Error(`Failed to save contracts: ${error.message}`);
}

export async function deleteContractRows(userId: string, contractIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('character_contracts')
    .delete()
    .eq('user_id', userId)
    .in('id', contractIds);
  if (error) throw new Error(`Failed to delete contracts: ${error.message}`);
}

// ── Exposure Ladders + Steps ─────────────────────────────────

export async function loadLadders(userId: string): Promise<ExposureLadder[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: ladders, error: lErr } = await supabase
    .from('character_exposure_ladders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');
  if (lErr) throw new Error(`Failed to load ladders: ${lErr.message}`);

  const ladderIds = (ladders || []).map(l => l.id);
  let steps: Record<string, unknown>[] = [];
  if (ladderIds.length > 0) {
    const { data: s, error: sErr } = await supabase
      .from('character_exposure_steps')
      .select('*')
      .in('ladder_id', ladderIds)
      .order('step_order');
    if (sErr) throw new Error(`Failed to load steps: ${sErr.message}`);
    steps = s || [];
  }

  const stepsByLadder: Record<string, ExposureStep[]> = {};
  for (const step of steps) {
    const camel = rowToCamel<ExposureStep>(step as Record<string, unknown>);
    const lid = String(step.ladder_id);
    if (!stepsByLadder[lid]) stepsByLadder[lid] = [];
    stepsByLadder[lid].push(camel);
  }

  return (ladders || []).map(l => {
    const ladder = rowToCamel<ExposureLadder>(l as Record<string, unknown>);
    ladder.steps = stepsByLadder[l.id] || [];
    return ladder;
  });
}

export async function saveLadders(userId: string, ladders: ExposureLadder[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = ladders.map(l => ({ ...toDbLadder(l), user_id: userId }));
  const { error } = await supabase.from('character_exposure_ladders').upsert(rows);
  if (error) throw new Error(`Failed to save ladders: ${error.message}`);

  // Save steps
  const allSteps = ladders.flatMap(l =>
    l.steps.map(s => ({ ...toDbStep(s), ladder_id: l.id }))
  );
  if (allSteps.length > 0) {
    const { error: sErr } = await supabase.from('character_exposure_steps').upsert(allSteps);
    if (sErr) throw new Error(`Failed to save steps: ${sErr.message}`);
  }
}

export async function deleteLadderRows(userId: string, ladderIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  // Cascade deletes steps via FK
  const { error } = await supabase
    .from('character_exposure_ladders')
    .delete()
    .eq('user_id', userId)
    .in('id', ladderIds);
  if (error) throw new Error(`Failed to delete ladders: ${error.message}`);
}

// ── Reflections ──────────────────────────────────────────────

export async function loadReflections(userId: string): Promise<CharacterReflection[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_reflections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(`Failed to load reflections: ${error.message}`);
  return rowsToCamel<CharacterReflection>((data || []) as Record<string, unknown>[]);
}

export async function saveReflections(userId: string, reflections: CharacterReflection[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = reflections.map(r => ({ ...toDbReflection(r), user_id: userId }));
  const { error } = await supabase.from('character_reflections').upsert(rows);
  if (error) throw new Error(`Failed to save reflections: ${error.message}`);
}

// ── Seasons ──────────────────────────────────────────────────

export async function loadSeasons(userId: string): Promise<CharacterSeason[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_seasons')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });
  if (error) throw new Error(`Failed to load seasons: ${error.message}`);
  return rowsToCamel<CharacterSeason>((data || []) as Record<string, unknown>[]);
}

export async function saveSeasons(userId: string, seasons: CharacterSeason[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = seasons.map(s => ({ ...toDbSeason(s), user_id: userId }));
  const { error } = await supabase.from('character_seasons').upsert(rows);
  if (error) throw new Error(`Failed to save seasons: ${error.message}`);
}

// ── Activity Log ─────────────────────────────────────────────

export async function loadActivityLog(userId: string, limit = 100): Promise<ActivityLogEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load activity log: ${error.message}`);
  return rowsToCamel<ActivityLogEntry>((data || []) as Record<string, unknown>[]);
}

// ── RPC calls (server-side operations) ───────────────────────

export async function rpcCompleteHabit(
  habitId: string,
  userId: string,
  loggedDate?: string,
  status?: 'completed' | 'failed' | 'skipped',
  completedValue?: number,
  note?: string,
  source?: string,
  linkedTaskId?: string | null
): Promise<HabitCompleteResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('complete_character_habit', {
    p_habit_id: habitId,
    p_user_id: userId,
    p_logged_date: loggedDate || new Date().toISOString().split('T')[0],
    p_status: status || 'completed',
    p_completed_value: completedValue !== undefined ? completedValue : 1,
    p_note: note || '',
    p_source: source || 'user',
    p_linked_task_id: linkedTaskId || null,
  });
  if (error) throw new Error(`Failed to complete habit: ${error.message}`);
  return data as HabitCompleteResult;
}

export interface HabitUndoResult {
  success: boolean;
  xp_deducted: number;
  new_streak: number;
  error?: string;
}

export async function rpcUndoHabitLog(
  logId: string,
  userId: string
): Promise<HabitUndoResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('undo_character_habit_log', {
    p_log_id: logId,
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to undo habit log: ${error.message}`);
  return data as HabitUndoResult;
}

export async function rpcCompleteQuest(questId: string, userId: string): Promise<QuestCompleteResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('complete_character_quest', {
    p_quest_id: questId,
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to complete quest: ${error.message}`);
  return data as QuestCompleteResult;
}

export async function rpcAwardXp(
  userId: string,
  amount: number,
  entityType?: string,
  entityId?: string,
  traitId?: string,
  note?: string,
): Promise<XpAwardResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('award_character_xp', {
    p_user_id: userId,
    p_amount: amount,
    p_entity_type: entityType || null,
    p_entity_id: entityId || null,
    p_trait_id: traitId || null,
    p_note: note || null,
  });
  if (error) throw new Error(`Failed to award XP: ${error.message}`);
  return data as XpAwardResult;
}

export async function rpcResistBadGuy(badGuyId: string, userId: string): Promise<BadGuyResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('resist_character_bad_guy', {
    p_bad_guy_id: badGuyId,
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to resist bad guy: ${error.message}`);
  return data as BadGuyResult;
}

export async function rpcTriggerBadGuy(badGuyId: string, userId: string): Promise<BadGuyResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('trigger_character_bad_guy', {
    p_bad_guy_id: badGuyId,
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to trigger bad guy: ${error.message}`);
  return data as BadGuyResult;
}

export async function rpcCompleteContract(contractId: string, userId: string): Promise<ContractResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('complete_character_contract', {
    p_contract_id: contractId,
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to complete contract: ${error.message}`);
  return data as ContractResult;
}

export async function rpcUsePowerUp(powerUpId: string, userId: string): Promise<PowerUpResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('use_character_power_up', {
    p_power_up_id: powerUpId,
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to use power-up: ${error.message}`);
  return data as PowerUpResult;
}

export async function rpcTriggerIfThen(ruleId: string, userId: string, followed: boolean): Promise<IfThenResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('trigger_character_if_then', {
    p_rule_id: ruleId,
    p_user_id: userId,
    p_followed: followed,
  });
  if (error) throw new Error(`Failed to trigger if-then rule: ${error.message}`);
  return data as IfThenResult;
}

// ── Load all character data ──────────────────────────────────

export async function loadAllCharacterData(userId: string): Promise<AllCharacterData> {
  const [
    profile, traits, habits, quests, ladders,
    badGuys, powerUps, ifThenRules, contracts,
    reflections, seasons, activityLog,
    goals, challenges, identityRules, connections, habitLogs
  ] = await Promise.all([
    loadProfile(userId),
    loadTraits(userId),
    loadHabits(userId),
    loadQuests(userId),
    loadLadders(userId),
    loadBadGuys(userId),
    loadPowerUps(userId),
    loadIfThenRules(userId),
    loadContracts(userId),
    loadReflections(userId),
    loadSeasons(userId),
    loadActivityLog(userId, 50),
    loadGoals(userId),
    loadChallenges(userId),
    loadIdentityRules(userId),
    loadConnections(userId),
    loadHabitLogs(userId)
  ]);

  return {
    profile, traits, habits, quests, ladders,
    badGuys, powerUps, ifThenRules, contracts,
    reflections, seasons, activityLog,
    goals, challenges, identityRules, connections, habitLogs
  };
}

// ── Snapshot migration helper ────────────────────────────────
// Creates initial profile if none exists

export async function ensureProfile(userId: string): Promise<CharacterProfile> {
  const existing = await loadProfile(userId);
  if (existing) return existing;
  return upsertProfile(userId, {
    userId,
    title: 'The Initiate',
    identityStatement: '',
    currentLevel: 1,
    totalXp: 0,
    currentLevelXp: 0,
    onboardingStatus: 'not_started',
    preferredDifficulty: 3,
    recoveryMode: false,
  } as Partial<CharacterProfile>);
}

// ── Snake-case conversion helpers ────────────────────────────

function updatesToDb(u: Partial<CharacterProfile>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (u.title !== undefined) db.title = u.title;
  if (u.identityStatement !== undefined) db.identity_statement = u.identityStatement;
  if (u.currentLevel !== undefined) db.current_level = u.currentLevel;
  if (u.totalXp !== undefined) db.total_xp = u.totalXp;
  if (u.currentLevelXp !== undefined) db.current_level_xp = u.currentLevelXp;
  if (u.selectedArchetype !== undefined) db.selected_archetype = u.selectedArchetype;
  if (u.activeSeasonId !== undefined) db.active_season_id = u.activeSeasonId;
  if (u.onboardingStatus !== undefined) db.onboarding_status = u.onboardingStatus;
  if (u.preferredDifficulty !== undefined) db.preferred_difficulty = u.preferredDifficulty;
  if (u.recoveryMode !== undefined) db.recovery_mode = u.recoveryMode;
  if (u.currentStreak !== undefined) db.current_streak = u.currentStreak;
  if (u.maxStreak !== undefined) db.max_streak = u.maxStreak;
  if (u.currentScore !== undefined) db.current_score = u.currentScore;
  if (u.selectedFocusAreas !== undefined) db.selected_focus_areas = u.selectedFocusAreas;
  if (u.activeDevelopmentPhase !== undefined) db.active_development_phase = u.activeDevelopmentPhase;
  if (u.avatarConfig !== undefined) db.avatar_config = u.avatarConfig;
  return db;
}

function toDbTrait(t: CharacterTrait): Record<string, unknown> {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    icon: t.icon,
    visual_key: t.visualKey,
    current_score: t.currentScore,
    lifetime_xp: t.lifetimeXp,
    current_rank: t.currentRank,
    target_score: t.targetScore,
    status: t.status,
    display_order: t.displayOrder,
  };
}

function toDbHabit(h: CharacterHabit): Record<string, unknown> {
  return {
    id: h.id,
    title: h.title,
    description: h.description,
    linked_trait_id: h.linkedTraitId,
    habit_type: h.habitType,
    cue: h.cue,
    expected_response: h.expectedResponse,
    replacement_behavior: h.replacementBehavior,
    frequency: h.frequency,
    scheduled_days: h.scheduledDays,
    preferred_time: h.preferredTime,
    target_count: h.targetCount,
    difficulty: h.difficulty,
    base_xp: h.baseXp,
    is_active: h.isActive,
    start_date: h.startDate,
    end_date: h.endDate,
    planner_task_id: h.plannerTaskId,
    reminder_enabled: h.reminderEnabled,
    reminder_time: h.reminderTime,
    current_streak: h.currentStreak,
    max_streak: h.maxStreak,
    last_completed_date: h.lastCompletedDate,
    category: h.category,
    selected_weekdays: h.selectedWeekdays,
    target_value: h.targetValue,
    unit: h.unit,
    priority: h.priority,
    status: h.status,
    reminder_settings: h.reminderSettings,
    notes: h.notes,
    archive_status: h.archiveStatus,
  };
}

function toDbQuest(q: CharacterQuest): Record<string, unknown> {
  return {
    id: q.id,
    quest_type: q.questType,
    title: q.title,
    description: q.description,
    why_it_matters: q.whyItMatters,
    linked_trait_ids: q.linkedTraitIds,
    difficulty: q.difficulty,
    estimated_discomfort: q.estimatedDiscomfort,
    target_date: q.targetDate,
    checklist_steps: q.checklistSteps as unknown as Record<string, unknown>[],
    required_proof: q.requiredProof,
    proof_type: q.proofType,
    reward_xp: q.rewardXp,
    bonus_conditions: q.bonusConditions as unknown as Record<string, unknown>[],
    failure_rule: q.failureRule,
    retry_count: q.retryCount,
    status: q.status,
    source: q.source,
    ai_generation_metadata: q.aiGenerationMetadata,
    planner_task_id: q.plannerTaskId,
    goal_id: q.goalId,
    crm_contact_id: q.crmContactId,
    crm_opportunity_id: q.crmOpportunityId,
    completed_at: q.completedAt,
  };
}

function toDbBadGuy(b: CharacterBadGuy): Record<string, unknown> {
  return {
    id: b.id,
    title: b.title,
    trigger_description: b.triggerDescription,
    warning_signs: b.warningSigns,
    usual_behavior: b.usualBehavior,
    cost_consequence: b.costConsequence,
    replacement_response: b.replacementResponse,
    linked_rule_id: b.linkedRuleId,
    severity: b.severity,
    occurrence_count: b.occurrenceCount,
    defeated_count: b.defeatedCount,
    last_occurrence_at: b.lastOccurrenceAt,
    is_active: b.isActive,
  };
}

function toDbPowerUp(p: CharacterPowerUp): Record<string, unknown> {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    duration_minutes: p.durationMinutes,
    category: p.category,
    instructions: p.instructions,
    linked_bad_guy_ids: p.linkedBadGuyIds,
    usage_count: p.usageCount,
    effectiveness_rating: p.effectivenessRating,
    is_favorite: p.isFavorite,
  };
}

function toDbIfThenRule(r: CharacterIfThenRule): Record<string, unknown> {
  return {
    id: r.id,
    trigger_condition: r.triggerCondition,
    response_action: r.responseAction,
    linked_trait_id: r.linkedTraitId,
    linked_bad_guy_id: r.linkedBadGuyId,
    is_active: r.isActive,
    success_count: r.successCount,
    failure_count: r.failureCount,
    effectiveness_score: r.effectivenessScore,
  };
}

function toDbContract(c: CharacterContract): Record<string, unknown> {
  return {
    id: c.id,
    title: c.title,
    goal_description: c.goalDescription,
    measurable_commitment: c.measurableCommitment,
    reporting_frequency: c.reportingFrequency,
    start_date: c.startDate,
    end_date: c.endDate,
    proof_requirement: c.proofRequirement,
    accountability_person: c.accountabilityPerson,
    crm_contact_id: c.crmContactId,
    stake_type: c.stakeType,
    stake_description: c.stakeDescription,
    consequence: c.consequence,
    grace_rules: c.graceRules,
    is_active: c.isActive,
    completion_status: c.completionStatus,
    completed_at: c.completedAt,
  };
}

function toDbLadder(l: ExposureLadder): Record<string, unknown> {
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    linked_trait_id: l.linkedTraitId,
    desired_end_behavior: l.desiredEndBehavior,
    status: l.status,
    current_step: l.currentStep,
    completion_percentage: l.completionPercentage,
    difficulty_policy: l.difficultyPolicy,
    ai_adaptation_enabled: l.aiAdaptationEnabled,
  };
}

function toDbStep(s: ExposureStep): Record<string, unknown> {
  return {
    id: s.id,
    step_order: s.stepOrder,
    title: s.title,
    instructions: s.instructions,
    difficulty: s.difficulty,
    discomfort_estimate: s.discomfortEstimate,
    repetition_target: s.repetitionTarget,
    successful_repetitions: s.successfulRepetitions,
    reflection_required: s.reflectionRequired,
    proof_required: s.proofRequired,
    status: s.status,
  };
}

function toDbReflection(r: CharacterReflection): Record<string, unknown> {
  return {
    id: r.id,
    pre_action_fear: r.preActionFear,
    post_action_result: r.postActionResult,
    what_happened: r.whatHappened,
    what_learned: r.whatLearned,
    emotional_intensity_before: r.emotionalIntensityBefore,
    emotional_intensity_after: r.emotionalIntensityAfter,
    next_step: r.nextStep,
    privacy_setting: r.privacySetting,
    ai_summary_status: r.aiSummaryStatus,
    linked_entity_type: r.linkedEntityType,
    linked_entity_id: r.linkedEntityId,
  };
}

function toDbSeason(s: CharacterSeason): Record<string, unknown> {
  return {
    id: s.id,
    title: s.title,
    identity_focus: s.identityFocus,
    target_trait_ids: s.targetTraitIds,
    target_habit_ids: s.targetHabitIds,
    target_ladder_ids: s.targetLadderIds,
    start_date: s.startDate,
    end_date: s.endDate,
    status: s.status,
    opening_xp: s.openingXp,
    earned_xp: s.earnedXp,
    completion_score: s.completionScore,
    final_reflection: s.finalReflection,
  };
}

// ── Goals CRUD ───────────────────────────────────────────────
export async function loadGoals(userId: string): Promise<CharacterGoal[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw new Error(`Failed to load goals: ${error.message}`);
  return rowsToCamel<CharacterGoal>((data || []) as Record<string, unknown>[]);
}

export async function saveGoals(userId: string, goals: CharacterGoal[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = goals.map(g => ({ ...toDbGoal(g), user_id: userId }));
  const { error } = await supabase.from('character_goals').upsert(rows);
  if (error) throw new Error(`Failed to save goals: ${error.message}`);
}

export async function deleteGoalRows(userId: string, goalIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('character_goals')
    .delete()
    .eq('user_id', userId)
    .in('id', goalIds);
  if (error) throw new Error(`Failed to delete goals: ${error.message}`);
}

// ── Challenges CRUD ──────────────────────────────────────────
export async function loadChallenges(userId: string): Promise<CharacterChallenge[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_challenges')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw new Error(`Failed to load challenges: ${error.message}`);
  return rowsToCamel<CharacterChallenge>((data || []) as Record<string, unknown>[]);
}

export async function saveChallenges(userId: string, challenges: CharacterChallenge[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = challenges.map(c => ({ ...toDbChallenge(c), user_id: userId }));
  const { error } = await supabase.from('character_challenges').upsert(rows);
  if (error) throw new Error(`Failed to save challenges: ${error.message}`);
}

export async function deleteChallengeRows(userId: string, challengeIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('character_challenges')
    .delete()
    .eq('user_id', userId)
    .in('id', challengeIds);
  if (error) throw new Error(`Failed to delete challenges: ${error.message}`);
}

// ── Identity Rules CRUD ──────────────────────────────────────
export async function loadIdentityRules(userId: string): Promise<CharacterIdentityRule[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_identity_rules')
    .select('*')
    .eq('user_id', userId)
    .order('display_order');
  if (error) throw new Error(`Failed to load identity rules: ${error.message}`);
  return rowsToCamel<CharacterIdentityRule>((data || []) as Record<string, unknown>[]);
}

export async function saveIdentityRules(userId: string, rules: CharacterIdentityRule[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = rules.map(r => ({ ...toDbIdentityRule(r), user_id: userId }));
  const { error } = await supabase.from('character_identity_rules').upsert(rows);
  if (error) throw new Error(`Failed to save identity rules: ${error.message}`);
}

export async function deleteIdentityRuleRows(userId: string, ruleIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('character_identity_rules')
    .delete()
    .eq('user_id', userId)
    .in('id', ruleIds);
  if (error) throw new Error(`Failed to delete identity rules: ${error.message}`);
}

// ── Connections CRUD ─────────────────────────────────────────
export async function loadConnections(userId: string): Promise<CharacterConnection[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_connections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw new Error(`Failed to load connections: ${error.message}`);
  return rowsToCamel<CharacterConnection>((data || []) as Record<string, unknown>[]);
}

export async function saveConnections(userId: string, connections: CharacterConnection[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = connections.map(c => ({ ...toDbConnection(c), user_id: userId }));
  const { error } = await supabase.from('character_connections').upsert(rows);
  if (error) throw new Error(`Failed to save connections: ${error.message}`);
}

export async function deleteConnectionRows(userId: string, connectionIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('character_connections')
    .delete()
    .eq('user_id', userId)
    .in('id', connectionIds);
  if (error) throw new Error(`Failed to delete connections: ${error.message}`);
}

// ── Habit Logs CRUD ──────────────────────────────────────────
export async function loadHabitLogs(userId: string): Promise<CharacterHabitLog[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('character_habit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_date', { ascending: false });
  if (error) throw new Error(`Failed to load habit logs: ${error.message}`);
  return rowsToCamel<CharacterHabitLog>((data || []) as Record<string, unknown>[]);
}

export async function saveHabitLogs(userId: string, logs: CharacterHabitLog[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const rows = logs.map(l => ({ ...toDbHabitLog(l), user_id: userId }));
  const { error } = await supabase.from('character_habit_logs').upsert(rows);
  if (error) throw new Error(`Failed to save habit logs: ${error.message}`);
}

export async function deleteHabitLogRows(userId: string, logIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('character_habit_logs')
    .delete()
    .eq('user_id', userId)
    .in('id', logIds);
  if (error) throw new Error(`Failed to delete habit logs: ${error.message}`);
}

// ── Serialization Helpers ────────────────────────────────────
function toDbGoal(g: CharacterGoal): Record<string, unknown> {
  return {
    id: g.id,
    title: g.title,
    description: g.description,
    category: g.category,
    target_outcome: g.targetOutcome,
    measurable_success_criteria: g.measurableSuccessCriteria,
    priority: g.priority,
    status: g.status,
    start_date: g.startDate,
    target_date: g.targetDate,
    progress_percentage: g.progressPercentage,
    linked_monthly_goal_id: g.linkedMonthlyGoalId,
    linked_weekly_goal_id: g.linkedWeeklyGoalId,
    parent_goal_id: g.parentGoalId,
    xp_reward: g.xpReward,
  };
}

function toDbChallenge(c: CharacterChallenge): Record<string, unknown> {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    difficulty: c.difficulty,
    category: c.category,
    challenge_type: c.challengeType,
    status: c.status,
    target: c.target,
    progress: c.progress,
    start_date: c.startDate,
    deadline: c.deadline,
    xp_reward: c.xpReward,
    linked_daily_task_id: c.linkedDailyTaskId,
    linked_weekly_goal_id: c.linkedWeeklyGoalId,
    linked_monthly_goal_id: c.linkedMonthlyGoalId,
    ai_generated: c.aiGenerated,
  };
}

function toDbIdentityRule(r: CharacterIdentityRule): Record<string, unknown> {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    rule_statement: r.ruleStatement,
    category: r.category,
    priority: r.priority,
    active_status: r.activeStatus,
    display_order: r.displayOrder,
  };
}

function toDbConnection(c: CharacterConnection): Record<string, unknown> {
  return {
    id: c.id,
    source_entity_type: c.sourceEntityType,
    source_entity_id: c.sourceEntityId,
    target_entity_type: c.targetEntityType,
    target_entity_id: c.targetEntityId,
    relationship_type: c.relationshipType,
    metadata: c.metadata,
  };
}

function toDbHabitLog(l: CharacterHabitLog): Record<string, unknown> {
  return {
    id: l.id,
    habit_id: l.habitId,
    logged_date: l.loggedDate,
    status: l.status,
    completed_value: l.completedValue,
    note: l.note,
    xp_awarded: l.xpAwarded,
    source: l.source,
    linked_task_id: l.linkedTaskId,
  };
}

export async function deleteReflectionRows(userId: string, reflectionIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('character_reflections')
    .delete()
    .eq('user_id', userId)
    .in('id', reflectionIds);
  if (error) throw new Error(`Failed to delete reflections: ${error.message}`);
}

export async function deleteSeasonRows(userId: string, seasonIds: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('character_seasons')
    .delete()
    .eq('user_id', userId)
    .in('id', seasonIds);
  if (error) throw new Error(`Failed to delete seasons: ${error.message}`);
}
