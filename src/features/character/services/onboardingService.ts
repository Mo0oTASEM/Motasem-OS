import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '../../../lib/supabase/client';
import { DEFAULT_POWER_UPS, DEFAULT_TRAIT_NAMES, TRAIT_DESCRIPTIONS } from '../types';
import type { CharacterTrait, CharacterHabit, CharacterBadGuy, CharacterPowerUp, CharacterIfThenRule, CharacterQuest } from '../types';

function getSupabase(): SupabaseClient | null {
  return getSupabaseBrowserClient();
}

function newId(): string {
  return crypto.randomUUID();
}

// ── Starter traits ──────────────────────────────────────────
function buildStarterTraits(userId: string): CharacterTrait[] {
  return DEFAULT_TRAIT_NAMES.map((name, i) => ({
    id: newId(),
    userId,
    name,
    description: TRAIT_DESCRIPTIONS[name] || '',
    icon: 'star',
    visualKey: null,
    currentScore: 1,
    lifetimeXp: 0,
    currentRank: 1,
    targetScore: 10,
    status: 'active' as const,
    displayOrder: i + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

// ── Starter habits with healthy defaults ─────────────────────
function buildStarterHabits(userId: string, traitIds: Record<string, string>): CharacterHabit[] {
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  return [
    {
      id: newId(), userId, title: 'Daily Social Micro-Challenge',
      description: 'Do one small social action today — say hi to a stranger, ask someone how their day is, or make eye contact and smile.',
      linkedTraitId: traitIds['Social Confidence'] || null,
      habitType: 'build', cue: 'First hour of my day', expectedResponse: 'Increase social initiative',
      replacementBehavior: 'Scroll social media → message one person', frequency: 'daily',
      scheduledDays: null, preferredTime: '09:00', targetCount: 1, difficulty: 2, baseXp: 15,
      isActive: true, startDate: today, endDate: null, plannerTaskId: null,
      reminderEnabled: true, reminderTime: '09:00', currentStreak: 0, maxStreak: 0, lastCompletedDate: null,
      category: 'social', selectedWeekdays: null, targetValue: 1, unit: 'action', priority: 'medium',
      status: 'active', reminderSettings: {}, notes: '', archiveStatus: false,
      createdAt: now, updatedAt: now,
    },
    {
      id: newId(), userId, title: 'Stable Sleep Routine',
      description: 'Set a consistent bedtime and wake time. No phone 30 min before bed.',
      linkedTraitId: traitIds['Discipline'] || null,
      habitType: 'build', cue: '30 min before planned bedtime', expectedResponse: 'Better sleep, better discipline',
      replacementBehavior: 'Phone scrolling → read a physical book', frequency: 'daily',
      scheduledDays: null, preferredTime: '22:00', targetCount: 1, difficulty: 3, baseXp: 20,
      isActive: true, startDate: today, endDate: null, plannerTaskId: null,
      reminderEnabled: true, reminderTime: '21:30', currentStreak: 0, maxStreak: 0, lastCompletedDate: null,
      category: 'discipline', selectedWeekdays: null, targetValue: 1, unit: 'action', priority: 'high',
      status: 'active', reminderSettings: {}, notes: '', archiveStatus: false,
      createdAt: now, updatedAt: now,
    },
    {
      id: newId(), userId, title: 'Weekly Content Publishing',
      description: 'Publish one piece of content this week — a post, a video, a tweet, or a newsletter.',
      linkedTraitId: traitIds['Courage'] || null,
      habitType: 'build', cue: 'Sunday planning session', expectedResponse: 'Overcome visibility fear',
      replacementBehavior: 'Perfectionism → publish imperfectly', frequency: 'weekly',
      scheduledDays: [0], preferredTime: '12:00', targetCount: 1, difficulty: 4, baseXp: 50,
      isActive: true, startDate: today, endDate: null, plannerTaskId: null,
      reminderEnabled: true, reminderTime: '10:00', currentStreak: 0, maxStreak: 0, lastCompletedDate: null,
      category: 'courage', selectedWeekdays: [0], targetValue: 1, unit: 'action', priority: 'medium',
      status: 'active', reminderSettings: {}, notes: '', archiveStatus: false,
      createdAt: now, updatedAt: now,
    },
    {
      id: newId(), userId, title: 'Sales Outreach Attempt',
      description: 'Reach out to one potential client, send a follow-up, or pitch your service.',
      linkedTraitId: traitIds['Sales Confidence'] || null,
      habitType: 'build', cue: 'After morning coffee', expectedResponse: 'Build sales muscle',
      replacementBehavior: 'Checking emails → sending a pitch', frequency: 'daily',
      scheduledDays: [1, 2, 3, 4, 5], preferredTime: '10:00', targetCount: 1, difficulty: 4, baseXp: 40,
      isActive: true, startDate: today, endDate: null, plannerTaskId: null,
      reminderEnabled: true, reminderTime: '10:00', currentStreak: 0, maxStreak: 0, lastCompletedDate: null,
      category: 'sales', selectedWeekdays: [1, 2, 3, 4, 5], targetValue: 1, unit: 'outreach', priority: 'high',
      status: 'active', reminderSettings: {}, notes: '', archiveStatus: false,
      createdAt: now, updatedAt: now,
    },
  ];
}

// ── Starter power-ups ───────────────────────────────────────
function buildStarterPowerUps(userId: string): CharacterPowerUp[] {
  const now = new Date().toISOString();
  return DEFAULT_POWER_UPS.map(p => ({
    id: newId(),
    userId,
    title: p.title,
    description: p.description,
    durationMinutes: p.durationMinutes,
    category: p.category,
    instructions: p.instructions,
    linkedBadGuyIds: [],
    usageCount: 0,
    effectivenessRating: 0,
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
  }));
}

// ── Starter if-then rules ───────────────────────────────────
function buildStarterRules(userId: string, badGuyIds: Record<string, string>): CharacterIfThenRule[] {
  const now = new Date().toISOString();

  return [
    {
      id: newId(), userId, triggerCondition: 'I find myself opening Instagram/TikTok during work hours',
      responseAction: 'I close the app immediately and open the smallest next task on my list',
      linkedTraitId: null, linkedBadGuyId: badGuyIds['Endless Reels'] || null,
      isActive: true, successCount: 0, failureCount: 0, effectivenessScore: 0,
      createdAt: now, updatedAt: now,
    },
    {
      id: newId(), userId, triggerCondition: 'I feel the urge to escape a social interaction',
      responseAction: 'I ask one follow-up question to the person I\'m talking to',
      linkedTraitId: null, linkedBadGuyId: badGuyIds['Social Avoidance'] || null,
      isActive: true, successCount: 0, failureCount: 0, effectivenessScore: 0,
      createdAt: now, updatedAt: now,
    },
    {
      id: newId(), userId, triggerCondition: 'I feel angry or emotionally reactive',
      responseAction: 'I delay any permanent decisions and write a neutral observation of what happened',
      linkedTraitId: null, linkedBadGuyId: badGuyIds['Emotional Reactivity'] || null,
      isActive: true, successCount: 0, failureCount: 0, effectivenessScore: 0,
      createdAt: now, updatedAt: now,
    },
    {
      id: newId(), userId, triggerCondition: 'I catch myself overthinking before a social action',
      responseAction: 'I count down from 3 and move my body before my brain can object',
      linkedTraitId: null, linkedBadGuyId: badGuyIds['Overthinking'] || null,
      isActive: true, successCount: 0, failureCount: 0, effectivenessScore: 0,
      createdAt: now, updatedAt: now,
    },
  ];
}

// ── Starter bad guys ────────────────────────────────────────
function buildStarterBadGuys(userId: string): CharacterBadGuy[] {
  const now = new Date().toISOString();
  return [
    {
      id: newId(), userId, title: 'Endless Reels',
      triggerDescription: 'Boredom, stress, or procrastination triggers opening short-form video apps',
      warningSigns: 'Picking up phone without purpose, telling self "just 5 minutes"',
      usualBehavior: 'Scroll Instagram/TikTok for 30+ minutes during work time',
      costConsequence: 'Loses 30-60 min of productive time, reduces attention span, feeds avoidance',
      replacementResponse: 'Close app, stand up, do one small physical action, then open work task',
      linkedRuleId: null, severity: 4, occurrenceCount: 0, defeatedCount: 0, lastOccurrenceAt: null,
      isActive: true, createdAt: now, updatedAt: now,
    },
    {
      id: newId(), userId, title: 'Sleeping Late',
      triggerDescription: 'Staying up late (reels, gaming, overthinking) leads to waking up late',
      warningSigns: 'Not setting an alarm, snoozing multiple times, staying in bed after waking',
      usualBehavior: 'Wake up 1-2 hours later than planned, rush morning routine',
      costConsequence: 'Lost morning hours, reactive rather than intentional day',
      replacementResponse: 'Set phone across the room, go to bed at scheduled time, place workout clothes out',
      linkedRuleId: null, severity: 3, occurrenceCount: 0, defeatedCount: 0, lastOccurrenceAt: null,
      isActive: true, createdAt: now, updatedAt: now,
    },
    {
      id: newId(), userId, title: 'Difficult Conversation Avoidance',
      triggerDescription: 'A conflict or uncomfortable truth needs to be addressed',
      warningSigns: 'Delaying message/call, justifying delay as "timing", feeling tightness in chest',
      usualBehavior: 'Avoid the conversation until it escalates or becomes urgent',
      costConsequence: 'Relationship strain, resentment builds, problem grows',
      replacementResponse: 'Write key points, send a brief message to schedule the conversation',
      linkedRuleId: null, severity: 4, occurrenceCount: 0, defeatedCount: 0, lastOccurrenceAt: null,
      isActive: true, createdAt: now, updatedAt: now,
    },
    {
      id: newId(), userId, title: 'Gaming Escape',
      triggerDescription: 'Stress, boredom, or feeling overwhelmed triggers gaming',
      warningSigns: 'Thinking about gaming during work, rushing tasks to "earn" game time',
      usualBehavior: 'Play for hours, lose track of time, neglect responsibilities',
      costConsequence: 'Lost productivity, late sleep, guilt, reinforces avoidance pattern',
      replacementResponse: 'Set timer for 30 min max, complete one meaningful task first, leave device in another room',
      linkedRuleId: null, severity: 3, occurrenceCount: 0, defeatedCount: 0, lastOccurrenceAt: null,
      isActive: true, createdAt: now, updatedAt: now,
    },
    {
      id: newId(), userId, title: 'Overthinking Before Social Action',
      triggerDescription: 'Facing a social situation where outcome is uncertain',
      warningSigns: 'Replaying scenarios in head, waiting for "perfect" moment, analyzing past interactions',
      usualBehavior: 'Talk self out of taking action, miss the opportunity',
      costConsequence: 'Missed connections, reinforces social anxiety, regret',
      replacementResponse: 'Use 3-2-1 rule: count down from 3 and move before brain can object',
      linkedRuleId: null, severity: 4, occurrenceCount: 0, defeatedCount: 0, lastOccurrenceAt: null,
      isActive: true, createdAt: now, updatedAt: now,
    },
    {
      id: newId(), userId, title: 'Emotional Reactivity',
      triggerDescription: 'Feeling criticized, rejected, or challenged triggers defensive anger',
      warningSigns: 'Rising body heat, racing thoughts, urge to respond immediately',
      usualBehavior: 'Send harsh messages, make impulsive decisions, say things you regret',
      costConsequence: 'Damaged relationships, reputation harm, regret',
      replacementResponse: 'Pause, write the observation neutrally, delay response by 24 hours',
      linkedRuleId: null, severity: 5, occurrenceCount: 0, defeatedCount: 0, lastOccurrenceAt: null,
      isActive: true, createdAt: now, updatedAt: now,
    },
  ];
}

// ── Starter quests ──────────────────────────────────────────
function buildStarterQuests(userId: string, traitIds: Record<string, string>): CharacterQuest[] {
  const now = new Date().toISOString();
  return [
    {
      id: newId(), userId, questType: 'exposure', title: 'Ask a Stranger for Directions',
      description: 'Approach someone on the street and ask for directions to a place you already know.',
      whyItMatters: 'Builds comfort with initiating conversation with strangers',
      linkedTraitIds: [traitIds['Courage'] || '', traitIds['Social Confidence'] || ''].filter(Boolean),
      difficulty: 3, estimatedDiscomfort: 6, targetDate: null,
      checklistSteps: [
        { order: 1, description: 'Pick a busy area', isDone: false },
        { order: 2, description: 'Approach someone who looks approachable', isDone: false },
        { order: 3, description: 'Ask for directions', isDone: false },
        { order: 4, description: 'Thank them and reflect on how it felt', isDone: false },
      ],
      requiredProof: 'Write 2-3 sentences about what happened', proofType: 'text',
      rewardXp: 75, bonusConditions: [], failureRule: 'retry', retryCount: 0,
      status: 'active', source: 'system', aiGenerationMetadata: {},
      plannerTaskId: null, goalId: null, crmContactId: null, crmOpportunityId: null,
      completedAt: null, createdAt: now,
    },
    {
      id: newId(), userId, questType: 'reflection', title: 'First Week Reflection',
      description: 'Write a short reflection on your first week using the Character system.',
      whyItMatters: 'Builds self-awareness and reinforces the habit of reflection',
      linkedTraitIds: [traitIds['Consistency'] || '', traitIds['Discipline'] || ''].filter(Boolean),
      difficulty: 1, estimatedDiscomfort: 2, targetDate: null,
      checklistSteps: [
        { order: 1, description: 'Open a blank note', isDone: false },
        { order: 2, description: 'Write what felt easy and what felt hard', isDone: false },
        { order: 3, description: 'Write one thing you want to improve next week', isDone: false },
      ],
      requiredProof: 'Submit the reflection text', proofType: 'text',
      rewardXp: 30, bonusConditions: [], failureRule: 'retry', retryCount: 0,
      status: 'active', source: 'system', aiGenerationMetadata: {},
      plannerTaskId: null, goalId: null, crmContactId: null, crmOpportunityId: null,
      completedAt: null, createdAt: now,
    },
  ];
}

// ── Main initializer ────────────────────────────────────────

export async function runCharacterOnboarding(
  userId: string,
): Promise<{ success: boolean; errors: string[] }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const errors: string[] = [];

  try {
    // 1. Ensure profile exists with onboarding in_progress
    const { error: profileError } = await supabase.from('character_profiles').upsert({
      user_id: userId,
      onboarding_status: 'in_progress',
    }, { onConflict: 'user_id' });
    if (profileError) errors.push(`Profile: ${profileError.message}`);

    // 2. Create starter traits
    const traits = buildStarterTraits(userId);
    const traitRows = traits.map(t => ({
      id: t.id, user_id: userId,
      name: t.name, description: t.description, icon: t.icon,
      current_score: t.currentScore, lifetime_xp: t.lifetimeXp,
      current_rank: t.currentRank, target_score: t.targetScore,
      status: t.status, display_order: t.displayOrder,
    }));
    const { error: traitError } = await supabase.from('character_traits').upsert(traitRows);
    if (traitError) errors.push(`Traits: ${traitError.message}`);

    // Build trait name -> ID map for linking
    const traitIdMap: Record<string, string> = {};
    for (const t of traits) {
      traitIdMap[t.name] = t.id;
    }

    // 3. Create starter bad guys
    const badGuys = buildStarterBadGuys(userId);
    const badGuyRows = badGuys.map(b => ({
      id: b.id, user_id: userId,
      title: b.title, trigger_description: b.triggerDescription,
      warning_signs: b.warningSigns, usual_behavior: b.usualBehavior,
      cost_consequence: b.costConsequence, replacement_response: b.replacementResponse,
      severity: b.severity, is_active: b.isActive, occurrence_count: 0, defeated_count: 0,
    }));
    const { error: bgError } = await supabase.from('character_bad_guys').upsert(badGuyRows);
    if (bgError) errors.push(`BadGuys: ${bgError.message}`);

    // Build bad guy name -> ID map
    const badGuyIdMap: Record<string, string> = {};
    for (const bg of badGuys) {
      badGuyIdMap[bg.title] = bg.id;
    }

    // 4. Create starter if-then rules (needs bad guy IDs)
    const rules = buildStarterRules(userId, badGuyIdMap);
    const ruleRows = rules.map(r => ({
      id: r.id, user_id: userId,
      trigger_condition: r.triggerCondition, response_action: r.responseAction,
      linked_bad_guy_id: r.linkedBadGuyId, is_active: r.isActive,
      success_count: 0, failure_count: 0, effectiveness_score: 0,
    }));
    const { error: ruleError } = await supabase.from('character_if_then_rules').upsert(ruleRows);
    if (ruleError) errors.push(`IfThenRules: ${ruleError.message}`);

    // Link bad guys to their rules (update linked_rule_id)
    // First rule is for Endless Reels, second for Social Avoidance (not a bad guy we created)
    // Map rules to bad guys
    const ruleToBadGuy: Array<[string, string]> = [
      [rules[0].id, badGuyIdMap['Endless Reels']!],
      [rules[2].id, badGuyIdMap['Emotional Reactivity']!],
      [rules[3].id, badGuyIdMap['Overthinking Before Social Action']!],
    ].filter((pair): pair is [string, string] => Boolean(pair[1]));

    for (const [ruleId, bgId] of ruleToBadGuy) {
      const { error: linkErr } = await supabase
        .from('character_bad_guys')
        .update({ linked_rule_id: ruleId })
        .eq('id', bgId);
      if (linkErr) errors.push(`BadGuyRuleLink: ${linkErr.message}`);
    }

    // 5. Create starter habits
    const habits = buildStarterHabits(userId, traitIdMap);
    const habitRows = habits.map(h => ({
      id: h.id, user_id: userId,
      title: h.title, description: h.description,
      linked_trait_id: h.linkedTraitId, habit_type: h.habitType,
      cue: h.cue, expected_response: h.expectedResponse,
      replacement_behavior: h.replacementBehavior,
      frequency: h.frequency, scheduled_days: h.scheduledDays,
      preferred_time: h.preferredTime, target_count: h.targetCount,
      difficulty: h.difficulty, base_xp: h.baseXp, is_active: h.isActive,
      start_date: h.startDate, end_date: h.endDate,
      reminder_enabled: h.reminderEnabled, reminder_time: h.reminderTime,
      current_streak: 0, max_streak: 0,
      category: h.category, selected_weekdays: h.selectedWeekdays,
      target_value: h.targetValue, unit: h.unit,
      priority: h.priority, status: h.status,
      reminder_settings: h.reminderSettings, notes: h.notes,
      archive_status: h.archiveStatus,
    }));
    const { error: habitError } = await supabase.from('character_habits').upsert(habitRows);
    if (habitError) errors.push(`Habits: ${habitError.message}`);

    // 6. Create starter power-ups
    const powerUps = buildStarterPowerUps(userId);
    const puRows = powerUps.map(p => ({
      id: p.id, user_id: userId,
      title: p.title, description: p.description,
      duration_minutes: p.durationMinutes, category: p.category,
      instructions: p.instructions, usage_count: 0, effectiveness_rating: 0, is_favorite: false,
    }));
    const { error: puError } = await supabase.from('character_power_ups').upsert(puRows);
    if (puError) errors.push(`PowerUps: ${puError.message}`);

    // 7. Create starter quests
    const quests = buildStarterQuests(userId, traitIdMap);
    const questRows = quests.map(q => ({
      id: q.id, user_id: userId,
      quest_type: q.questType, title: q.title, description: q.description,
      why_it_matters: q.whyItMatters,
      linked_trait_ids: q.linkedTraitIds,
      difficulty: q.difficulty, estimated_discomfort: q.estimatedDiscomfort,
      checklist_steps: q.checklistSteps,
      required_proof: q.requiredProof, proof_type: q.proofType,
      reward_xp: q.rewardXp, status: q.status, source: q.source,
      failure_rule: q.failureRule,
    }));
    const { error: questError } = await supabase.from('character_quests').upsert(questRows);
    if (questError) errors.push(`Quests: ${questError.message}`);

    // 8. Mark onboarding complete
    const { error: completeError } = await supabase
      .from('character_profiles')
      .update({ onboarding_status: 'completed' })
      .eq('user_id', userId);
    if (completeError) errors.push(`OnboardingComplete: ${completeError.message}`);

    return { success: errors.length === 0, errors };
  } catch (err) {
    return { success: false, errors: [(err as Error).message] };
  }
}
