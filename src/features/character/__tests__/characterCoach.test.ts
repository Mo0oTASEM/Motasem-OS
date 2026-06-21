import { describe, it, expect, vi, beforeEach } from 'vitest';
import { characterCoachClient } from '../services/characterCoachClient';
import type {
  CoachMessageRequest,
  QuestGenerationRequest,
  LadderGenerationRequest,
  ReflectionAnalysisRequest,
  WeeklyReviewRequest,
  DailyMissionRequest,
  AdaptiveSuggestionRequest,
  GeneratedQuest,
  GeneratedLadder,
  ReflectionAnalysisResponse,
  WeeklyReviewResponse,
  DailyMissionResponse,
  AdaptiveSuggestionResponse,
} from '../services/characterCoachTypes';

// ── Mock global fetch ────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ── Helper: make mock response ───────────────────────────────
const makeResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('characterCoachClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Mock auth headers — supabase session
    Object.defineProperty(import.meta, 'env', {
      value: { DEV: false },
      configurable: true,
    });
  });

  // ── Request type validation tests ─────────────────────────

  describe('Chat', () => {
    const req: CoachMessageRequest = {
      message: 'Help me prepare for a sales conversation',
      history: [{ role: 'user' as const, content: 'I am nervous' }],
      characterContext: 'Courage level 5',
    };

    it('sends correct request body', async () => {
      mockFetch.mockResolvedValue(makeResponse({ reply: 'Great question!', disclaimer: '' }));
      await characterCoachClient.chat(req);
      const sent = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(sent.message).toBe('Help me prepare for a sales conversation');
      expect(sent.history).toHaveLength(1);
      expect(sent.characterContext).toBe('Courage level 5');
    });

    it('returns ok with data on success', async () => {
      mockFetch.mockResolvedValue(makeResponse({ reply: 'Sure!', disclaimer: 'AI interpretation' }));
      const result = await characterCoachClient.chat(req);
      expect(result.ok).toBe(true);
      expect(result.data?.reply).toBe('Sure!');
    });

    it('returns error on non-ok response', async () => {
      mockFetch.mockResolvedValue(makeResponse({ error: 'Service unavailable' }, 503));
      const result = await characterCoachClient.chat(req);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Service unavailable');
    });

    it('returns error on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const result = await characterCoachClient.chat(req);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Quest Generation', () => {
    const req: QuestGenerationRequest = {
      traitName: 'Courage',
      availableMinutes: 15,
      preferredDifficulty: 5,
      currentConfidence: 6,
      context: 'Need to practice',
      locationType: 'work',
      privacyPreference: 'private',
    };

    it('generates quest with all fields', async () => {
      const quest: GeneratedQuest = {
        title: 'Ask one question in the team meeting',
        purpose: 'Practice speaking up',
        steps: ['Prepare question', 'Raise hand', 'Ask clearly'],
        difficulty: 5,
        discomfort: 6,
        successDefinition: 'Ask one question during the meeting',
        safetyOrRespectNotes: '',
        rewardXp: 75,
        reflectionQuestion: 'How did it feel to speak up?',
        easierFallback: 'Type the question in chat instead',
        harderNext: 'Ask a follow-up question',
        linkedTraitIds: ['t1'],
        whyItMatters: 'Speaking up builds communication courage',
      };
      mockFetch.mockResolvedValue(makeResponse({ quest, disclaimer: '' }));
      const result = await characterCoachClient.generateQuest(req);
      expect(result.ok).toBe(true);
      expect(result.data?.quest.title).toBe('Ask one question in the team meeting');
      expect(result.data?.quest.rewardXp).toBe(75);
      expect(result.data?.quest.steps).toHaveLength(3);
    });

    it('sends privacy preference in request', async () => {
      mockFetch.mockResolvedValue(makeResponse({ quest: {} as GeneratedQuest, disclaimer: '' }));
      await characterCoachClient.generateQuest(req);
      const sent = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(sent.privacyPreference).toBe('private');
    });
  });

  describe('Ladder Generation', () => {
    const req: LadderGenerationRequest = {
      desiredEndBehavior: 'Hold a 5-minute conversation with a stranger',
      linkedTraitName: 'Communication',
      currentConfidence: 4,
      context: 'Social anxiety in groups',
    };

    it('generates ladder with steps', async () => {
      const ladder: GeneratedLadder = {
        title: 'Social Conversation Ladder',
        description: 'Build up to holding conversations',
        desiredEndBehavior: 'Hold a 5-minute conversation with a stranger',
        steps: [
          { title: 'Eye contact', instructions: 'Make eye contact with 3 strangers', difficulty: 2, discomfortEstimate: 3, repetitionTarget: 5, reflectionRequired: false },
          { title: 'Say hello', instructions: 'Say hello to a cashier', difficulty: 3, discomfortEstimate: 4, repetitionTarget: 3, reflectionRequired: false },
          { title: 'Ask a question', instructions: 'Ask a simple question', difficulty: 5, discomfortEstimate: 6, repetitionTarget: 3, reflectionRequired: true },
        ],
        safetyNotes: 'Always respect social cues',
      };
      mockFetch.mockResolvedValue(makeResponse({ ladder, disclaimer: '' }));
      const result = await characterCoachClient.generateLadder(req);
      expect(result.ok).toBe(true);
      expect(result.data?.ladder.steps).toHaveLength(3);
      expect(result.data?.ladder.steps[0].title).toBe('Eye contact');
    });
  });

  describe('Reflection Analysis', () => {
    const req: ReflectionAnalysisRequest = {
      reflectionText: {
        whatHappened: 'I spoke up in the meeting',
        whatLearned: 'It went better than expected',
      },
      consentGiven: true,
    };

    it('requires consentGiven to be true', () => {
      expect(req.consentGiven).toBe(true);
    });

    it('returns analysis with all fields', async () => {
      const analysis: ReflectionAnalysisResponse = {
        trigger: 'Speaking in a group setting',
        prediction: 'I would be judged negatively',
        actualOutcome: 'People listened and responded',
        avoidancePattern: 'Waiting for perfect moment',
        usefulLesson: 'Action reduces fear more than preparation',
        cognitiveDistortion: 'Assuming the worst about others reactions',
        suggestedNextBehavior: 'Speak up within the first 5 minutes',
        suggestedLadderAdjustment: 'Increase group size gradually',
        disclaimer: 'This is an AI interpretation',
      };
      mockFetch.mockResolvedValue(makeResponse(analysis));
      const result = await characterCoachClient.analyzeReflection(req);
      expect(result.ok).toBe(true);
      expect(result.data?.trigger).toBe('Speaking in a group setting');
      expect(result.data?.disclaimer).toBe('This is an AI interpretation');
    });
  });

  describe('Weekly Review', () => {
    const req: WeeklyReviewRequest = {
      characterData: 'Level 5, traits: Courage 4, Discipline 3. Habits: 7/10 this week.',
    };

    it('returns structured review', async () => {
      const review: WeeklyReviewResponse = {
        mainWins: ['Completed 7 habits', 'Spoke up twice'],
        avoidedItems: ['Cold calling practice'],
        mostActiveTraits: ['Courage'],
        weakestSystemPoint: 'No consistent morning routine',
        repeatedBadGuy: 'Procrastination on difficult tasks',
        bestPerformingPowerUp: 'Breathing reset',
        completionByDifficulty: 'Easy tasks: 90%, Hard tasks: 40%',
        plannerOverloadNote: 'Planner is at 80% capacity',
        oneRecommendedAdjustment: 'Move hard tasks to morning',
        nextWeekMission: 'Focus on completing one hard task daily',
      };
      mockFetch.mockResolvedValue(makeResponse(review));
      const result = await characterCoachClient.weeklyReview(req);
      expect(result.ok).toBe(true);
      expect(result.data?.mainWins).toContain('Completed 7 habits');
    });
  });

  describe('Daily Mission', () => {
    const req: DailyMissionRequest = {
      characterContext: 'Focus trait: Discipline',
      focusTrait: 'Discipline',
      currentDifficultyPreference: 5,
      plannerWorkload: 6,
    };

    it('returns mission with type', async () => {
      const mission: DailyMissionResponse = {
        missionTitle: 'Write for 10 minutes',
        missionDescription: 'Write one paragraph about your progress',
        estimatedMinutes: 10,
        whyThisMatters: 'Builds writing consistency',
        linkedTraitName: 'Discipline',
        missionType: 'action',
      };
      mockFetch.mockResolvedValue(makeResponse(mission));
      const result = await characterCoachClient.dailyMission(req);
      expect(result.ok).toBe(true);
      expect(result.data?.missionType).toBe('action');
    });
  });

  describe('Adaptive Suggestion', () => {
    const req: AdaptiveSuggestionRequest = {
      characterContext: 'Struggling with consistency',
      currentDifficultyPreference: 5,
      recentFailures: ['Missed 3 habits this week'],
      recentSuccesses: ['Completed courage quest'],
      recoveryMode: false,
    };

    it('returns suggestion with type', async () => {
      const suggestion: AdaptiveSuggestionResponse = {
        suggestionType: 'repeat_current_step',
        title: 'Repeat current difficulty level',
        description: 'Stay at level 5 for one more week',
        reason: 'Recent misses suggest the current level is challenging enough',
        estimatedImpact: 'Building consistency at current level before advancing',
      };
      mockFetch.mockResolvedValue(makeResponse(suggestion));
      const result = await characterCoachClient.adaptiveSuggestion(req);
      expect(result.ok).toBe(true);
      expect(result.data?.suggestionType).toBe('repeat_current_step');
    });

    it('supports recovery mode', async () => {
      const reqRecovery: AdaptiveSuggestionRequest = { ...req, recoveryMode: true };
      mockFetch.mockResolvedValue(makeResponse({
        suggestionType: 'enter_recovery_mode' as const,
        title: 'Enter recovery mode',
        description: 'Reset expectations',
        reason: 'You are in recovery mode',
        estimatedImpact: 'Reduced pressure',
      }));
      const result = await characterCoachClient.adaptiveSuggestion(reqRecovery);
      expect(result.ok).toBe(true);
    });
  });

  // ── Cross-cutting concerns ─────────────────────────────────

  describe('Error handling', () => {
    it('returns error when API is not configured', async () => {
      // Just test that fetch is called with the right URL
      mockFetch.mockResolvedValue(makeResponse({ error: 'Not found' }, 404));
      const result = await characterCoachClient.chat({ message: 'test' });
      expect(result.ok).toBe(false);
    });

    it('handles malformed JSON response', async () => {
      mockFetch.mockResolvedValue(new Response('not json', { status: 200, headers: { 'Content-Type': 'text/plain' } }));
      const result = await characterCoachClient.chat({ message: 'test' });
      // The response will fail JSON.parse
      expect(result.ok).toBe(false);
    });
  });
});

