import { telegramCommandExamples } from './seed';
import type { TelegramCommandSimulation } from './types';

export const simulateTelegramCommand = (input: string): TelegramCommandSimulation => {
  const normalized = input.trim().toLowerCase();
  const exact = telegramCommandExamples.find(example =>
    example.english.toLowerCase() === normalized || example.arabic.toLowerCase() === normalized
  );
  const fuzzy = exact || telegramCommandExamples.find(example =>
    normalized.includes(example.category.toLowerCase()) ||
    normalized.includes(example.workflow.split('.')[0]) ||
    example.english.toLowerCase().split(' ').some(word => word.length > 4 && normalized.includes(word))
  );

  if (fuzzy) {
    return {
      interpretation: `Understood as ${fuzzy.category} command: ${fuzzy.english}`,
      selectedWorkflow: fuzzy.workflow,
      requiresApproval: fuzzy.requiresApproval,
      mockResult: fuzzy.mockResult
    };
  }

  return {
    interpretation: 'Interpreted as a general work command. The assistant would ask one clarification before running a workflow.',
    selectedWorkflow: 'work.clarifyCommand',
    requiresApproval: true,
    mockResult: 'Mock result: clarification needed before creating, sending, publishing, or changing records.'
  };
};

export const telegramBotApiPlaceholder = async () => ({
  status: 'mock' as const,
  message: 'Telegram Bot API and n8n workflow connection placeholder. No real bot calls are made.'
});
