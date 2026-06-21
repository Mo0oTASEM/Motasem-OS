import { z } from 'zod';

export const aiCommandRequestSchema = z.object({
  message: z.string().min(1).max(8000),
  currentView: z.string().min(1).optional().default('unknown'),
  selectedEntityId: z.string().min(1).optional(),
  conversationId: z.string().min(1).optional(),
  contextHints: z.record(z.unknown()).optional().default({}),
  dryRun: z.boolean().optional().default(false)
});

export const aiRiskLevelSchema = z.enum(['low', 'medium', 'high']);

export const aiActionSchema = z.object({
  id: z.string(),
  tool: z.string(),
  risk: aiRiskLevelSchema,
  requiresApproval: z.boolean(),
  input: z.record(z.unknown()),
  reason: z.string(),
  status: z.enum(['proposed', 'pending_approval', 'executed', 'blocked'])
});

export const aiMemoryUpdateSchema = z.object({
  type: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).default([])
});

export const aiSourceSchema = z.object({
  type: z.string(),
  id: z.string().optional(),
  title: z.string().optional(),
  collection: z.string().optional()
});

export const hermesActionSchema = z.object({
  tool: z.string().min(1),
  risk: aiRiskLevelSchema.optional().default('low'),
  requiresApproval: z.boolean().optional(),
  input: z.record(z.unknown()).optional().default({}),
  reason: z.string().optional().default('Proposed by Hermes.')
});

export const hermesOutputSchema = z.object({
  answer: z.string().min(1),
  intent: z.string().min(1),
  confidence: z.number().min(0).max(1).catch(0.6),
  actions: z.array(hermesActionSchema).optional().default([]),
  memoryUpdates: z.array(aiMemoryUpdateSchema).optional().default([]),
  followUpQuestions: z.array(z.string()).optional().default([])
});

export type AiCommandRequest = z.infer<typeof aiCommandRequestSchema>;
export type AiRiskLevel = z.infer<typeof aiRiskLevelSchema>;
export type AiAction = z.infer<typeof aiActionSchema>;
export type AiMemoryUpdate = z.infer<typeof aiMemoryUpdateSchema>;
export type AiSource = z.infer<typeof aiSourceSchema>;
export type HermesOutput = z.infer<typeof hermesOutputSchema>;

export interface AiCommandResponse {
  response: string;
  intent: string;
  confidence: number;
  proposedActions: AiAction[];
  executedActions: AiAction[];
  pendingApprovals: AiAction[];
  memoryUpdates: AiMemoryUpdate[];
  sources: AiSource[];
  errors: string[];
}
