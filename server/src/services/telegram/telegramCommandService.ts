import { config } from '../../config.js';
import { decideApproval, listApprovals } from '../approvals/approvalService.js';
import { repositoryFactory } from '../database/repositoryFactory.js';
import { localDevStore } from '../localDevStore.js';
import { createMemoryItem } from '../memory/memoryRepository.js';
import { handleTelegramWebhook as handleTelegramVoiceWebhook } from '../telegramVoiceService.js';
import { userDocumentStore } from '../userDocumentStore.js';

type TelegramMessage = {
  message_id?: number;
  date?: number;
  from?: { id?: number; username?: string; first_name?: string; last_name?: string };
  chat?: { id?: number; type?: string };
  text?: string;
  caption?: string;
  voice?: { file_id: string; file_unique_id?: string; duration?: number; mime_type?: string };
};

type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
};

type TelegramCommandResult = {
  ok?: boolean;
  ignored?: boolean;
  command?: string;
  message: string;
  created?: Record<string, unknown>;
  approvals?: unknown[];
  suggestions?: string[];
  needsConfirmation?: boolean;
};

const nowIso = () => new Date().toISOString();

const senderName = (message: TelegramMessage) =>
  [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ')
  || message.from?.username
  || `chat-${message.chat?.id || 'unknown'}`;

const isAllowedChat = (chatId?: number) =>
  Boolean(chatId && (config.telegramAllowedChatIds.includes('*') || config.telegramAllowedChatIds.includes(String(chatId))));

const splitCommand = (text: string) => {
  const [rawCommand = '', ...rest] = text.trim().split(/\s+/);
  return {
    command: rawCommand.toLowerCase().split('@')[0],
    body: rest.join(' ').trim()
  };
};

const parseLead = (body: string) => {
  const [namePart, companyPart, emailPart] = body.split(/\s+-\s+|\s+\|\s+/).map(part => part.trim());
  const emailMatch = body.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return {
    name: namePart || 'Telegram lead',
    company: companyPart && !companyPart.includes('@') ? companyPart : undefined,
    email: emailMatch?.[0] || (emailPart?.includes('@') ? emailPart : undefined),
    notes: body,
    source: 'Telegram',
    status: 'new',
    stage: 'new' as const,
    priority: 'medium',
    score: 55,
    nextAction: 'Review and qualify lead captured from Telegram.'
  };
};

const logTelegramAction = async (
  userId: string,
  message: TelegramMessage,
  command: string,
  status: 'proposed' | 'executed' | 'pending_approval' | 'rejected' | 'failed',
  output?: Record<string, unknown>,
  error?: string
) => {
  await repositoryFactory.forUserCollection(userId, 'ai_action_logs').create({
    conversationId: `telegram-${message.chat?.id || 'unknown'}`,
    intent: 'telegram_command',
    tool: command || 'telegramUpdate',
    status,
    riskLevel: command === '/approve' || command === '/reject' ? 'high' : 'low',
    input: {
      chatId: message.chat?.id,
      messageId: message.message_id,
      text: message.text || message.caption || ''
    },
    output,
    error,
    source: 'telegram',
    syncStatus: status === 'executed' ? 'synced' : 'pending',
    externalIds: {
      telegramChatId: String(message.chat?.id || ''),
      telegramMessageId: String(message.message_id || '')
    }
  });
};

const writeTelegramStatus = async (
  userId: string,
  message: TelegramMessage | undefined,
  update: Partial<{
    status: string;
    lastCommand: string;
    lastResult: string;
    lastError: string;
  }>
) => {
  const payload = {
    userId,
    service: 'telegram',
    status: update.status || 'connected',
    allowedChatIds: config.telegramAllowedChatIds,
    lastChatId: message?.chat?.id ? String(message.chat.id) : undefined,
    lastSender: message ? senderName(message) : undefined,
    lastCommand: update.lastCommand,
    lastResult: update.lastResult,
    lastError: update.lastError,
    lastSyncAt: nowIso(),
    updatedAt: nowIso(),
    source: 'telegram'
  };

  try {
    await userDocumentStore.writeUserDoc(userId, 'sync_state', 'telegram', payload);
  } catch {
    await localDevStore.writeUserDoc(userId, 'sync_state', 'telegram', payload);
  }

  return payload;
};

export const getTelegramIntegrationStatus = async (userId: string) => {
  let saved: Record<string, unknown> | null;
  try {
    saved = await userDocumentStore.readUserDoc<Record<string, unknown>>(userId, 'sync_state', 'telegram');
  } catch {
    saved = await localDevStore.readUserDoc<Record<string, unknown>>(userId, 'sync_state', 'telegram');
  }

  return {
    configured: Boolean(config.telegramBotToken && config.telegramWebhookSecret),
    webhookSecretConfigured: Boolean(config.telegramWebhookSecret),
    allowedChatIdsConfigured: config.telegramAllowedChatIds.length > 0,
    allowedChatIds: config.telegramAllowedChatIds.map(id => id.replace(/\d(?=\d{2})/g, '*')),
    lastCommand: saved?.lastCommand || null,
    lastResult: saved?.lastResult || null,
    lastChatId: saved?.lastChatId || null,
    lastSender: saved?.lastSender || null,
    lastSyncAt: saved?.lastSyncAt || null,
    status: saved?.status || (config.telegramAllowedChatIds.length ? 'ready' : 'needs_allowlist')
  };
};

const createTodo = async (userId: string, body: string, message: TelegramMessage) => {
  if (!body) return { needsConfirmation: true, message: 'Please send /todo followed by the task title.' };
  const task = await repositoryFactory.forUserCollection(userId, 'planner_tasks').create({
    title: body,
    status: 'todo',
    priority: 'medium',
    source: 'telegram',
    syncStatus: 'pending',
    externalIds: {
      telegramMessageId: String(message.message_id || '')
    }
  });
  return { ok: true, message: `Task captured: ${task.title}`, created: { entityType: 'planner_task', id: task.id } };
};

const createNote = async (userId: string, body: string, message: TelegramMessage) => {
  if (!body) return { needsConfirmation: true, message: 'Please send /note followed by the note content.' };
  const memory = await createMemoryItem(userId, {
    title: `Telegram note from ${senderName(message)}`,
    content: body,
    type: 'decision',
    tags: ['telegram', 'note'],
    source: 'telegram',
    entityType: 'telegram_message',
    entityId: String(message.message_id || Date.now()),
    importance: 54
  });
  return { ok: true, message: 'Note saved to memory.', created: { entityType: 'memory', id: memory.id } };
};

const createIdea = async (userId: string, body: string, message: TelegramMessage) => {
  if (!body) return { needsConfirmation: true, message: 'Please send /idea followed by the idea.' };
  const memory = await createMemoryItem(userId, {
    title: `Idea: ${body.slice(0, 70)}`,
    content: body,
    type: 'content_idea',
    tags: ['telegram', 'idea'],
    source: 'telegram',
    entityType: 'idea',
    entityId: String(message.message_id || Date.now()),
    importance: 60
  });
  return { ok: true, message: 'Idea captured in memory.', created: { entityType: 'memory', id: memory.id } };
};

const createGoal = async (userId: string, body: string, message: TelegramMessage) => {
  if (!body) return { needsConfirmation: true, message: 'Please send /goal followed by the goal title.' };
  const goal = await repositoryFactory.forUserCollection(userId, 'goals').create({
    title: body,
    status: 'not_started',
    progress: 0,
    description: 'Captured from Telegram. Review and enrich this goal in Plan Control.',
    source: 'telegram',
    syncStatus: 'pending',
    externalIds: {
      telegramMessageId: String(message.message_id || '')
    }
  });
  return { ok: true, message: `Goal captured: ${goal.title}`, created: { entityType: 'goal', id: goal.id } };
};

const createLead = async (userId: string, body: string, message: TelegramMessage) => {
  if (!body) return { needsConfirmation: true, message: 'Please send /lead Name - Company - email@example.com.' };
  const lead = await repositoryFactory.forUserCollection(userId, 'crm_leads').create({
    ...parseLead(body),
    source: 'telegram',
    syncStatus: 'pending',
    externalIds: {
      telegramMessageId: String(message.message_id || '')
    }
  });
  return { ok: true, message: `Lead captured: ${lead.name}`, created: { entityType: 'crm_lead', id: lead.id } };
};

const buildStatus = async (userId: string) => {
  const [tasks, goals, leads, approvals] = await Promise.all([
    repositoryFactory.forUserCollection(userId, 'planner_tasks').list(100),
    repositoryFactory.forUserCollection(userId, 'goals').list(100),
    repositoryFactory.forUserCollection(userId, 'crm_leads').list(100),
    listApprovals(userId, 'pending')
  ]);

  return {
    ok: true,
    message: `Motasem OS status: ${tasks.filter(task => task.status !== 'done').length} open tasks, ${goals.length} goals, ${leads.length} leads, ${approvals.length} pending approvals.`,
    created: {
      openTasks: tasks.filter(task => task.status !== 'done').length,
      goals: goals.length,
      leads: leads.length,
      pendingApprovals: approvals.length
    }
  };
};

const listPendingApprovals = async (userId: string) => {
  const approvals = await listApprovals(userId, 'pending');
  return {
    ok: true,
    message: approvals.length
      ? `Pending approvals: ${approvals.slice(0, 5).map(approval => `${approval.id} (${approval.actionType})`).join(', ')}`
      : 'No pending approvals.',
    approvals: approvals.slice(0, 10)
  };
};

const decidePendingApproval = async (userId: string, body: string, status: 'approved' | 'rejected') => {
  const approvalId = body.trim();
  if (!approvalId) {
    return { needsConfirmation: true, message: `Please send /${status === 'approved' ? 'approve' : 'reject'} <approvalId>.` };
  }
  const approval = await decideApproval(userId, approvalId, { status });
  return {
    ok: true,
    message: `Approval ${approval.id} marked ${status}. High-risk action still requires the matching backend executor to use this approval before anything external is sent or changed.`,
    created: { entityType: 'approval', id: approval.id, status: approval.status }
  };
};

const suggestionsFromVoice = (transcript: string) => {
  const lower = transcript.toLowerCase();
  const suggestions: string[] = [];
  if (/(task|todo|remind|need to|i should)/.test(lower)) suggestions.push(`/todo ${transcript.split('\n')[0].slice(0, 120)}`);
  if (/(lead|client|prospect|company|email)/.test(lower)) suggestions.push(`/lead ${transcript.split('\n')[0].slice(0, 120)}`);
  if (/(goal|objective|target)/.test(lower)) suggestions.push(`/goal ${transcript.split('\n')[0].slice(0, 120)}`);
  if (!suggestions.length) suggestions.push(`/note ${transcript.split('\n')[0].slice(0, 120)}`);
  return suggestions;
};

export const handleTelegramCommandWebhook = async (userId: string, update: TelegramUpdate): Promise<TelegramCommandResult> => {
  if (!config.telegramBotToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured.');

  const message = update.message;
  if (!message) return { ignored: true, message: 'No message in Telegram update.' };

  if (!isAllowedChat(message.chat?.id)) {
    await writeTelegramStatus(userId, message, {
      status: 'blocked',
      lastCommand: 'blocked_chat',
      lastError: `Telegram chat ${message.chat?.id || 'unknown'} is not allowlisted.`
    });
    await logTelegramAction(userId, message, 'blocked_chat', 'rejected', undefined, 'Chat is not allowlisted.');
    return { ok: false, message: 'Telegram chat is not allowlisted.' };
  }

  let text = message.text || message.caption || '';
  if (message.voice?.file_id) {
    const voiceResult = await handleTelegramVoiceWebhook(userId, update);
    if (!text.trim()) {
      const transcript = String(voiceResult.transcript || '');
      const result = {
        ok: true,
        command: 'voice_memo',
        message: 'Voice memo transcribed and saved to memory. Reply with one suggested command to confirm a task, lead, goal, or note.',
        created: { entityType: 'memory', id: voiceResult.memoryId },
        suggestions: suggestionsFromVoice(transcript),
        needsConfirmation: true
      };
      await writeTelegramStatus(userId, message, { status: 'connected', lastCommand: 'voice_memo', lastResult: result.message });
      await logTelegramAction(userId, message, 'voice_memo', 'pending_approval', result.created);
      return result;
    }
    text = `${text} ${voiceResult.transcript || ''}`.trim();
  }

  if (!text.trim().startsWith('/')) {
    const result = {
      needsConfirmation: true,
      message: 'Ambiguous Telegram capture. Please resend as /todo, /note, /lead, /idea, or /goal so Motasem knows where it belongs.',
      suggestions: [`/note ${text.trim().slice(0, 120)}`]
    };
    await writeTelegramStatus(userId, message, { status: 'needs_confirmation', lastCommand: 'ambiguous', lastResult: result.message });
    await logTelegramAction(userId, message, 'ambiguous', 'proposed', { suggestions: result.suggestions });
    return result;
  }

  const { command, body } = splitCommand(text);
  let result: TelegramCommandResult;

  try {
    if (command === '/todo') result = await createTodo(userId, body, message);
    else if (command === '/note') result = await createNote(userId, body, message);
    else if (command === '/idea') result = await createIdea(userId, body, message);
    else if (command === '/goal') result = await createGoal(userId, body, message);
    else if (command === '/lead') result = await createLead(userId, body, message);
    else if (command === '/status') result = await buildStatus(userId);
    else if (command === '/approvals') result = await listPendingApprovals(userId);
    else if (command === '/approve') result = await decidePendingApproval(userId, body, 'approved');
    else if (command === '/reject') result = await decidePendingApproval(userId, body, 'rejected');
    else {
      result = {
        needsConfirmation: true,
        command,
        message: `Unknown Telegram command ${command}. Supported: /todo, /note, /lead, /idea, /goal, /status, /approvals, /approve <id>, /reject <id>.`
      };
    }

    await writeTelegramStatus(userId, message, {
      status: result.needsConfirmation ? 'needs_confirmation' : 'connected',
      lastCommand: command,
      lastResult: result.message
    });
    await logTelegramAction(userId, message, command, result.needsConfirmation ? 'proposed' : 'executed', result.created);
    return { command, ...result };
  } catch (error) {
    const messageText = (error as Error).message;
    await writeTelegramStatus(userId, message, { status: 'error', lastCommand: command, lastError: messageText });
    await logTelegramAction(userId, message, command, 'failed', undefined, messageText);
    throw error;
  }
};
