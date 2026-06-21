import { describe, it, expect } from 'vitest';
import { buildCharacterBrainContext, summarizeCharacterContext } from '../../services/characterBrainService';
import { buildNoteFromTrait, buildNoteFromReflection } from '../../services/characterNoteService';
import { buildHabitPlannerTask, buildQuestPlannerTask, buildExposurePlannerTask, buildReviewPlannerTask } from '../../services/characterPlannerBridge';
import { buildSeasonGoalContribution, buildTraitGoalContribution } from '../../services/characterGoalBridge';
import { buildAccountabilityLink, buildFollowUpQuest, buildSalesConfidenceReflectionLink } from '../../services/characterCrmBridge';
import { buildHabitReminder, buildQuestReminder, buildStreakMilestone } from '../../services/characterNotificationService';
import { buildActivityEntry, isHighValueEvent, shouldShowInFeed } from '../../services/characterActivityService';
import { canShareReflectionWithCRM, canAIAnalyzeReflection, filterPrivateReflections, DEFAULT_PRIVACY_SETTINGS } from '../../services/characterPrivacyService';
import { buildSearchableEntities, searchCharacterEntities, CHARACTER_COMMANDS } from '../../services/characterSearchService';
import { createTransaction, executeTransaction } from '../../services/characterTransactionService';
import type {
  CharacterProfile, CharacterTrait, CharacterHabit, CharacterQuest, CharacterBadGuy,
  ExposureLadder, CharacterReflection, CharacterSeason,
} from '../../types';

function makeTraits(): CharacterTrait[] {
  return [
    { id: 't1', userId: 'u1', name: 'Courage', description: 'Acting despite fear', icon: 'flame', visualKey: null, currentScore: 5, lifetimeXp: 1200, currentRank: 4, targetScore: 10, status: 'active', displayOrder: 1, createdAt: '', updatedAt: '' },
    { id: 't2', userId: 'u1', name: 'Discipline', description: 'Consistent action', icon: 'target', visualKey: null, currentScore: 4, lifetimeXp: 800, currentRank: 3, targetScore: 10, status: 'active', displayOrder: 2, createdAt: '', updatedAt: '' },
    { id: 't3', userId: 'u1', name: 'Communication', description: 'Clear expression', icon: 'message', visualKey: null, currentScore: 3, lifetimeXp: 400, currentRank: 2, targetScore: 10, status: 'active', displayOrder: 3, createdAt: '', updatedAt: '' },
  ];
}

function makeHabits(): CharacterHabit[] {
  const defaults = {
    category: '', selectedWeekdays: null, targetValue: 1, unit: 'times',
    priority: 'medium', status: 'active', reminderSettings: {}, notes: '', archiveStatus: false,
  };
  return [
    { id: 'h1', userId: 'u1', title: 'Daily cold shower', description: '', linkedTraitId: 't1', habitType: 'build', cue: '', expectedResponse: '', replacementBehavior: '', frequency: 'daily', scheduledDays: null, preferredTime: null, targetCount: 1, difficulty: 7, baseXp: 20, isActive: true, startDate: '', endDate: null, plannerTaskId: null, reminderEnabled: false, reminderTime: null, currentStreak: 14, maxStreak: 30, lastCompletedDate: '2026-06-18', ...defaults, createdAt: '', updatedAt: '' },
    { id: 'h2', userId: 'u1', title: 'Daily writing', description: '', linkedTraitId: 't2', habitType: 'build', cue: '', expectedResponse: '', replacementBehavior: '', frequency: 'daily', scheduledDays: null, preferredTime: null, targetCount: 1, difficulty: 3, baseXp: 10, isActive: true, startDate: '', endDate: null, plannerTaskId: null, reminderEnabled: false, reminderTime: null, currentStreak: 7, maxStreak: 14, lastCompletedDate: '2026-06-18', ...defaults, createdAt: '', updatedAt: '' },
  ];
}

function makeQuests(): CharacterQuest[] {
  return [
    { id: 'q1', userId: 'u1', questType: 'boss_fight', title: 'Ask for raise', description: 'Request salary review', whyItMatters: '', linkedTraitIds: ['t1', 't3'], difficulty: 8, estimatedDiscomfort: 9, targetDate: null, checklistSteps: [], requiredProof: '', proofType: 'text', rewardXp: 200, bonusConditions: [], failureRule: 'retry', retryCount: 0, status: 'active', source: 'user', aiGenerationMetadata: {}, plannerTaskId: null, goalId: null, crmContactId: null, crmOpportunityId: null, completedAt: null, createdAt: '' },
  ];
}

