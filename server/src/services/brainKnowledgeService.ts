import { google } from 'googleapis';
import { ingestMemoryItem, searchMemory } from './memoryService.js';
import { getUserOAuthClient } from './googleAuthService.js';
import { runSecondBrain } from './aiBrain/secondBrainRouter.js';

export const importGoogleContacts = async (userId: string) => {
  const auth = await getUserOAuthClient(userId);
  const people = google.people({ version: 'v1', auth });
  const response = await people.people.connections.list({
    resourceName: 'people/me',
    personFields: 'names,emailAddresses,phoneNumbers,organizations,biographies,urls'
  });

  const connections = response.data.connections || [];
  let imported = 0;

  for (const person of connections) {
    const name = person.names?.[0]?.displayName || person.emailAddresses?.[0]?.value || person.resourceName || 'Unnamed contact';
    const content = [
      `Name: ${name}`,
      ...(person.emailAddresses || []).map(email => `Email: ${email.value}`),
      ...(person.phoneNumbers || []).map(phone => `Phone: ${phone.value}`),
      ...(person.organizations || []).map(org => `Organization: ${org.name || ''} ${org.title || ''}`.trim()),
      ...(person.urls || []).map(url => `URL: ${url.value}`)
    ].filter(Boolean).join('\n');

    await ingestMemoryItem(userId, {
      id: `contact-${person.resourceName || name}`.replace(/[^a-zA-Z0-9_-]/g, '-'),
      type: 'client_conversation',
      title: `Google Contact: ${name}`,
      content,
      source: 'google_contacts',
      sourceId: person.resourceName,
      tags: ['google-contact', 'contact'],
      links: [],
      aiSummary: content.slice(0, 240),
      importanceScore: 65,
      relatedEntityIds: []
    });
    imported += 1;
  }

  return { imported };
};

export const answerBrainQuestion = async (userId: string, question: string) => {
  const memories = await searchMemory(userId, question);
  if (!memories.length) {
    return {
      answer: 'I could not find matching memory yet. Add or import memory into Supabase first.',
      sources: memories
    };
  }

  const result = await runSecondBrain({
    task: 'brain_qa',
    prompt: question,
    context: {
      memory: memories.map((memory, index) => ({
        ref: index + 1,
        title: memory.title,
        type: memory.type,
        tags: memory.tags,
        content: memory.content
      }))
    }
  }, userId);

  return {
    answer: result.output,
    sources: memories
  };
};
