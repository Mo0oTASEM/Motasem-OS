import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../../context/useApp';
import {
  loadAllCharacterData,
  rpcCompleteHabit, rpcUndoHabitLog, rpcCompleteQuest, rpcAwardXp,
  rpcResistBadGuy, rpcTriggerBadGuy,
  rpcCompleteContract, rpcUsePowerUp, rpcTriggerIfThen,
} from '../services/characterService';
import { loadIntegrations, saveIntegrations } from '../services/integrationService';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import { resolveWorkspaceId } from '../../planner/hooks/usePlanner';
import { generateInsights } from '../services/aiInsightsService';
import { runCharacterOnboarding } from '../services/onboardingService';
import { calculateLevel, calculateCurrentLevelXp } from '../utils/xpCalculator';
import { summarizeCharacterContext } from '../services/characterBrainService';
import { buildSearchableEntities, searchCharacterEntities, CHARACTER_COMMANDS } from '../services/characterSearchService';
import { buildActivityEntry } from '../services/characterActivityService';
import { DEFAULT_PRIVACY_SETTINGS } from '../services/characterPrivacyService';
import type {
  CharacterTrait, CharacterHabit, CharacterQuest, CharacterBadGuy,
  CharacterPowerUp, CharacterIfThenRule, CharacterContract,
  CharacterTaskIntegration, CharacterGoalIntegration, CharacterMemoryIntegration,
  CharacterUIState, CharacterProfile, ExposureLadder, CharacterReflection,
  CharacterSeason, OnboardingStatus, CharacterGoal, CharacterChallenge,
  CharacterIdentityRule, CharacterConnection, CharacterHabitLog,
} from '../types';
import type { PlannerTask, Goal } from '../../../context/AppContext';
import type { CharacterSearchableEntity, CharacterCommandAction } from '../services/characterSearchService';
import type { CharacterActivityEventType } from '../services/characterActivityService';
import type { PrivacySettings } from '../services/characterPrivacyService';
import { characterCoachClient } from '../services/characterCoachClient';
import type {
  CoachMessageRequest, QuestGenerationRequest, GeneratedQuest,
  LadderGenerationRequest, GeneratedLadder,
  ReflectionAnalysisRequest, ReflectionAnalysisResponse,
  WeeklyReviewRequest, WeeklyReviewResponse,
  DailyMissionRequest, DailyMissionResponse,
  AdaptiveSuggestionRequest, AdaptiveSuggestionResponse,
} from '../services/characterCoachTypes';
import type { CoachChatResponse, CoachResult } from '../services/characterCoachClient';

function uuid(): string {
  return crypto.randomUUID();
}

export interface CharacterReturnType {
  // Entity arrays
  profile: CharacterProfile | null;
  traits: CharacterTrait[];
  habits: CharacterHabit[];
  quests: CharacterQuest[];
  challenges: CharacterQuest[];
  bossFights: CharacterQuest[];
  badGuys: CharacterBadGuy[];
  powerUps: CharacterPowerUp[];
  ifThenRules: CharacterIfThenRule[];
  accountabilityContracts: CharacterContract[];
  ladders: ExposureLadder[];
  reflections: CharacterReflection[];
  seasons: CharacterSeason[];
  goals: CharacterGoal[];
  characterChallenges: CharacterChallenge[];
  identityRules: CharacterIdentityRule[];
  connections: CharacterConnection[];
  habitLogs: CharacterHabitLog[];

  // Integrations
  taskIntegrations: CharacterTaskIntegration[];
  goalIntegrations: CharacterGoalIntegration[];
  memoryIntegrations: CharacterMemoryIntegration[];

  // UI
  ui: CharacterUIState;

  // Meta
  loading: boolean;
  saving: boolean;
  error: string | null;
  apiAvailable: boolean;

  // Progression
  totalXp: number;
  level: number;
  levelTitle: string;
  xpToNextLevel: number;
  currentStreak: number;
  maxStreak: number;
  achievements: string[];
  aiInsights: string[];
  adaptiveChallenges: CharacterQuest[];

  // Notifications
  recentAchievement: string | null;
  linkingGoalId: string | null;

  // Onboarding
  onboardingStatus: OnboardingStatus;
  onboardingLoading: boolean;
  runOnboarding: () => Promise<void>;

  // Selection
  setSelectedTraitId: (id: string | null) => void;
  setSelectedHabitId: (id: string | null) => void;
  setSelectedQuestId: (id: string | null) => void;
  setSelectedChallengeId: (id: string | null) => void;
  setSelectedBossFightId: (id: string | null) => void;
  setSelectedBadGuyId: (id: string | null) => void;
  setSelectedPowerUpId: (id: string | null) => void;
  setSelectedRuleId: (id: string | null) => void;
  setSelectedContractId: (id: string | null) => void;