function makeBadGuys(): CharacterBadGuy[] {
  return [
    { id: 'bg1', userId: 'u1', title: 'Procrastination', triggerDescription: '', warningSigns: '', usualBehavior: '', costConsequence: '', replacementResponse: '', linkedRuleId: null, severity: 7, occurrenceCount: 10, defeatedCount: 6, lastOccurrenceAt: '2026-06-17', isActive: true, createdAt: '', updatedAt: '' },
  ];
}

function makeProfile(): CharacterProfile {
  return {
    id: 'p1', userId: 'u1', title: 'The Builder', identityStatement: 'I am someone who consistently takes action toward my goals.',
    currentLevel: 4, totalXp: 900, currentLevelXp: 100, selectedArchetype: null, activeSeasonId: null,
    onboardingStatus: 'completed', preferredDifficulty: 5, recoveryMode: false, currentStreak: 14, maxStreak: 30,
    currentScore: 0, selectedFocusAreas: [], activeDevelopmentPhase: '', avatarConfig: {},
    createdAt: '', updatedAt: '',
  };
}

// ── Brain Service ───────────────────────────────────────────
describe('characterBrainService', () => {
  it('builds context with active traits', () => {
    const ctx = buildCharacterBrainContext(makeProfile(), makeTraits(), [], [], [], [], [], [], [], [], []);
    expect(ctx.activeTraits).toHaveLength(3);
    expect(ctx.activeTraits[0].name).toBe('Courage');
    expect(ctx.level).toBe(4);
    expect(ctx.identityStatement).toContain('consistently takes action');
  });

  it('summarizes character context as readable text', () => {
    const summary = summarizeCharacterContext(makeProfile(), makeTraits(), makeHabits(), makeQuests(), makeBadGuys(), [], [], [], [], [], []);
    expect(summary).toContain('Identity:');
    expect(summary).toContain('Level 4');
    expect(summary).toContain('Courage');
    expect(summary).toContain('Daily cold shower');
    expect(summary).toContain('Procrastination');
  });

  it('handles empty data gracefully', () => {
    const ctx = buildCharacterBrainContext(null, [], [], [], [], [], [], [], [], [], []);
    expect(ctx.activeTraits).toHaveLength(0);
    expect(ctx.level).toBe(1);
    expect(ctx.identityStatement).toBe('');
  });
});

// ── Note Service ────────────────────────────────────────────
describe('characterNoteService', () => {
  it('builds trait insight note', () => {
    const trait = makeTraits()[0];
    const note = buildNoteFromTrait(trait, 'Courage grows with repeated action.');
    expect(note.type).toBe('trait_insight');
    expect(note.title).toContain('Courage');
    expect(note.tags).toContain('courage');
  });

  it('builds reflection note with privacy', () => {
    const reflection: CharacterReflection = {
      id: 'r1', userId: 'u1', preActionFear: 'Fear of rejection', postActionResult: '', whatHappened: 'I asked someone out', whatLearned: 'Rejection is not fatal',
      emotionalIntensityBefore: 8, emotionalIntensityAfter: 4, nextStep: 'Do it again', privacySetting: 'private',
      aiSummaryStatus: 'pending', linkedEntityType: null, linkedEntityId: null, createdAt: '2026-06-18T00:00:00.000Z', updatedAt: '',
    };
    const note = buildNoteFromReflection(reflection);
    expect(note.privacySetting).toBe('private');
    expect(note.title).toContain('6/18/2026');
    expect(note.tags).toContain('reflection');
  });
});

// ── Planner Bridge ──────────────────────────────────────────
describe('characterPlannerBridge', () => {
  it('builds habit planner task', () => {
    const habit = makeHabits()[0];
    const task = buildHabitPlannerTask(habit, '2026-06-20');
    expect(task.title).toContain('Daily cold shower');
    expect(task.tags).toContain('trait:t1');
    expect(task.estimatedMinutes).toBe(10);
  });

  it('builds quest planner task', () => {
    const quest = makeQuests()[0];
    const task = buildQuestPlannerTask(quest, '2026-06-25');
    expect(task.title).toContain('Ask for raise');
    expect(task.tags).toContain('boss_fight');
  });

  it('builds exposure planner task', () => {
    const ladder: ExposureLadder = { id: 'l1', userId: 'u1', title: 'Public speaking', description: 'Speak in front of groups', linkedTraitId: 't3', desiredEndBehavior: '', status: 'active', currentStep: 1, completionPercentage: 25, difficultyPolicy: 'graduated', aiAdaptationEnabled: false, steps: [], createdAt: '', updatedAt: '' };
    const task = buildExposurePlannerTask(ladder, 'Introduce self in meeting', '2026-06-22');
    expect(task.title).toContain('Public speaking');
    expect(task.tags).toContain('ladder');
  });

  it('builds review planner task', () => {
    const task = buildReviewPlannerTask('weekly', 'Habit consistency', '2026-06-21');
    expect(task.title).toContain('Weekly Review');
    expect(task.estimatedMinutes).toBe(15);
  });
});