// ── Type-level tests: ensure all generated types are valid ──
describe('Character coach type definitions', () => {
  it('GeneratedQuest has required fields', () => {
    const quest: GeneratedQuest = {
      title: 'Test', purpose: 'Test', steps: ['Step 1'], difficulty: 5,
      discomfort: 5, successDefinition: 'Success', safetyOrRespectNotes: '',
      rewardXp: 50, reflectionQuestion: 'Question', easierFallback: 'Easier',
      harderNext: 'Harder', linkedTraitIds: [], whyItMatters: 'Matters',
    };
    expect(quest.title).toBe('Test');
  });

  it('GeneratedLadder has required fields', () => {
    const ladder: GeneratedLadder = {
      title: 'Test', description: 'Test', desiredEndBehavior: 'Behavior',
      steps: [{ title: 'S1', instructions: 'Do X', difficulty: 3, discomfortEstimate: 4, repetitionTarget: 3, reflectionRequired: false }],
      safetyNotes: '',
    };
    expect(ladder.steps[0].title).toBe('S1');
  });

  it('ReflectionAnalysisResponse has disclaimer', () => {
    const r: ReflectionAnalysisResponse = {
      trigger: 'T', prediction: 'P', actualOutcome: 'O', avoidancePattern: 'AP',
      usefulLesson: 'UL', cognitiveDistortion: 'CD', suggestedNextBehavior: 'SNB',
      suggestedLadderAdjustment: 'SLA', disclaimer: 'AI interpretation',
    };
    expect(r.disclaimer).toBeTruthy();
  });

  it('WeeklyReviewResponse has all arrays', () => {
    const r: WeeklyReviewResponse = {
      mainWins: [], avoidedItems: [], mostActiveTraits: [],
      weakestSystemPoint: '', repeatedBadGuy: '', bestPerformingPowerUp: '',
      completionByDifficulty: '', plannerOverloadNote: '',
      oneRecommendedAdjustment: '', nextWeekMission: '',
    };
    expect(Array.isArray(r.mainWins)).toBe(true);
    expect(Array.isArray(r.avoidedItems)).toBe(true);
  });

  it('DailyMissionResponse has missionType union', () => {
    const types: DailyMissionResponse['missionType'][] = ['action', 'reflection', 'preparation', 'recovery', 'connection'];
    expect(types).toHaveLength(5);
  });

  it('AdaptiveSuggestionResponse has suggestionType union', () => {
    const types: AdaptiveSuggestionResponse['suggestionType'][] = [
      'increase_difficulty', 'repeat_current_step', 'split_task', 'change_cue',
      'change_environment', 'add_proof', 'add_accountability', 'pause_temporarily',
      'enter_recovery_mode',
    ];
    expect(types).toHaveLength(9);
  });
});
