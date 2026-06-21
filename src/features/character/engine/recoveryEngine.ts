import type { CharacterHabit, CharacterQuest, ActivityLogEntry } from '../types';

export interface RecoveryState {
  isActive: boolean;
  dailyRequirement: number;
  suggestedActions: RecoveryAction[];
  pausedChallenges: number;
  cooldownHoursRemaining: number;
  eligible: boolean;
  cooldownActive: boolean;
}

export interface RecoveryAction {
  type: 'habit' | 'reflection' | 'movement' | 'prayer' | 'next_task';
  title: string;
  description: string;
  estimatedMinutes: number;
  entityId?: string;
}

const RECOVERY_COOLDOWN_HOURS = 48;
const MIN_RECENT_ACTIVITY = 1;

export function getRecoveryState(
  profileRecoveryMode: boolean,
  recentActivity: ActivityLogEntry[],
  habits: CharacterHabit[],
  quests: CharacterQuest[],
  lastToggleDate?: string,
): RecoveryState {
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const recentCount = recentActivity.filter(
    l => new Date(l.createdAt).getTime() > sevenDaysAgo
  ).length;

  const eligible = recentCount >= MIN_RECENT_ACTIVITY;

  let cooldownHoursRemaining = 0;
  let cooldownActive = false;

  if (lastToggleDate) {
    const hoursSince = (Date.now() - new Date(lastToggleDate).getTime()) / 3600000;
    if (hoursSince < RECOVERY_COOLDOWN_HOURS) {
      cooldownActive = true;
      cooldownHoursRemaining = Math.ceil(RECOVERY_COOLDOWN_HOURS - hoursSince);
    }
  }

  const pausedChallenges = quests.filter(
    q => q.status === 'active' && q.questType !== 'standard',
  ).length;

  return {
    isActive: profileRecoveryMode,
    dailyRequirement: profileRecoveryMode ? 1 : 3,
    suggestedActions: getSuggestedActions(profileRecoveryMode, habits),
    pausedChallenges,
    cooldownHoursRemaining,
    eligible,
    cooldownActive,
  };
}

function getSuggestedActions(
  recoveryMode: boolean,
  habits: CharacterHabit[],
): RecoveryAction[] {
  const actions: RecoveryAction[] = [
    {
      type: 'reflection',
      title: 'Brief Reflection',
      description: 'Write 2-3 sentences about how you are feeling right now.',
      estimatedMinutes: 3,
    },
    {
      type: 'movement',
      title: 'Move Your Body',
      description: 'Stand up, stretch, or take a short walk.',
      estimatedMinutes: 5,
    },
    {
      type: 'next_task',
      title: 'One Next Action',
      description: 'Identify the smallest task you can complete right now.',
      estimatedMinutes: 1,
    },
  ];

  if (recoveryMode) {
    const easyHabit = habits.find(h => h.isActive && h.difficulty <= 3);
    if (easyHabit) {
      actions.unshift({
        type: 'habit',
        title: easyHabit.title,
        description: `Complete your easiest habit: ${easyHabit.title}`,
        estimatedMinutes: 5,
        entityId: easyHabit.id,
      });
    }
  }

  return actions;
}

export function canToggleRecovery(
  currentMode: boolean,
  recentActivity: ActivityLogEntry[],
  lastToggleDate?: string,
): { allowed: boolean; reason: string } {
  if (!currentMode) {
    const recentCount = recentActivity.filter(
      l => new Date(l.createdAt).getTime() > Date.now() - 7 * 86400000
    ).length;

    if (recentCount === 0) {
      return { allowed: false, reason: 'Complete at least one action before enabling recovery mode.' };
    }
  }

  if (lastToggleDate) {
    const hoursSince = (Date.now() - new Date(lastToggleDate).getTime()) / 3600000;
    if (hoursSince < RECOVERY_COOLDOWN_HOURS && !currentMode) {
      return {
        allowed: false,
        reason: `Recovery mode can be toggled once every ${RECOVERY_COOLDOWN_HOURS} hours. ${Math.ceil(RECOVERY_COOLDOWN_HOURS - hoursSince)}h remaining.`,
      };
    }
  }

  return { allowed: true, reason: '' };
}

export function getRecoveryDailyTarget(habits: CharacterHabit[]): number {
  const activeCount = habits.filter(h => h.isActive).length;
  return Math.max(1, Math.ceil(activeCount / 3));
}

export function isEligibleForRecoveryXp(
  eventType: string,
  activityLog: ActivityLogEntry[],
  hoursSinceLastRecovery: number,
): boolean {
  if (eventType !== 'habit_completed' && eventType !== 'power_up_used') {
    return false;
  }

  if (hoursSinceLastRecovery < 24) return false;

  const recentRecoveryCount = activityLog.filter(
    l => l.eventType === 'power_up_used'
      && new Date(l.createdAt).getTime() > Date.now() - 24 * 3600000,
  ).length;

  return recentRecoveryCount < 3;
}