// ── Goal Bridge ─────────────────────────────────────────────
describe('characterGoalBridge', () => {
  it('builds season goal contribution', () => {
    const season: CharacterSeason = { id: 's1', userId: 'u1', title: 'Summer of Courage', identityFocus: 'Bold action', targetTraitIds: ['t1', 't3'], targetHabitIds: [], targetLadderIds: [], startDate: '', endDate: null, status: 'active', openingXp: 500, earnedXp: 300, completionScore: null, finalReflection: '', createdAt: '', updatedAt: '' };
    const result = buildSeasonGoalContribution(season);
    expect(result.contribution).toContain('Bold action');
    expect(result.title).toContain('Summer of Courage');
  });

  it('builds trait goal contribution', () => {
    const trait = makeTraits()[0];
    const result = buildTraitGoalContribution(trait);
    expect(result.contribution).toContain('Level 4');
    expect(result.contribution).toContain('1200 lifetime XP');
  });
});

// ── CRM Bridge ──────────────────────────────────────────────
describe('characterCrmBridge', () => {
  it('builds accountability link', () => {
    const link = buildAccountabilityLink('Alice', 'c1');
    expect(link.role).toBe('accountability_partner');
    expect(link.note).toContain('Alice');
    expect(link.allowReflectionSync).toBe(false);
  });

  it('builds follow-up quest', () => {
    const link = buildFollowUpQuest('Bob', 'c2');
    expect(link.role).toBe('follow_up_quest');
  });

  it('builds sales reflection link with consent', () => {
    const reflection: CharacterReflection = { id: 'r1', userId: 'u1', preActionFear: '', postActionResult: '', whatHappened: 'Sales call went well', whatLearned: 'I can handle objections', emotionalIntensityBefore: 0, emotionalIntensityAfter: 0, nextStep: '', privacySetting: 'shared', aiSummaryStatus: 'pending', linkedEntityType: null, linkedEntityId: null, createdAt: '', updatedAt: '' };
    const link = buildSalesConfidenceReflectionLink(reflection, 'Carol', 'c3');
    expect(link.allowReflectionSync).toBe(true);
    expect(link.note).toContain('Carol');
  });
});

// ── Notification Service ────────────────────────────────────
describe('characterNotificationService', () => {
  it('builds habit reminder', () => {
    const habit = makeHabits()[0];
    const n = buildHabitReminder(habit);
    expect(n.type).toBe('habit_reminder');
    expect(n.message).toContain('Daily cold shower');
    expect(n.actionable).toBe(true);
  });

  it('builds quest reminder', () => {
    const quest = makeQuests()[0];
    const n = buildQuestReminder(quest);
    expect(n.type).toBe('upcoming_quest');
    expect(n.entityType).toBe('quest');
  });

  it('builds streak milestone', () => {
    const n = buildStreakMilestone(30);
    expect(n.message).toContain('30-day streak');
    expect(n.actionable).toBe(false);
  });
});

// ── Activity Service ────────────────────────────────────────
describe('characterActivityService', () => {
  it('classifies high-value events', () => {
    expect(isHighValueEvent('level_increased')).toBe(true);
    expect(isHighValueEvent('boss_fight_completed')).toBe(true);
    expect(isHighValueEvent('bad_guy_resisted')).toBe(false);
  });

  it('filters feed-worthy events', () => {
    expect(shouldShowInFeed('level_increased', 50)).toBe(true);
    expect(shouldShowInFeed('bad_guy_resisted', 30)).toBe(false);
    expect(shouldShowInFeed('bad_guy_resisted', 80)).toBe(true);
  });

  it('builds activity entry', () => {
    const entry = buildActivityEntry('level_increased', 'profile', 'p1', 'Reached Level 5!', 500, { newLevel: 5 });
    expect(entry.eventType).toBe('level_increased');
    expect(entry.xpDelta).toBe(500);
    expect(entry.metadata.newLevel).toBe(5);
  });
});

