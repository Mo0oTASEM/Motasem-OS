import { runCrmGemini } from './geminiProxy.js';

export const enrichCrmContact = async (userId: string, input: Record<string, unknown>) => {
  const prompt = [
    'Infer details about this contact from available data.',
    `Data: ${JSON.stringify(input)}`,
    'Return JSON: { "inferred_company_type": string, "inferred_seniority": "junior" | "mid" | "senior" | "executive", "suggested_tags": string[], "one_liner": string }',
    'No markdown. Mark all fields as inferred, not confirmed.'
  ].join('\n');

  return runCrmGemini(userId, 'enrichment', prompt, {
    inferred_company_type: 'Inferred creative/business contact',
    inferred_seniority: 'mid',
    suggested_tags: ['inferred', 'crm'],
    one_liner: 'Inferred prospect from CRM context.'
  });
};
