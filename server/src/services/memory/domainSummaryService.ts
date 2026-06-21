import { runSecondBrain } from '../aiBrain/secondBrainRouter.js';
import { createMemoryItem, normalizeMemoryType, redactSensitiveText, type DurableMemoryType } from './memoryRepository.js';

export interface EntityMemorySummaryInput {
  entityType: string;
  entityId?: string;
  title?: string;
  content?: string;
  entity?: Record<string, unknown>;
  type?: DurableMemoryType;
  tags?: string[];
  source?: string;
  importance?: number;
}

const typeByEntity: Record<string, DurableMemoryType> = {
  user: 'user_preference',
  preference: 'user_preference',
  project: 'project_summary',
  projects: 'project_summary',
  goal: 'goal_update',
  goals: 'goal_update',
  lead: 'crm_note',
  contact: 'crm_note',
  crm: 'crm_note',
  deal: 'crm_note',
  finance: 'finance_summary',
  transaction: 'finance_summary',
  content: 'content_idea',
  portfolio: 'portfolio_note',
  decision: 'decision',
  journal: 'journal_reflection',
  note: 'decision'
};

const compactEntity = (entity: Record<string, unknown> | undefined) => {
  if (!entity) return '';
  return Object.entries(entity)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .slice(0, 30)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value).slice(0, 500) : String(value)}`)
    .join('\n');
};

const chooseType = (input: EntityMemorySummaryInput) =>
  input.type || typeByEntity[input.entityType.toLowerCase()] || normalizeMemoryType(input.entityType);

const fallbackSummary = (input: EntityMemorySummaryInput) => {
  const raw = redactSensitiveText(input.content || compactEntity(input.entity));
  if (!raw.trim()) return `Remembered ${input.entityType}${input.entityId ? ` ${input.entityId}` : ''}.`;
  return raw.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 8).join('\n').slice(0, 1200);
};

export const summarizeEntityIntoMemory = async (userId: string, input: EntityMemorySummaryInput) => {
  const entityType = redactSensitiveText(input.entityType).trim();
  if (!entityType) throw new Error('entityType is required.');

  const title = input.title || `${entityType} memory${input.entityId ? `: ${input.entityId}` : ''}`;
  const sourceMaterial = redactSensitiveText(input.content || compactEntity(input.entity));
  const memoryType = chooseType(input);
  let summary = fallbackSummary(input);
  let summarizer: 'gemini' | 'fallback' = 'fallback';

  if (sourceMaterial.trim()) {
    try {
      const result = await runSecondBrain({
        task: 'summarize_memory',
        prompt: `Summarize this ${entityType} into durable Motasem OS memory. Preserve decisions, next actions, blockers, preferences, useful facts, and relationships. Do not include secrets, raw OAuth tokens, or private email bodies.\n\n${sourceMaterial}`,
        context: {
          entityType,
          entityId: input.entityId,
          memoryType
        }
      });
      if (result.output.trim()) {
        summary = redactSensitiveText(result.output.trim());
        summarizer = result.source === 'gemini' ? 'gemini' : 'fallback';
      }
    } catch {
      summary = fallbackSummary(input);
    }
  }

  const memory = await createMemoryItem(userId, {
    title,
    content: summary,
    type: memoryType,
    tags: input.tags || [entityType, memoryType],
    source: input.source || summarizer,
    entityType,
    entityId: input.entityId,
    importance: input.importance ?? 65
  });

  return {
    memory,
    summarizer
  };
};