  // Data mutations
  refresh: () => Promise<void>;
  addTrait: (trait: Omit<CharacterTrait, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTrait: (id: string, updates: Partial<CharacterTrait>) => Promise<void>;
  deleteTrait: (id: string) => Promise<void>;
  addHabit: (habit: Omit<CharacterHabit, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentStreak' | 'maxStreak' | 'lastCompletedDate'>) => Promise<void>;
  updateHabit: (id: string, updates: Partial<CharacterHabit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  addQuest: (quest: Omit<CharacterQuest, 'id' | 'userId' | 'createdAt' | 'completedAt'>) => Promise<void>;
  updateQuest: (id: string, updates: Partial<CharacterQuest>) => Promise<void>;
  deleteQuest: (id: string) => Promise<void>;
  addBadGuy: (badGuy: Omit<CharacterBadGuy, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBadGuy: (id: string, updates: Partial<CharacterBadGuy>) => Promise<void>;
  deleteBadGuy: (id: string) => Promise<void>;
  addPowerUp: (powerUp: Omit<CharacterPowerUp, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePowerUp: (id: string, updates: Partial<CharacterPowerUp>) => Promise<void>;
  deletePowerUp: (id: string) => Promise<void>;
  addIfThenRule: (rule: Omit<CharacterIfThenRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIfThenRule: (id: string, updates: Partial<CharacterIfThenRule>) => Promise<void>;
  deleteIfThenRule: (id: string) => Promise<void>;
  addContract: (contract: Omit<CharacterContract, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'completedAt'>) => Promise<void>;
  updateContract: (id: string, updates: Partial<CharacterContract>) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  addLadder: (ladder: Omit<ExposureLadder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLadder: (id: string, updates: Partial<ExposureLadder>) => Promise<void>;
  deleteLadder: (id: string) => Promise<void>;
  addReflection: (reflection: Omit<CharacterReflection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReflection: (id: string, updates: Partial<CharacterReflection>) => Promise<void>;
  deleteReflection: (id: string) => Promise<void>;
  addSeason: (season: Omit<CharacterSeason, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSeason: (id: string, updates: Partial<CharacterSeason>) => Promise<void>;
  deleteSeason: (id: string) => Promise<void>;
  updateProfile: (updates: Partial<CharacterProfile>) => Promise<void>;

  completeHabit: (
    id: string,
    loggedDate?: string,
    status?: 'completed' | 'failed' | 'skipped',
    completedValue?: number,
    note?: string,
    source?: string,
    linkedTaskId?: string | null
  ) => Promise<void>;
  logHabitAction: (
    habitId: string,
    loggedDate: string,
    status: 'completed' | 'failed' | 'skipped',
    completedValue: number,
    note: string,
    source: string,
    linkedTaskId: string | null
  ) => Promise<void>;
  undoHabitAction: (logId: string) => Promise<void>;

  addGoal: (goal: Omit<CharacterGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<CharacterGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  addChallenge: (challenge: Omit<CharacterChallenge, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateChallenge: (id: string, updates: Partial<CharacterChallenge>) => Promise<void>;
  deleteChallenge: (id: string) => Promise<void>;

  addIdentityRule: (rule: Omit<CharacterIdentityRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIdentityRule: (id: string, updates: Partial<CharacterIdentityRule>) => Promise<void>;
  deleteIdentityRule: (id: string) => Promise<void>;

  addConnection: (conn: Omit<CharacterConnection, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;

  completeQuest: (id: string) => Promise<void>;
  attemptChallenge: (id: string, succeeded: boolean) => Promise<void>;
  attemptBossFight: (id: string, defeated: boolean) => Promise<void>;
  resistBadGuy: (id: string) => Promise<void>;
  giveInBadGuy: (id: string) => Promise<void>;
  usePowerUp: (id: string) => Promise<void>;
  triggerIfThenRule: (id: string, followed: boolean) => Promise<void>;
  completeContract: (id: string) => Promise<void>;
  failContract: (id: string) => Promise<void>;
  earnXp: (amount: number, traitId?: string) => Promise<{ didLevelUp: boolean; newLevel: number }>;

  // Integration
  linkHabitToPlannerTask: (habitId: string, plannerTaskId: string, autoGenerate: boolean) => Promise<void>;
  unlinkHabitFromPlannerTask: (plannerTaskId: string) => Promise<void>;
  linkTraitToGoal: (traitId: string, goalId: string) => Promise<void>;
  unlinkTraitFromGoal: (goalId: string) => Promise<void>;

  // AI
  generateAIInsights: () => Promise<void>;

  // Character Coach
  sendCoachMessage: (req: CoachMessageRequest) => Promise<CoachResult<CoachChatResponse>>;
  generateQuestWithCoach: (req: QuestGenerationRequest) => Promise<CoachResult<{ quest: GeneratedQuest; disclaimer?: string }>>;
  generateLadderWithCoach: (req: LadderGenerationRequest) => Promise<CoachResult<{ ladder: GeneratedLadder; disclaimer?: string }>>;
  analyzeReflectionWithCoach: (req: ReflectionAnalysisRequest) => Promise<CoachResult<ReflectionAnalysisResponse>>;
  getWeeklyReview: (req: WeeklyReviewRequest) => Promise<CoachResult<WeeklyReviewResponse>>;
  getDailyMission: (req: DailyMissionRequest) => Promise<CoachResult<DailyMissionResponse>>;
  getAdaptiveSuggestion: (req: AdaptiveSuggestionRequest) => Promise<CoachResult<AdaptiveSuggestionResponse>>;

  // Queries
  getPlannerTasksForHabit: (habitId: string) => CharacterTaskIntegration[];
  getGoalsForTrait: (traitId: string) => CharacterGoalIntegration[];

  // Integration: Brain context
  brainContext: string;
  buildBrainContextSummary: () => string;

  // Integration: Search
  searchableEntities: CharacterSearchableEntity[];
  searchEntities: (query: string) => CharacterSearchableEntity[];

  // Integration: Activity
  logActivityEntry: (eventType: CharacterActivityEventType, entityType: string, entityId: string, note: string, xpDelta?: number, metadata?: Record<string, unknown>) => void;
  characterActivityFeed: { eventType: string; note: string; createdAt: string }[];

  // Integration: Privacy
  privacySettings: PrivacySettings;
  setPrivacySettings: (settings: PrivacySettings) => void;

  // Integration: Command palette
  characterCommands: CharacterCommandAction[];

  // Misc
  dismissRecentAchievement: () => void;
}

export const useCharacter = (): CharacterReturnType => {
  const { user, plannerTasks, addPlannerTask, updatePlannerTask, goals: plannerGoals, updateGoalItem, addMemoryItem } = useApp();

  // ── State ─────────────────────────────────────────────────
  const [profile, setProfile] = useState<CharacterProfile | null>(null);
  const [traits, setTraits] = useState<CharacterTrait[]>([]);
  const [habits, setHabits] = useState<CharacterHabit[]>([]);
  const [quests, setQuests] = useState<CharacterQuest[]>([]);
  const [badGuys, setBadGuys] = useState<CharacterBadGuy[]>([]);
  const [powerUps, setPowerUps] = useState<CharacterPowerUp[]>([]);
  const [ifThenRules, setIfThenRules] = useState<CharacterIfThenRule[]>([]);
  const [contracts, setContracts] = useState<CharacterContract[]>([]);
  const [ladders, setLadders] = useState<ExposureLadder[]>([]);
  const [reflections, setReflections] = useState<CharacterReflection[]>([]);
  const [seasons, setSeasons] = useState<CharacterSeason[]>([]);
  const [goals, setGoals] = useState<CharacterGoal[]>([]);
  const [characterChallenges, setCharacterChallenges] = useState<CharacterChallenge[]>([]);
  const [identityRules, setIdentityRules] = useState<CharacterIdentityRule[]>([]);
  const [connections, setConnections] = useState<CharacterConnection[]>([]);
  const [habitLogs, setHabitLogs] = useState<CharacterHabitLog[]>([]);
  const [taskIntegrations, setTaskIntegrations] = useState<CharacterTaskIntegration[]>([]);
  const [goalIntegrations, setGoalIntegrations] = useState<CharacterGoalIntegration[]>([]);
  const [memoryIntegrations, setMemoryIntegrations] = useState<CharacterMemoryIntegration[]>([]);
  const [aiInsights, setAIInsights] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [recentAchievement, setRecentAchievement] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ui, setUi] = useState<CharacterUIState>({
    selectedTraitId: null, selectedHabitId: null, selectedQuestId: null,
    selectedChallengeId: null, selectedBossFightId: null, selectedBadGuyId: null,
    selectedPowerUpId: null, selectedRuleId: null, selectedContractId: null,
  });

  // Integration state
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [characterActivityFeed, setCharacterActivityFeed] = useState<{ eventType: string; note: string; createdAt: string }[]>([]);

  // Computed properties
  const totalXp = profile?.totalXp ?? 0;
  const level = profile?.currentLevel ?? 1;
  const levelInfo = calculateLevel(totalXp);
  const challenges = quests.filter(q => q.questType === 'exposure');
  const bossFights = quests.filter(q => q.questType === 'boss_fight');
  const adaptiveChallenges = quests.filter(q => q.questType === 'ai_suggested' && q.status === 'active');
  const linkingGoalId = null;

  const brainContext = summarizeCharacterContext(profile, traits, habits, quests, badGuys, powerUps, ifThenRules, contracts, ladders, reflections, seasons);
  const searchableEntities = buildSearchableEntities(traits, habits, quests, badGuys, powerUps, ifThenRules, contracts, ladders, reflections, seasons);

  // ── Load ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      const { profile: p, traits: t, habits: h, quests: q, ladders: l,
        badGuys: bg, powerUps: pu, ifThenRules: r, contracts: c,
        reflections: ref, seasons: s, goals: g, challenges: ch,
        identityRules: ir, connections: conn, habitLogs: hl } = await loadAllCharacterData(user.id);
      const integrations = await loadIntegrations(user.id);

      setProfile(p);
      setTraits(t);
      setHabits(h);
      setQuests(q);
      setLadders(l);
      setBadGuys(bg);
      setPowerUps(pu);
      setIfThenRules(r);
      setContracts(c);
      setReflections(ref);
      setSeasons(s);
      setGoals(g);
      setCharacterChallenges(ch);
      setIdentityRules(ir);
      setConnections(conn);
      setHabitLogs(hl);
      setTaskIntegrations(integrations.taskIntegrations);
      setGoalIntegrations(integrations.goalIntegrations);
      setMemoryIntegrations(integrations.memoryIntegrations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load character data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    const trigger = async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (active) {
        loadData();
      }
    };
    trigger();
    return () => { active = false; };
  }, [loadData]);



  // ── Onboarding ────────────────────────────────────────────
  const runOnboarding = useCallback(async () => {
    if (!user) return;
    setOnboardingLoading(true);
    try {
      await runCharacterOnboarding(user.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed.');
    } finally {
      setOnboardingLoading(false);
    }
  }, [user, loadData]);

  // ── Selection ─────────────────────────────────────────────
  const setSelectedTraitId = useCallback((id: string | null) => { setUi(prev => ({ ...prev, selectedTraitId: id })); }, []);
  const setSelectedHabitId = useCallback((id: string | null) => { setUi(prev => ({ ...prev, selectedHabitId: id })); }, []);
  const setSelectedQuestId = useCallback((id: string | null) => { setUi(prev => ({ ...prev, selectedQuestId: id })); }, []);
  const setSelectedChallengeId = useCallback((id: string | null) => { setUi(prev => ({ ...prev, selectedChallengeId: id })); }, []);
  const setSelectedBossFightId = useCallback((id: string | null) => { setUi(prev => ({ ...prev, selectedBossFightId: id })); }, []);
  const setSelectedBadGuyId = useCallback((id: string | null) => { setUi(prev => ({ ...prev, selectedBadGuyId: id })); }, []);
  const setSelectedPowerUpId = useCallback((id: string | null) => { setUi(prev => ({ ...prev, selectedPowerUpId: id })); }, []);
  const setSelectedRuleId = useCallback((id: string | null) => { setUi(prev => ({ ...prev, selectedRuleId: id })); }, []);
  const setSelectedContractId = useCallback((id: string | null) => { setUi(prev => ({ ...prev, selectedContractId: id })); }, []);
  const dismissRecentAchievement = useCallback(() => { setRecentAchievement(null); }, []);

  // ── Persist helpers ───────────────────────────────────────
  const persistTraits = useCallback(async (updated: CharacterTrait[]) => {
    if (!user) return;
    setSaving(true);
    try {
      const { saveTraits } = await import('../services/characterService');
      await saveTraits(user.id, updated);
      setTraits(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  const persistHabits = useCallback(async (updated: CharacterHabit[]) => {
    if (!user) return;
    setSaving(true);
    try {
      const { saveHabits } = await import('../services/characterService');
      await saveHabits(user.id, updated);
      setHabits(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  const persistQuests = useCallback(async (updated: CharacterQuest[]) => {
    if (!user) return;
    setSaving(true);
    try {
      const { saveQuests } = await import('../services/characterService');
      await saveQuests(user.id, updated);
      setQuests(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  const persistBadGuys = useCallback(async (updated: CharacterBadGuy[]) => {
    if (!user) return;
    setSaving(true);
    try {
      const { saveBadGuys } = await import('../services/characterService');
      await saveBadGuys(user.id, updated);
      setBadGuys(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  const persistPowerUps = useCallback(async (updated: CharacterPowerUp[]) => {
    if (!user) return;
    setSaving(true);
    try {
      const { savePowerUps } = await import('../services/characterService');
      await savePowerUps(user.id, updated);
      setPowerUps(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  const persistIfThenRules = useCallback(async (updated: CharacterIfThenRule[]) => {
    if (!user) return;
    setSaving(true);
    try {
      const { saveIfThenRules } = await import('../services/characterService');
      await saveIfThenRules(user.id, updated);
      setIfThenRules(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  const persistContracts = useCallback(async (updated: CharacterContract[]) => {
    if (!user) return;
    setSaving(true);
    try {
      const { saveContracts } = await import('../services/characterService');
      await saveContracts(user.id, updated);
      setContracts(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  // ── Trait CRUD ───────────────────────────────────────────
  const addTrait = useCallback(async (input: Omit<CharacterTrait, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTrait: CharacterTrait = {
      ...input, id: uuid(), userId: user?.id ?? '', createdAt: now, updatedAt: now,
    };
    await persistTraits([...traits, newTrait]);
  }, [traits, persistTraits, user]);

  const updateTrait = useCallback(async (id: string, updates: Partial<CharacterTrait>) => {
    await persistTraits(traits.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
  }, [traits, persistTraits]);

  const deleteTrait = useCallback(async (id: string) => {
    await persistTraits(traits.filter(t => t.id !== id));
    setGoalIntegrations(prev => prev.filter(g => g.characterTraitId !== id));
  }, [traits, persistTraits]);

  // ── Habit CRUD ───────────────────────────────────────────
  const addHabit = useCallback(async (input: Omit<CharacterHabit, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentStreak' | 'maxStreak' | 'lastCompletedDate'>) => {
    const now = new Date().toISOString();
    const newHabit: CharacterHabit = {
      ...input, id: uuid(), userId: user?.id ?? '',
      currentStreak: 0, maxStreak: 0, lastCompletedDate: null,
      createdAt: now, updatedAt: now,
    };
    await persistHabits([...habits, newHabit]);
  }, [habits, persistHabits, user]);

  const updateHabit = useCallback(async (id: string, updates: Partial<CharacterHabit>) => {
    await persistHabits(habits.map(h => h.id === id ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h));
  }, [habits, persistHabits]);

  const deleteHabit = useCallback(async (id: string) => {
    await persistHabits(habits.filter(h => h.id !== id));
    setTaskIntegrations(prev => prev.filter(i => i.characterHabitId !== id));
  }, [habits, persistHabits]);

  // ── Quest CRUD ───────────────────────────────────────────
  const addQuest = useCallback(async (input: Omit<CharacterQuest, 'id' | 'userId' | 'createdAt' | 'completedAt'>) => {
    const newQuest: CharacterQuest = {
      ...input, id: uuid(), userId: user?.id ?? '',
      createdAt: new Date().toISOString(), completedAt: null,
    };
    await persistQuests([...quests, newQuest]);
  }, [quests, persistQuests, user]);

  const updateQuest = useCallback(async (id: string, updates: Partial<CharacterQuest>) => {
    await persistQuests(quests.map(q => q.id === id ? { ...q, ...updates } : q));
  }, [quests, persistQuests]);

  const deleteQuest = useCallback(async (id: string) => {
    await persistQuests(quests.filter(q => q.id !== id));
  }, [quests, persistQuests]);

  // ── Bad Guy CRUD ─────────────────────────────────────────
  const addBadGuy = useCallback(async (input: Omit<CharacterBadGuy, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newBadGuy: CharacterBadGuy = {
      ...input, id: uuid(), userId: user?.id ?? '',
      occurrenceCount: 0, defeatedCount: 0, lastOccurrenceAt: null,
      createdAt: now, updatedAt: now,
    };
    await persistBadGuys([...badGuys, newBadGuy]);
  }, [badGuys, persistBadGuys, user]);

  const updateBadGuy = useCallback(async (id: string, updates: Partial<CharacterBadGuy>) => {
    await persistBadGuys(badGuys.map(b => b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b));
  }, [badGuys, persistBadGuys]);

  const deleteBadGuy = useCallback(async (id: string) => {
    await persistBadGuys(badGuys.filter(b => b.id !== id));
  }, [badGuys, persistBadGuys]);

  // ── Power-Up CRUD ────────────────────────────────────────
  const addPowerUp = useCallback(async (input: Omit<CharacterPowerUp, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newPowerUp: CharacterPowerUp = {
      ...input, id: uuid(), userId: user?.id ?? '',
      usageCount: 0, effectivenessRating: 0, isFavorite: false,
      createdAt: now, updatedAt: now,
    };
    await persistPowerUps([...powerUps, newPowerUp]);
  }, [powerUps, persistPowerUps, user]);

  const updatePowerUp = useCallback(async (id: string, updates: Partial<CharacterPowerUp>) => {
    await persistPowerUps(powerUps.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
  }, [powerUps, persistPowerUps]);

  const deletePowerUp = useCallback(async (id: string) => {
    await persistPowerUps(powerUps.filter(p => p.id !== id));
  }, [powerUps, persistPowerUps]);

  // ── If-Then Rule CRUD ────────────────────────────────────
  const addIfThenRule = useCallback(async (input: Omit<CharacterIfThenRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newRule: CharacterIfThenRule = {
      ...input, id: uuid(), userId: user?.id ?? '',
      successCount: 0, failureCount: 0, effectivenessScore: 0,
      createdAt: now, updatedAt: now,
    };
    await persistIfThenRules([...ifThenRules, newRule]);
  }, [ifThenRules, persistIfThenRules, user]);

  const updateIfThenRule = useCallback(async (id: string, updates: Partial<CharacterIfThenRule>) => {
    await persistIfThenRules(ifThenRules.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r));
  }, [ifThenRules, persistIfThenRules]);

  const deleteIfThenRule = useCallback(async (id: string) => {
    await persistIfThenRules(ifThenRules.filter(r => r.id !== id));
  }, [ifThenRules, persistIfThenRules]);

  // ── Contract CRUD ────────────────────────────────────────
  const addContract = useCallback(async (input: Omit<CharacterContract, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'completedAt'>) => {
    const now = new Date().toISOString();
    const newContract: CharacterContract = {
      ...input, id: uuid(), userId: user?.id ?? '',
      completionStatus: 'pending', completedAt: null,
      createdAt: now, updatedAt: now,
    };
    await persistContracts([...contracts, newContract]);
  }, [contracts, persistContracts, user]);

  const updateContract = useCallback(async (id: string, updates: Partial<CharacterContract>) => {
    await persistContracts(contracts.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
  }, [contracts, persistContracts]);

  const deleteContract = useCallback(async (id: string) => {
    await persistContracts(contracts.filter(c => c.id !== id));
  }, [contracts, persistContracts]);

  // ── Ladder CRUD ──────────────────────────────────────────
  const addLadder = useCallback(async (input: Omit<ExposureLadder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const now = new Date().toISOString();
    const newLadder: ExposureLadder = {
      ...input, id: uuid(), userId: user.id,
      createdAt: now, updatedAt: now,
    };
    setSaving(true);
    try {
      const { saveLadders } = await import('../services/characterService');
      await saveLadders(user.id, [...ladders, newLadder]);
      setLadders(prev => [...prev, newLadder]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user, ladders]);

  const updateLadder = useCallback(async (id: string, updates: Partial<ExposureLadder>) => {
    if (!user) return;
    const now = new Date().toISOString();
    const updated = ladders.map(l => l.id === id ? { ...l, ...updates, updatedAt: now } : l);
    setSaving(true);
    try {
      const { saveLadders } = await import('../services/characterService');
      await saveLadders(user.id, updated);
      setLadders(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user, ladders]);

  const deleteLadder = useCallback(async (id: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const { deleteLadderRows } = await import('../services/characterService');
      await deleteLadderRows(user.id, [id]);
      setLadders(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  // ── Reflection CRUD ──────────────────────────────────────
  const addReflection = useCallback(async (input: Omit<CharacterReflection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const now = new Date().toISOString();
    const newReflection: CharacterReflection = {
      ...input, id: uuid(), userId: user.id,
      createdAt: now, updatedAt: now,
    };
    setSaving(true);
    try {
      const { saveReflections } = await import('../services/characterService');
      await saveReflections(user.id, [...reflections, newReflection]);
      setReflections(prev => [...prev, newReflection]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user, reflections]);

  const updateReflection = useCallback(async (id: string, updates: Partial<CharacterReflection>) => {
    if (!user) return;
    const now = new Date().toISOString();
    const updated = reflections.map(r => r.id === id ? { ...r, ...updates, updatedAt: now } : r);
    setSaving(true);
    try {
      const { saveReflections } = await import('../services/characterService');
      await saveReflections(user.id, updated);
      setReflections(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user, reflections]);

  const deleteReflection = useCallback(async (id: string) => {
    if (!user) return;
    const updated = reflections.filter(r => r.id !== id);
    setSaving(true);
    try {
      const { deleteReflectionRows } = await import('../services/characterService');
      await deleteReflectionRows(user.id, [id]);
      setReflections(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user, reflections]);

  // ── Season CRUD ──────────────────────────────────────────
  const addSeason = useCallback(async (input: Omit<CharacterSeason, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const now = new Date().toISOString();
    const newSeason: CharacterSeason = {
      ...input, id: uuid(), userId: user.id,
      createdAt: now, updatedAt: now,
    };
    setSaving(true);
    try {
      const { saveSeasons } = await import('../services/characterService');
      await saveSeasons(user.id, [...seasons, newSeason]);
      setSeasons(prev => [...prev, newSeason]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user, seasons]);

  const updateSeason = useCallback(async (id: string, updates: Partial<CharacterSeason>) => {
    if (!user) return;
    const now = new Date().toISOString();
    const updated = seasons.map(s => s.id === id ? { ...s, ...updates, updatedAt: now } : s);
    setSaving(true);
    try {
      const { saveSeasons } = await import('../services/characterService');
      await saveSeasons(user.id, updated);
      setSeasons(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user, seasons]);

  const deleteSeason = useCallback(async (id: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const { deleteSeasonRows } = await import('../services/characterService');
      await deleteSeasonRows(user.id, [id]);
      setSeasons(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  // ── Profile CRUD ──────────────────────────────────────────
  const updateProfile = useCallback(async (updates: Partial<CharacterProfile>) => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const { upsertProfile } = await import('../services/characterService');
      const updated = await upsertProfile(user.id, updates);
      setProfile(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  // ── Earn XP ──────────────────────────────────────────────
  const earnXp = useCallback(async (amount: number, traitId?: string): Promise<{ didLevelUp: boolean; newLevel: number }> => {
    if (!user || !profile) return { didLevelUp: false, newLevel: level };
    setSaving(true);

    try {
      const result = await rpcAwardXp(user.id, amount, undefined, undefined, traitId, undefined);
      if (!result.error) {
        setProfile(prev => prev ? {
          ...prev,
          totalXp: result.total_xp,
          currentLevel: result.level,
          currentLevelXp: result.current_level_xp,
          updatedAt: new Date().toISOString(),
        } : prev);

        if (result.did_level_up) {
          const achievement = `Reached Level ${result.level}`;
          setAchievements(prev => prev.includes(achievement) ? prev : [...prev, achievement]);
          setRecentAchievement(achievement);
        }

        // Sync trait XP
        if (traitId && result.awarded_xp > 0) {
          setTraits(prev => prev.map(t =>
            t.id === traitId ? { ...t, lifetimeXp: t.lifetimeXp + amount, updatedAt: new Date().toISOString() } : t
          ));

          // Sync linked goals
          const linkedGoals = goalIntegrations.filter(g => g.characterTraitId === traitId);
          for (const link of linkedGoals) {
            const goal = plannerGoals.find(g => g.id === link.goalId);
            if (goal) {
              const trait = traits.find(t => t.id === traitId);
              if (trait) {
                const newRank = Math.floor((trait.lifetimeXp + amount) / 100) + 1;
                updateGoalItem(link.goalId, { progress: Math.min(100, newRank * 10) });
              }
            }
          }
        }

        return { didLevelUp: result.did_level_up, newLevel: result.level };
      }
    } catch {
      // Fallback: client-side XP
    } finally {
      setSaving(false);
    }

    // Client-side fallback
    const newTotalXp = (profile?.totalXp ?? 0) + amount;
    const curLevel = profile?.currentLevel ?? 1;
    const { didLevelUp, newLevel } = (() => {
      const l = calculateLevel(newTotalXp);
      return { didLevelUp: l.level > curLevel, newLevel: l.level };
    })();

    setProfile(prev => prev ? {
      ...prev, totalXp: newTotalXp, currentLevel: newLevel,
      currentLevelXp: calculateCurrentLevelXp(newTotalXp, newLevel),
      updatedAt: new Date().toISOString(),
    } : prev);

    if (didLevelUp) {
      const achievement = `Reached Level ${newLevel}`;
      setAchievements(prev => prev.includes(achievement) ? prev : [...prev, achievement]);
      setRecentAchievement(achievement);
    }

    if (traitId) {
      setTraits(prev => prev.map(t =>
        t.id === traitId ? { ...t, lifetimeXp: t.lifetimeXp + amount, updatedAt: new Date().toISOString() } : t
      ));
    }

    return { didLevelUp, newLevel };
  }, [user, profile, level, goalIntegrations, plannerGoals, traits, updateGoalItem]);

  // ── Persist helpers for new entities ────────────────────
  const persistGoals = useCallback(async (updated: CharacterGoal[]) => {
    if (!user) return;
    setSaving(true);
    try {
      const { saveGoals } = await import('../services/characterService');
      await saveGoals(user.id, updated);
      setGoals(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  const persistChallenges = useCallback(async (updated: CharacterChallenge[]) => {
    if (!user) return;
    setSaving(true);
    try {
      const { saveChallenges } = await import('../services/characterService');
      await saveChallenges(user.id, updated);
      setCharacterChallenges(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  const persistIdentityRules = useCallback(async (updated: CharacterIdentityRule[]) => {
    if (!user) return;
    setSaving(true);
    try {
      const { saveIdentityRules } = await import('../services/characterService');
      await saveIdentityRules(user.id, updated);
      setIdentityRules(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  const persistConnections = useCallback(async (updated: CharacterConnection[]) => {
    if (!user) return;
    setSaving(true);
    try {
      const { saveConnections } = await import('../services/characterService');
      await saveConnections(user.id, updated);
      setConnections(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  // ── Goals CRUD ───────────────────────────────────────────
  const addGoal = useCallback(async (input: Omit<CharacterGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newGoal: CharacterGoal = {
      ...input, id: uuid(), userId: user?.id ?? '', createdAt: now, updatedAt: now,
    };
    await persistGoals([...goals, newGoal]);
  }, [goals, persistGoals, user]);

  const updateGoal = useCallback(async (id: string, updates: Partial<CharacterGoal>) => {
    await persistGoals(goals.map(g => g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g));
  }, [goals, persistGoals]);

  const deleteGoal = useCallback(async (id: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const { deleteGoalRows } = await import('../services/characterService');
      await deleteGoalRows(user.id, [id]);
      setGoals(goals.filter(g => g.id !== id));
      // Clean up connections where goal is source or target
      const updatedConns = connections.filter(c => c.sourceEntityId !== id && c.targetEntityId !== id);
      if (updatedConns.length !== connections.length) {
        await persistConnections(updatedConns);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [goals, connections, persistConnections, user]);

  // ── Challenges CRUD ──────────────────────────────────────
  const addChallenge = useCallback(async (input: Omit<CharacterChallenge, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newChallenge: CharacterChallenge = {
      ...input, id: uuid(), userId: user?.id ?? '', createdAt: now, updatedAt: now,
    };
    await persistChallenges([...characterChallenges, newChallenge]);
  }, [characterChallenges, persistChallenges, user]);

  const updateChallenge = useCallback(async (id: string, updates: Partial<CharacterChallenge>) => {
    await persistChallenges(characterChallenges.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
  }, [characterChallenges, persistChallenges]);

  const deleteChallenge = useCallback(async (id: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const { deleteChallengeRows } = await import('../services/characterService');
      await deleteChallengeRows(user.id, [id]);
      setCharacterChallenges(characterChallenges.filter(c => c.id !== id));
      // Clean up connections where challenge is source or target
      const updatedConns = connections.filter(c => c.sourceEntityId !== id && c.targetEntityId !== id);
      if (updatedConns.length !== connections.length) {
        await persistConnections(updatedConns);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [characterChallenges, connections, persistConnections, user]);

  // ── Identity Rules CRUD ──────────────────────────────────
  const addIdentityRule = useCallback(async (input: Omit<CharacterIdentityRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newRule: CharacterIdentityRule = {
      ...input, id: uuid(), userId: user?.id ?? '', createdAt: now, updatedAt: now,
    };
    await persistIdentityRules([...identityRules, newRule]);
  }, [identityRules, persistIdentityRules, user]);

  const updateIdentityRule = useCallback(async (id: string, updates: Partial<CharacterIdentityRule>) => {
    await persistIdentityRules(identityRules.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r));
  }, [identityRules, persistIdentityRules]);

  const deleteIdentityRule = useCallback(async (id: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const { deleteIdentityRuleRows } = await import('../services/characterService');
      await deleteIdentityRuleRows(user.id, [id]);
      setIdentityRules(identityRules.filter(r => r.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [identityRules, user]);

  // ── Connections CRUD ─────────────────────────────────────
  const addConnection = useCallback(async (input: Omit<CharacterConnection, 'id' | 'userId' | 'createdAt'>) => {
    const newConn: CharacterConnection = {
      ...input, id: uuid(), userId: user?.id ?? '', createdAt: new Date().toISOString(),
    };
    await persistConnections([...connections, newConn]);
  }, [connections, persistConnections, user]);

  const deleteConnection = useCallback(async (id: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const { deleteConnectionRows } = await import('../services/characterService');
      await deleteConnectionRows(user.id, [id]);
      setConnections(connections.filter(c => c.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [connections, user]);

  // ── Habit Completion & Logging ───────────────────────────
  const logHabitAction = useCallback(async (
    habitId: string,
    loggedDate: string,
    status: 'completed' | 'failed' | 'skipped',
    completedValue: number,
    note: string,
    source: string,
    linkedTaskId: string | null
  ) => {
    if (!user) return;
    setSaving(true);
    try {
      const result = await rpcCompleteHabit(habitId, user.id, loggedDate, status, completedValue, note, source, linkedTaskId);
      const habitResult = result as typeof result & { idempotent?: boolean };
      if (!result.error || habitResult.idempotent) {
        // Refresh local data to match server updates
        const { loadProfile, loadHabits, loadHabitLogs } = await import('../services/characterService');
        const [p, h, logs] = await Promise.all([
          loadProfile(user.id),
          loadHabits(user.id),
          loadHabitLogs(user.id),
        ]);
        if (p) setProfile(p);
        setHabits(h);
        setHabitLogs(logs);

        if (result.did_level_up) {
          const achievement = `Reached Level ${result.level}`;
          setAchievements(prev => prev.includes(achievement) ? prev : [...prev, achievement]);
          setRecentAchievement(achievement);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  const undoHabitAction = useCallback(async (logId: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const result = await rpcUndoHabitLog(logId, user.id);
      if (result.error) throw new Error(result.error);
      const { loadProfile, loadHabits, loadHabitLogs } = await import('../services/characterService');
      const [p, h, logs] = await Promise.all([
        loadProfile(user.id),
        loadHabits(user.id),
        loadHabitLogs(user.id),
      ]);
      if (p) setProfile(p);
      setHabits(h);
      setHabitLogs(logs);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  const completeHabit = useCallback(async (
    id: string,
    loggedDate?: string,
    status?: 'completed' | 'failed' | 'skipped',
    completedValue?: number,
    note?: string,
    source?: string,
    linkedTaskId?: string | null
  ) => {
    const habit = habits.find(h => h.id === id);
    if (!habit || !user) return;

    const finalDate = loggedDate || new Date().toISOString().split('T')[0];
    const finalStatus = status || 'completed';
    const finalValue = completedValue !== undefined ? completedValue : 1;

    // Check if it is already completed today and toggle (undo)
    const existingLog = habitLogs.find(l => l.habitId === id && l.loggedDate === finalDate && l.status === 'completed');
    if (existingLog) {
      await undoHabitAction(existingLog.id);

      // Revert the linked planner tasks too
      const linkedTasks = taskIntegrations.filter(i => i.characterHabitId === id);
      for (const link of linkedTasks) {
        const task = plannerTasks.find(t => t.id === link.plannerTaskId);
        if (task && task.status === 'done') {
          updatePlannerTask(link.plannerTaskId, { status: 'todo' });
          try {
            const wId = await resolveWorkspaceId();
            if (wId) {
              await cloudRunClient.plannerApi.updateTask(link.plannerTaskId, {
                workspaceId: wId,
                status: 'todo',
                completedAt: null
              });
            }
          } catch (e) {
            console.error('Failed to sync task reversion to backend:', e);
          }
        }
      }
      return;
    }

    await logHabitAction(id, finalDate, finalStatus, finalValue, note || '', source || 'user', linkedTaskId || null);

    // Auto-complete linked planner tasks if status is completed
    if (finalStatus === 'completed') {
      const linkedTasks = taskIntegrations.filter(i => i.characterHabitId === id);
      for (const link of linkedTasks) {
        const task = plannerTasks.find(t => t.id === link.plannerTaskId);
        if (task && task.status !== 'done') {
          updatePlannerTask(link.plannerTaskId, { status: 'done' });
          try {
            const wId = await resolveWorkspaceId();
            if (wId) {
              await cloudRunClient.plannerApi.updateTask(link.plannerTaskId, {
                workspaceId: wId,
                status: 'done',
                completedAt: new Date().toISOString()
              });
            }
          } catch (e) {
            console.error('Failed to sync task completion to backend:', e);
          }
        }
      }

      // Auto-generate tomorrow's task
      const autoGenLinks = linkedTasks.filter(l => l.autoGenerate);
      for (const link of autoGenLinks) {
        const existingTask = plannerTasks.find(t => t.id === link.plannerTaskId);
        if (existingTask && existingTask.status === 'done') {
          const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          addPlannerTask({
            title: `Habit: ${habit.title}`,
            status: 'todo', priority: 'medium', dueDate: tomorrow, goalId: '',
            estimatedMinutes: 10, tags: ['habit', 'character', `trait:${habit.linkedTraitId}`],
            source: 'local',
          });
        }
      }

      // Memory
      const streak = habits.find(h => h.id === id)?.currentStreak ?? 1;
      addMemoryItem({
        type: 'journal',
        title: `Completed habit: ${habit.title}`,
        content: `Completed "${habit.title}" — streak is now ${streak} days.`,
        relatedEntityIds: habit.linkedTraitId ? [habit.linkedTraitId] : [],
        tags: ['character', 'habit', habit.linkedTraitId ?? ''].filter(Boolean),
        source: 'local',
        importanceScore: 65 + Math.min(30, streak),
      });
    }
  }, [habits, user, taskIntegrations, plannerTasks, updatePlannerTask, addPlannerTask, addMemoryItem, logHabitAction, undoHabitAction, habitLogs]);

  // ── Action: Complete Quest ───────────────────────────────
  const completeQuest = useCallback(async (id: string) => {
    const quest = quests.find(q => q.id === id);
    if (!quest || !user) return;

    setSaving(true);
    try {
      const result = await rpcCompleteQuest(id, user.id);
      if (!result.error || (result as unknown as Record<string, unknown>).idempotent) {
        setQuests(prev => prev.map(q =>
          q.id === id ? {
            ...q, status: 'completed', completedAt: new Date().toISOString(),
          } : q
        ));
        setProfile(prev => prev ? {
          ...prev, totalXp: result.total_xp, currentLevel: result.level,
          currentLevelXp: result.current_level_xp, updatedAt: new Date().toISOString(),
        } : prev);

        if (result.did_level_up) {
          const achievement = `Reached Level ${result.level}`;
          setAchievements(prev => prev.includes(achievement) ? prev : [...prev, achievement]);
          setRecentAchievement(achievement);
        }
      }
    } catch {
      setQuests(prev => prev.map(q =>
        q.id === id ? { ...q, status: 'completed', completedAt: new Date().toISOString() } : q
      ));
    } finally {
      setSaving(false);
    }

    if (user) {
      addMemoryItem({
        type: 'journal', title: `Quest completed: ${quest.title}`,
        content: `Completed quest "${quest.title}" for +${quest.rewardXp} XP.`,
        relatedEntityIds: quest.linkedTraitIds,
        tags: ['character', 'quest', ...quest.linkedTraitIds],
        source: 'local', importanceScore: 75,
      });
    }
  }, [quests, user, addMemoryItem]);

  // ── Action: Attempt Challenge ────────────────────────────
  const attemptChallenge = useCallback(async (id: string, succeeded: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      if (succeeded) {
        const result = await rpcCompleteQuest(id, user.id);
        if (!result.error) {
          setQuests(prev => prev.map(q =>
            q.id === id ? { ...q, status: 'completed', completedAt: new Date().toISOString(), retryCount: q.retryCount + 1 } : q
          ));
          setProfile(prev => prev ? {
            ...prev, totalXp: result.total_xp, currentLevel: result.level,
            currentLevelXp: result.current_level_xp, updatedAt: new Date().toISOString(),
          } : prev);
        }
      } else {
        setQuests(prev => prev.map(q =>
          q.id === id ? { ...q, retryCount: q.retryCount + 1 } : q
        ));
      }
    } catch {
      setQuests(prev => prev.map(q =>
        q.id === id ? {
          ...q, retryCount: q.retryCount + 1,
          ...(succeeded ? { status: 'completed' as const, completedAt: new Date().toISOString() } : {}),
        } : q
      ));
    } finally {
      setSaving(false);
    }
  }, [user]);

  // ── Action: Attempt Boss Fight ───────────────────────────
  const attemptBossFight = useCallback(async (id: string, defeated: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      if (defeated) {
        const result = await rpcCompleteQuest(id, user.id);
        if (!result.error) {
          setQuests(prev => prev.map(q =>
            q.id === id ? { ...q, status: 'completed', completedAt: new Date().toISOString() } : q
          ));
          setProfile(prev => prev ? {
            ...prev, totalXp: result.total_xp, currentLevel: result.level,
            currentLevelXp: result.current_level_xp, updatedAt: new Date().toISOString(),
          } : prev);

          if (result.did_level_up) {
            const achievement = `Reached Level ${result.level}`;
            setAchievements(prev => prev.includes(achievement) ? prev : [...prev, achievement]);
            setRecentAchievement(achievement);
          }
        }
      }
    } catch {
      if (defeated) {
        setQuests(prev => prev.map(q =>
          q.id === id ? { ...q, status: 'completed', completedAt: new Date().toISOString() } : q
        ));
      }
    } finally {
      setSaving(false);
    }

    if (defeated) {
      const boss = quests.find(q => q.id === id);
      if (boss) {
        const achievement = `Defeated Boss: ${boss.title}`;
        setAchievements(prev => prev.includes(achievement) ? prev : [...prev, achievement]);
        setRecentAchievement(achievement);
      }
    }
  }, [user, quests]);

  // ── Action: Resist Bad Guy ───────────────────────────────
  const resistBadGuy = useCallback(async (id: string) => {
    const badGuy = badGuys.find(b => b.id === id);
    if (!badGuy || !user) return;

    setSaving(true);
    try {
      const result = await rpcResistBadGuy(id, user.id);
      if (!result.error) {
        setBadGuys(prev => prev.map(b =>
          b.id === id ? {
            ...b, occurrenceCount: b.occurrenceCount + 1, defeatedCount: b.defeatedCount + 1,
            lastOccurrenceAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          } : b
        ));
        setProfile(prev => prev ? {
          ...prev, totalXp: result.total_xp, currentLevel: result.level,
          currentLevelXp: result.current_level_xp, updatedAt: new Date().toISOString(),
        } : prev);
      }
    } catch {
      setBadGuys(prev => prev.map(b =>
        b.id === id ? {
          ...b, occurrenceCount: b.occurrenceCount + 1, defeatedCount: b.defeatedCount + 1,
          lastOccurrenceAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        } : b
      ));
    } finally {
      setSaving(false);
    }

    if (user) {
      addMemoryItem({
        type: 'journal', title: `Resisted: ${badGuy.title}`,
        content: `Successfully resisted "${badGuy.title}".`,
        relatedEntityIds: [], tags: ['character', 'badguy'],
        source: 'local', importanceScore: 70,
      });
    }
  }, [badGuys, user, addMemoryItem]);

  // ── Action: Give In to Bad Guy ───────────────────────────
  const giveInBadGuy = useCallback(async (id: string) => {
    const badGuy = badGuys.find(b => b.id === id);
    if (!badGuy || !user) return;

    setSaving(true);
    try {
      await rpcTriggerBadGuy(id, user.id);
    } catch { /* ignore */ }
    setBadGuys(prev => prev.map(b =>
      b.id === id ? {
        ...b, occurrenceCount: b.occurrenceCount + 1,
        lastOccurrenceAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      } : b
    ));
    setSaving(false);
  }, [badGuys, user]);

  // ── Action: Use Power-Up ─────────────────────────────────
  const usePowerUp = useCallback(async (id: string) => {
    const powerUp = powerUps.find(p => p.id === id);
    if (!powerUp || !user) return;

    setSaving(true);
    try {
      const result = await rpcUsePowerUp(id, user.id);
      if (!result.error) {
        setPowerUps(prev => prev.map(p =>
          p.id === id ? { ...p, usageCount: p.usageCount + 1, updatedAt: new Date().toISOString() } : p
        ));
        setProfile(prev => prev ? {
          ...prev, totalXp: result.total_xp, currentLevel: result.level,
          currentLevelXp: result.current_level_xp, updatedAt: new Date().toISOString(),
        } : prev);
      }
    } catch {
      setPowerUps(prev => prev.map(p =>
        p.id === id ? { ...p, usageCount: p.usageCount + 1, updatedAt: new Date().toISOString() } : p
      ));
    } finally {
      setSaving(false);
    }

    if (user) {
      addMemoryItem({
        type: 'journal', title: `Power-Up activated: ${powerUp.title}`,
        content: `Activated "${powerUp.title}" for ${powerUp.durationMinutes}min.`,
        relatedEntityIds: [], tags: ['character', 'powerup'],
        source: 'local', importanceScore: 60,
      });
    }
  }, [powerUps, user, addMemoryItem]);

  // ── Action: Trigger If-Then Rule ─────────────────────────
  const triggerIfThenRule = useCallback(async (id: string, followed: boolean) => {
    const rule = ifThenRules.find(r => r.id === id);
    if (!rule || !user) return;

    setSaving(true);
    try {
      const result = await rpcTriggerIfThen(id, user.id, followed);
      if (!result.error) {
        if (followed) {
          setProfile(prev => prev ? {
            ...prev, totalXp: result.total_xp, currentLevel: result.level,
            currentLevelXp: result.current_level_xp, updatedAt: new Date().toISOString(),
          } : prev);
        }
      }
    } catch { /* ignore */ }

    setIfThenRules(prev => prev.map(r =>
      r.id === id ? {
        ...r,
        successCount: followed ? r.successCount + 1 : r.successCount,
        failureCount: followed ? r.failureCount : r.failureCount + 1,
        updatedAt: new Date().toISOString(),
      } : r
    ));
    setSaving(false);
  }, [ifThenRules, user]);

  // ── Action: Complete Contract ────────────────────────────
  const completeContract = useCallback(async (id: string) => {
    const contract = contracts.find(c => c.id === id);
    if (!contract || !user) return;

    setSaving(true);
    try {
      const result = await rpcCompleteContract(id, user.id);
      if (!result.error || (result as unknown as Record<string, unknown>).idempotent) {
        setContracts(prev => prev.map(c =>
          c.id === id ? { ...c, completionStatus: 'completed', isActive: false, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : c
        ));
        setProfile(prev => prev ? {
          ...prev, totalXp: result.total_xp, currentLevel: result.level,
          currentLevelXp: result.current_level_xp, updatedAt: new Date().toISOString(),
        } : prev);
      }
    } catch {
      setContracts(prev => prev.map(c =>
        c.id === id ? { ...c, completionStatus: 'completed', isActive: false, completedAt: new Date().toISOString() } : c
      ));
    } finally {
      setSaving(false);
    }

    if (user) {
      addMemoryItem({
        type: 'journal', title: `Contract completed: ${contract.title}`,
        content: `Fulfilled accountability contract "${contract.title}".`,
        relatedEntityIds: [], tags: ['character', 'contract'],
        source: 'local', importanceScore: 80,
      });
    }
  }, [contracts, user, addMemoryItem]);

  // ── Action: Fail Contract ────────────────────────────────
  const failContract = useCallback(async (id: string) => {
    setContracts(prev => prev.map(c =>
      c.id === id ? { ...c, completionStatus: 'failed', isActive: false, updatedAt: new Date().toISOString() } : c
    ));
  }, []);

  // ── Integration linking ──────────────────────────────────
  const linkHabitToPlannerTask = useCallback(async (habitId: string, plannerTaskId: string, autoGenerate: boolean) => {
    if (!user) return;
    const newIntegration: CharacterTaskIntegration = { characterHabitId: habitId, plannerTaskId, autoGenerate };
    const updated = [...taskIntegrations.filter(i => i.plannerTaskId !== plannerTaskId), newIntegration];
    setTaskIntegrations(updated);
    await saveIntegrations(user.id, { taskIntegrations: updated, goalIntegrations, memoryIntegrations });
  }, [user, taskIntegrations, goalIntegrations, memoryIntegrations]);

  const unlinkHabitFromPlannerTask = useCallback(async (plannerTaskId: string) => {
    if (!user) return;
    const updated = taskIntegrations.filter(i => i.plannerTaskId !== plannerTaskId);
    setTaskIntegrations(updated);
    await saveIntegrations(user.id, { taskIntegrations: updated, goalIntegrations, memoryIntegrations });
  }, [user, taskIntegrations, goalIntegrations, memoryIntegrations]);

  const linkTraitToGoal = useCallback(async (traitId: string, goalId: string) => {
    if (!user) return;
    const existingLink = goalIntegrations.find(g => g.characterTraitId === traitId && g.goalId === goalId);
    if (existingLink) return;
    const newIntegration: CharacterGoalIntegration = { characterTraitId: traitId, goalId, mutuallyReinforcing: true };
    const updated = [...goalIntegrations, newIntegration];
    setGoalIntegrations(updated);
    await saveIntegrations(user.id, { taskIntegrations, goalIntegrations: updated, memoryIntegrations });
  }, [user, goalIntegrations, taskIntegrations, memoryIntegrations]);

  const unlinkTraitFromGoal = useCallback(async (goalId: string) => {
    if (!user) return;
    const updated = goalIntegrations.filter(g => g.goalId !== goalId);
    setGoalIntegrations(updated);
    await saveIntegrations(user.id, { taskIntegrations, goalIntegrations: updated, memoryIntegrations });
  }, [user, goalIntegrations, taskIntegrations, memoryIntegrations]);

  // ── Queries ──────────────────────────────────────────────
  const getPlannerTasksForHabit = useCallback((habitId: string) => {
    return taskIntegrations.filter(i => i.characterHabitId === habitId);
  }, [taskIntegrations]);

  const getGoalsForTrait = useCallback((traitId: string) => {
    return goalIntegrations.filter(i => i.characterTraitId === traitId);
  }, [goalIntegrations]);

  // ── AI Insights ──────────────────────────────────────────
  const generateAIInsights = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const result = await generateInsights({
        traits, habits, quests, badGuys,
        level, totalXp, currentStreak: profile?.currentStreak ?? 0,
      });
      if (result.insights.length > 0) {
        setAIInsights(result.insights);
      }
      if (result.adaptiveChallenges.length > 0) {
        const now = new Date().toISOString();
        const newQuests: CharacterQuest[] = result.adaptiveChallenges.map(ac => ({
          id: uuid(), userId: user.id, questType: 'ai_suggested' as const,
          title: ac.name, description: ac.description, whyItMatters: '',
          linkedTraitIds: ac.traitId ? [ac.traitId] : [],
          difficulty: ac.difficulty, estimatedDiscomfort: ac.difficulty,
          targetDate: null, checklistSteps: [], requiredProof: '', proofType: 'text',
          rewardXp: ac.xpReward, bonusConditions: [], failureRule: 'retry',
          retryCount: 0, status: 'active', source: 'ai',
          aiGenerationMetadata: {}, plannerTaskId: null, goalId: null,
          crmContactId: null, crmOpportunityId: null,
          completedAt: null, createdAt: now,
        }));
        const allQuests = [...quests, ...newQuests];
        setQuests(allQuests);
        const { saveQuests } = await import('../services/characterService');
        await saveQuests(user.id, allQuests);
      }
    } catch {
      // Silently fail — insights are non-critical
    } finally {
      setSaving(false);
    }
  }, [user, traits, habits, quests, badGuys, level, totalXp, profile]);

  // ── Character Coach ────────────────────────────────────────
  const sendCoachMessage = useCallback(async (req: CoachMessageRequest) => {
    return characterCoachClient.chat(req);
  }, []);

  const generateQuestWithCoach = useCallback(async (req: QuestGenerationRequest) => {
    return characterCoachClient.generateQuest(req);
  }, []);

  const generateLadderWithCoach = useCallback(async (req: LadderGenerationRequest) => {
    return characterCoachClient.generateLadder(req);
  }, []);

  const analyzeReflectionWithCoach = useCallback(async (req: ReflectionAnalysisRequest) => {
    return characterCoachClient.analyzeReflection(req);
  }, []);

  const getWeeklyReview = useCallback(async (req: WeeklyReviewRequest) => {
    return characterCoachClient.weeklyReview(req);
  }, []);

  const getDailyMission = useCallback(async (req: DailyMissionRequest) => {
    return characterCoachClient.dailyMission(req);
  }, []);

  const getAdaptiveSuggestion = useCallback(async (req: AdaptiveSuggestionRequest) => {
    return characterCoachClient.adaptiveSuggestion(req);
  }, []);

  // ── Integration: Brain context ────────────────────────────
  const buildBrainContextSummary = useCallback(() => {
    return summarizeCharacterContext(profile, traits, habits, quests, badGuys, powerUps, ifThenRules, contracts, ladders, reflections, seasons);
  }, [profile, traits, habits, quests, badGuys, powerUps, ifThenRules, contracts, ladders, reflections, seasons]);

  // ── Integration: Search ────────────────────────────────────
  const searchEntities = useCallback((query: string) => {
    return searchCharacterEntities(query, searchableEntities);
  }, [searchableEntities]);

  // ── Integration: Activity ──────────────────────────────────
  const logActivityEntry = useCallback((eventType: CharacterActivityEventType, entityType: string, entityId: string, note: string, xpDelta: number = 0, metadata: Record<string, unknown> = {}) => {
    const entry = buildActivityEntry(eventType, entityType, entityId, note, xpDelta, metadata);
    setCharacterActivityFeed(prev => [
      { eventType: entry.eventType, note: entry.note ?? '', createdAt: new Date().toISOString() },
      ...prev,
    ].slice(0, 50));
  }, []);

  // ── Integration: Commands ──────────────────────────────────
  const characterCommands = CHARACTER_COMMANDS;

  // Bidirectional planner task sync listener
  useEffect(() => {
    const handleTaskUpdated = async (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string; updates: Partial<PlannerTask>; task: PlannerTask }>;
      const { id, updates } = customEvent.detail;
      if (!user) return;

      const link = taskIntegrations.find(i => i.plannerTaskId === id);
      if (link) {
        const habit = habits.find(h => h.id === link.characterHabitId);
        if (habit) {
          const today = new Date().toISOString().split('T')[0];
          if (updates.status === 'done') {
            const alreadyLogged = habitLogs.some(l => l.habitId === habit.id && l.loggedDate === today && l.status === 'completed');
            if (!alreadyLogged) {
              await logHabitAction(habit.id, today, 'completed', 1, 'Completed via Planner task', 'planner', id);
            }
          } else if (updates.status === 'todo') {
            const logToDelete = habitLogs.find(l => l.habitId === habit.id && l.loggedDate === today);
            if (logToDelete) {
              await undoHabitAction(logToDelete.id);
            }
          }
        }
      }
    };

    window.addEventListener('planner-task-updated', handleTaskUpdated);
    return () => {
      window.removeEventListener('planner-task-updated', handleTaskUpdated);
    };
  }, [user, taskIntegrations, habits, habitLogs, logHabitAction, undoHabitAction]);

  // Bidirectional planner goal sync listener
  useEffect(() => {
    const handleGoalUpdated = async (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string; updates: Partial<Goal>; goal: Goal }>;
      const { id, updates, goal } = customEvent.detail;
      if (!user) return;

      const linkedGoal = goals.find(g => g.linkedMonthlyGoalId === id || g.linkedWeeklyGoalId === id);
      if (linkedGoal) {
        if (updates.status === 'completed' || goal.status === 'completed') {
          await updateGoal(linkedGoal.id, { status: 'completed', progressPercentage: 100 });
        } else {
          await updateGoal(linkedGoal.id, {
            status: goal.status === 'at_risk' ? 'active' : goal.status,
            progressPercentage: goal.progress
          });
        }
      }
    };

    window.addEventListener('planner-goal-updated', handleGoalUpdated);
    return () => {
      window.removeEventListener('planner-goal-updated', handleGoalUpdated);
    };
  }, [user, goals, updateGoal]);

  // ── Return ───────────────────────────────────────────────
  return {
    profile,
    traits, habits, quests, challenges, bossFights, badGuys, powerUps, ifThenRules,
    accountabilityContracts: contracts,
    ladders, reflections, seasons,
    goals,
    characterChallenges,
    identityRules,
    connections,
    habitLogs,
    taskIntegrations, goalIntegrations, memoryIntegrations,
    ui,
    loading, saving, error,
    apiAvailable: !!user,
    totalXp, level, levelTitle: levelInfo.title,
    xpToNextLevel: levelInfo.xpToNextLevel,
    currentStreak: profile?.currentStreak ?? 0,
    maxStreak: profile?.maxStreak ?? 0,
    achievements, aiInsights, adaptiveChallenges,
    recentAchievement, linkingGoalId,
    onboardingStatus: profile?.onboardingStatus ?? 'not_started',
    onboardingLoading,
    setSelectedTraitId, setSelectedHabitId, setSelectedQuestId,
    setSelectedChallengeId, setSelectedBossFightId, setSelectedBadGuyId,
    setSelectedPowerUpId, setSelectedRuleId, setSelectedContractId,
    refresh: loadData,
    runOnboarding,
    addTrait, updateTrait, deleteTrait,
    addHabit, updateHabit, deleteHabit, completeHabit, logHabitAction, undoHabitAction,
    addQuest, updateQuest, deleteQuest, completeQuest,
    addBadGuy, updateBadGuy, deleteBadGuy, resistBadGuy, giveInBadGuy,
    addPowerUp, updatePowerUp, deletePowerUp, usePowerUp,
    addIfThenRule, updateIfThenRule, deleteIfThenRule, triggerIfThenRule,
    addContract, updateContract, deleteContract, completeContract, failContract,
    addLadder, updateLadder, deleteLadder,
    addReflection, updateReflection, deleteReflection,
    addSeason, updateSeason, deleteSeason,
    updateProfile,
    addGoal, updateGoal, deleteGoal,
    addChallenge, updateChallenge, deleteChallenge,
    addIdentityRule, updateIdentityRule, deleteIdentityRule,
    addConnection, deleteConnection,
    attemptChallenge, attemptBossFight,
    earnXp,
    linkHabitToPlannerTask, unlinkHabitFromPlannerTask,
    linkTraitToGoal, unlinkTraitFromGoal,
    generateAIInsights,
    sendCoachMessage, generateQuestWithCoach, generateLadderWithCoach,
    analyzeReflectionWithCoach, getWeeklyReview, getDailyMission, getAdaptiveSuggestion,
    getPlannerTasksForHabit, getGoalsForTrait,
    dismissRecentAchievement,
    brainContext, buildBrainContextSummary,
    searchableEntities, searchEntities,
    logActivityEntry, characterActivityFeed,
    privacySettings, setPrivacySettings,
    characterCommands,
  };
};
