// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiGenerateResult } from '../../ai/aiTypes.js';

const mockGenerateText = vi.fn<(...args: unknown[]) => AiGenerateResult>();

vi.mock('../../ai/aiGateway.js', () => ({
  aiGateway: {
    generateText: (...args: unknown[]) => mockGenerateText(...args),
  }
}));

import {
  coachChat,
  generateQuest,
  generateLadder,
  analyzeReflection,
  generateWeeklyReview,
  generateDailyMission,
  generateAdaptiveSuggestion,
} from '../characterCoachService.js';

const userId = 'test-user-123';

const makeSuccess = (text: string): AiGenerateResult => ({
  ok: true, text, provider: 'hermes', errors: [], latencyMs: 100
});

const makeFailure = (errors: string[]): AiGenerateResult => ({
  ok: false, text: '', provider: 'fallback', errors, latencyMs: 50
});

beforeEach(() => {
  mockGenerateText.mockReset();
});

describe('characterCoachService', () => {
  describe('coachChat', () => {
    it('returns reply from AI gateway', async () => {
      mockGenerateText.mockResolvedValue(makeSuccess(JSON.stringify({
        reply: 'Great progress this week!',
        suggestedActions: [{ type: 'reflect', label: 'Journal', payload: {} }],
        disclaimer: ''
      })));

      const result = await coachChat(userId, {
        message: 'How am I doing?',
        history: [{ role: 'user', content: 'I worked out 3 times' }],
        characterContext: 'Level 5 Warrior'
      });

      expect(result.ok).toBe(true);
      expect(result.data!.reply).toBe('Great progress this week!');
      expect(result.data!.suggestedActions).toHaveLength(1);
    });

    it('returns error on AI failure', async () => {
      mockGenerateText.mockResolvedValue(makeFailure(['API quota exceeded']));

      const result = await coachChat(userId, {
        message: 'Hello',
        characterContext: '',
        history: []
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('API quota exceeded');
    });

    it('returns error on unparseable JSON response', async () => {
      mockGenerateText.mockResolvedValue(makeSuccess('not valid json at all'));

      const result = await coachChat(userId, {
        message: 'Hi',
        characterContext: '',
        history: []
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Failed to parse');
    });
  });

  describe('generateQuest', () => {
    it('returns generated quest', async () => {
      mockGenerateText.mockResolvedValue(makeSuccess(JSON.stringify({
        quest: {
          title: 'Master patience',
          purpose: 'Build the virtue of waiting calmly',
          steps: ['Wait 5 min before checking phone', 'Count to 10 before responding'],
          difficulty: 5,
          discomfort: 6,
          successDefinition: 'Complete both steps for 3 days',
          safetyOrRespectNotes: '',
          rewardXp: 50,
          reflectionQuestion: 'How did it feel to wait?',
          easierFallback: 'Wait 1 minute before checking phone once',
          harderNext: 'Wait 10 min before checking phone',
          linkedTraitIds: [],
          whyItMatters: 'Patience reduces reactivity',
        },
        disclaimer: ''
      })));

      const result = await generateQuest(userId, {
        traitName: 'patience',
        availableMinutes: 15,
        preferredDifficulty: 5,
        currentConfidence: 7,
        context: '',
        locationType: 'home',
        privacyPreference: 'private',
        recentCompletions: [],
        plannerWorkload: 0
      });

      expect(result.ok).toBe(true);
      expect(result.data!.title).toBe('Master patience');
    });
  });

  describe('generateLadder', () => {
    it('returns generated ladder', async () => {
      mockGenerateText.mockResolvedValue(makeSuccess(JSON.stringify({
        ladder: {
          title: 'Public Speaking Ladder',
          description: 'Build comfort with speaking to groups',
          desiredEndBehavior: 'Give a 5-minute presentation',
          steps: [
            {
              title: 'Say hello to a stranger',
              instructions: 'Make eye contact and say hello',
              difficulty: 2,
              discomfortEstimate: 3,
              repetitionTarget: 3,
              reflectionRequired: false
            },
            {
              title: 'Ask a question in a group',
              instructions: 'In a meeting, ask one question',
              difficulty: 3,
              discomfortEstimate: 4,
              repetitionTarget: 3,
              reflectionRequired: false
            },
            {
              title: 'Share an opinion',
              instructions: 'In a group of 3+, share your view',
              difficulty: 4,
              discomfortEstimate: 5,
              repetitionTarget: 2,
              reflectionRequired: true
            }
          ],
          safetyNotes: ''
        },
        disclaimer: ''
      })));

      const result = await generateLadder(userId, {
        desiredEndBehavior: 'Give a presentation',
        linkedTraitName: 'confidence',
        startingDifficulty: 2,
        currentConfidence: 4,
        context: '',
        privacyPreference: 'private'
      });

      expect(result.ok).toBe(true);
      expect(result.data!.steps).toHaveLength(3);
    });
  });

  describe('analyzeReflection', () => {
    it('returns error when consent is not given', async () => {
      const result = await analyzeReflection(userId, {
        reflectionText: {
          preActionFear: '',
          whatHappened: 'I felt anxious at the party',
          whatLearned: ''
        },
        consentGiven: false as unknown as true,
        characterContext: ''
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('opt in');
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('returns analysis when consent is given', async () => {
      mockGenerateText.mockResolvedValue(makeSuccess(JSON.stringify({
        trigger: 'Social event invitation',
        prediction: 'It would be awkward',
        actualOutcome: 'It went fine',
        avoidancePattern: '',
        usefulLesson: 'Reality is kinder than expectation',
        cognitiveDistortion: '',
        suggestedNextBehavior: 'Attend next event too',
        suggestedIfThenRule: { trigger: 'If invited', action: 'Go for 30 min' },
        suggestedLadderAdjustment: '',
        disclaimer: ''
      })));

      const result = await analyzeReflection(userId, {
        reflectionText: {
          preActionFear: '',
          whatHappened: 'I went to a party and it was okay',
          whatLearned: ''
        },
        consentGiven: true as const,
        characterContext: ''
      });

      expect(result.ok).toBe(true);
      expect(result.data!.trigger).toBe('Social event invitation');
    });

    it('returns error on unparseable JSON', async () => {
      mockGenerateText.mockResolvedValue(makeSuccess('{{{broken json'));

      const result = await analyzeReflection(userId, {
        reflectionText: {
          preActionFear: '',
          whatHappened: 'Test',
          whatLearned: ''
        },
        consentGiven: true as const,
        characterContext: ''
      });

      expect(result.ok).toBe(false);
    });
  });

  describe('generateWeeklyReview', () => {
    it('returns weekly review', async () => {
      mockGenerateText.mockResolvedValue(makeSuccess(JSON.stringify({
        mainWins: ['Worked out 3x', 'Journaled daily'],
        avoidedItems: ['Skipped meditation'],
        mostActiveTraits: ['discipline'],
        weakestSystemPoint: 'Evening routine slips',
        repeatedBadGuy: '',
        bestPerformingPowerUp: '',
        completionByDifficulty: '',
        plannerOverloadNote: '',
        oneRecommendedAdjustment: 'Add wind-down time',
        nextWeekMission: 'Meditate 3 times'
      })));

      const result = await generateWeeklyReview(userId, {
        characterData: 'Logged habits for 7 days'
      });

      expect(result.ok).toBe(true);
      expect(result.data!.mainWins).toContain('Worked out 3x');
    });
  });

  describe('generateDailyMission', () => {
    it('returns daily mission', async () => {
      mockGenerateText.mockResolvedValue(makeSuccess(JSON.stringify({
        missionTitle: 'Take a walk',
        missionDescription: 'Walk for 10 min outside',
        estimatedMinutes: 10,
        whyThisMatters: 'Fresh air boosts mood',
        linkedTraitName: 'vitality',
        missionType: 'action'
      })));

      const result = await generateDailyMission(userId, {
        characterContext: 'Level 5 Warrior',
        currentSeason: '',
        focusTrait: 'vitality',
        plannerWorkload: 0,
        recentActivity: '',
        currentDifficultyPreference: 5,
        recentAvoidance: '',
        recoveryMode: false
      });

      expect(result.ok).toBe(true);
      expect(result.data!.missionTitle).toBe('Take a walk');
    });
  });

  describe('generateAdaptiveSuggestion', () => {
    it('returns adaptive suggestion', async () => {
      mockGenerateText.mockResolvedValue(makeSuccess(JSON.stringify({
        suggestionType: 'increase_difficulty',
        title: 'Increase reps',
        description: 'Add one more rep to each set',
        reason: 'You completed all tasks for 5 days',
        estimatedImpact: 'Should maintain engagement'
      })));

      const result = await generateAdaptiveSuggestion(userId, {
        characterContext: '',
        currentDifficultyPreference: 5,
        recentFailures: [],
        recentSuccesses: ['Completed all tasks'],
        recoveryMode: false,
        plannerWorkload: 0
      });

      expect(result.ok).toBe(true);
      expect(result.data!.suggestionType).toBe('increase_difficulty');
    });
  });
});