// ── Privacy Service ─────────────────────────────────────────
describe('characterPrivacyService', () => {
  const settings = DEFAULT_PRIVACY_SETTINGS;

  it('blocks private reflections from CRM sharing', () => {
    const ref: CharacterReflection = { id: 'r1', userId: 'u1', preActionFear: '', postActionResult: '', whatHappened: '', whatLearned: '', emotionalIntensityBefore: 0, emotionalIntensityAfter: 0, nextStep: '', privacySetting: 'private', aiSummaryStatus: 'pending', linkedEntityType: null, linkedEntityId: null, createdAt: '', updatedAt: '' };
    expect(canShareReflectionWithCRM(ref, settings)).toBe(false);
  });

  it('allows public reflections with CRM enabled', () => {
    const ref: CharacterReflection = { ...makeProfile() as unknown as CharacterReflection, privacySetting: 'public', id: 'r2', userId: 'u1', preActionFear: '', postActionResult: '', whatHappened: 'something', whatLearned: '', emotionalIntensityBefore: 0, emotionalIntensityAfter: 0, nextStep: '', aiSummaryStatus: 'pending', linkedEntityType: null, linkedEntityId: null, createdAt: '', updatedAt: '' };
    const s = { ...settings, crmSharingEnabled: true };
    expect(canShareReflectionWithCRM(ref, s)).toBe(true);
  });

  it('blocks AI analysis without consent', () => {
    const ref: CharacterReflection = { id: 'r3', userId: 'u1', preActionFear: '', postActionResult: '', whatHappened: '', whatLearned: '', emotionalIntensityBefore: 0, emotionalIntensityAfter: 0, nextStep: '', privacySetting: 'shared', aiSummaryStatus: 'pending', linkedEntityType: null, linkedEntityId: null, createdAt: '', updatedAt: '' };
    expect(canAIAnalyzeReflection(ref, settings)).toBe(false);
  });

  it('filters private reflections from lists', () => {
    const refs: CharacterReflection[] = [
      { id: 'r1', userId: 'u1', preActionFear: '', postActionResult: '', whatHappened: '', whatLearned: '', emotionalIntensityBefore: 0, emotionalIntensityAfter: 0, nextStep: '', privacySetting: 'private', aiSummaryStatus: 'pending', linkedEntityType: null, linkedEntityId: null, createdAt: '', updatedAt: '' },
      { id: 'r2', userId: 'u1', preActionFear: '', postActionResult: '', whatHappened: '', whatLearned: '', emotionalIntensityBefore: 0, emotionalIntensityAfter: 0, nextStep: '', privacySetting: 'public', aiSummaryStatus: 'pending', linkedEntityType: null, linkedEntityId: null, createdAt: '', updatedAt: '' },
    ];
    expect(filterPrivateReflections(refs, settings)).toHaveLength(1);
  });
});

// ── Search Service ──────────────────────────────────────────
describe('characterSearchService', () => {
  it('builds searchable entities from all character data', () => {
    const entities = buildSearchableEntities(makeTraits(), makeHabits(), makeQuests(), makeBadGuys(), [], [], [], [], [], []);
    expect(entities.some((e: { type: string; title: string }) => e.type === 'trait' && e.title === 'Courage')).toBe(true);
    expect(entities.some((e: { type: string; title: string }) => e.type === 'habit' && e.title === 'Daily cold shower')).toBe(true);
    expect(entities.some((e: { type: string; title: string }) => e.type === 'quest' && e.title === 'Ask for raise')).toBe(true);
    expect(entities.some((e: { type: string; title: string }) => e.type === 'bad_guy' && e.title === 'Procrastination')).toBe(true);
  });

  it('searches by title', () => {
    const entities = buildSearchableEntities(makeTraits(), makeHabits(), [], [], [], [], [], [], [], []);
    const results = searchCharacterEntities('courage', entities);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Courage');
  });

  it('searches by tags', () => {
    const entities = buildSearchableEntities(makeTraits(), [], [], [], [], [], [], [], [], []);
    const results = searchCharacterEntities('trait', entities);
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it('returns empty for no match', () => {
    const entities = buildSearchableEntities(makeTraits(), [], [], [], [], [], [], [], [], []);
    const results = searchCharacterEntities('zzzznotfound', entities);
    expect(results).toHaveLength(0);
  });

  it('includes all command actions', () => {
    expect(CHARACTER_COMMANDS.length).toBeGreaterThanOrEqual(7);
    expect(CHARACTER_COMMANDS.some((c: { id: string }) => c.id === 'char_create_quest')).toBe(true);
    expect(CHARACTER_COMMANDS.some((c: { id: string }) => c.id === 'char_ask_coach')).toBe(true);
  });
});

// ── Transaction Service ─────────────────────────────────────
describe('characterTransactionService', () => {
  it('creates transaction with pending status', () => {
    const t = createTransaction('u1', 'complete_habit', { habitId: 'h1' });
    expect(t.status).toBe('pending');
    expect(t.userId).toBe('u1');
    expect(t.type).toBe('complete_habit');
  });

  it('executes successful transaction', async () => {
    const t = createTransaction('u1', 'test', {});
    const result = await executeTransaction(t, async () => ({ success: true }));
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ success: true });
    expect(t.status).toBe('committed');
  });

  it('executes failed transaction and rolls back', async () => {
    const t = createTransaction('u1', 'test', {});
    const result = await executeTransaction(t, async () => { throw new Error('DB error'); });
    expect(result.success).toBe(false);
    expect(result.error).toBe('DB error');
    expect(t.status).toBe('rolled_back');
  });
});
