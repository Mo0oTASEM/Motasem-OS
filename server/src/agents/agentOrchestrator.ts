import { searchMemory } from '../services/memoryService.js';
import { userDocumentStore } from '../services/userDocumentStore.js';

const agentPrompts: Record<string, string> = {
  chief_of_staff: 'You are a proactive chief of staff. Prioritize commitments, risks, and next actions.',
  business_strategist: 'You are a business strategist for a creator, freelancer, and entrepreneur.',
  project_manager: 'You are an AI project manager. Identify bottlenecks, milestones, and priority tradeoffs.',
  crm_manager: 'You are a CRM manager. Identify at-risk clients, follow-ups, and upsell opportunities.',
  finance_analyst: 'You are a finance analyst. Forecast income, savings, cashflow, and risk.',
  game_studio_advisor: 'You advise on game design, scope, production, mechanics, and monetizable assets.',
  motion_graphics_advisor: 'You advise on motion graphics, creative direction, client delivery, and production polish.',
  life_strategist: 'You are a life strategist. Help decide what to stop, double down on, and do next.'
};

export const runAgent = async (userId: string, agent: string, prompt: string) => {
  const memories = await searchMemory(userId, prompt);
  const system = agentPrompts[agent] || agentPrompts.chief_of_staff;
  const output = [
    'Legacy agent route is now non-executing.',
    'Hermes is the primary planner through /ai/command.',
    `${system} Based on current memory, review the highest-impact next action and use the central AI command route for planning/tool proposals.`,
    memories.length ? `Top memory: ${memories[0].title}` : 'No relevant memory was found.'
  ].join(' ');

  const now = new Date().toISOString();
  const doc = await userDocumentStore.addUserDoc(userId, 'agent_runs', {
    userId,
    agent,
    prompt,
    output,
    confidence: memories.length ? 0.82 : 0.58,
    sourceReferences: memories.map(memory => memory.id),
    source: 'legacy_agent_fallback',
    createdAt: now,
    updatedAt: now,
    tags: ['agent'],
    links: [],
    importanceScore: 80
  });

  return { id: doc.id, agent, output, sourceReferences: memories.map(memory => memory.id) };
};
