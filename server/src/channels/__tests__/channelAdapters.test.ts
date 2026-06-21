// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRunAiCommand, mockUserDocumentStore, mockHandleTelegramCommand, mockHandleTelegramVoice } = vi.hoisted(() => ({
  mockRunAiCommand: vi.fn(),
  mockUserDocumentStore: { readUserDoc: vi.fn(), writeUserDoc: vi.fn() },
  mockHandleTelegramCommand: vi.fn(),
  mockHandleTelegramVoice: vi.fn(),
}));

vi.mock('../../config.js', () => ({
  config: {
    telegramBotToken: 'mock:test-bot-token',
    telegramWebhookSecret: 'mock-secret',
    whatsappPhoneNumberId: '123456',
    whatsappAccessToken: 'mock-access-token',
    whatsappWebhookSecret: 'mock-app-secret',
    whatsappVerifyToken: 'my_verify_token_123',
    whatsappAllowedSenders: [],
    hermesApiKey: '',
    hermesBaseUrl: '',
    hermesModel: '',
    geminiApiKey: '',
    nodeEnv: 'test',
    port: 0,
    appBaseUrl: '',
    allowLocalDevAuth: false,
    localDevUserId: '',

    googleClientId: '',
    googleClientSecret: '',
    googleOAuthRedirectUri: '',
    googleTokenEncryptionKey: '',
    googleCalendarWebhookUrl: '',
    googleCalendarWebhookSecret: '',
    googleSheetsSpreadsheetId: '',
    pastGoogleSheetsIds: [],
    supabaseUrl: '',
    supabasePublishableKey: '',
    supabaseServiceKey: '',
    telegramAllowedChatIds: [],
    corsOrigin: '',
  }
}));

vi.mock('../../services/aiBrain/brainRouter.js', () => ({
  runAiCommand: mockRunAiCommand,
}));

vi.mock('../../services/userDocumentStore.js', () => ({
  userDocumentStore: mockUserDocumentStore,
}));

vi.mock('../../services/telegram/telegramCommandService.js', () => ({
  handleTelegramCommandWebhook: mockHandleTelegramCommand,
}));

vi.mock('../../services/telegramVoiceService.js', () => ({
  handleTelegramWebhook: mockHandleTelegramVoice,
}));

import { normalizeTelegramUpdate, handleTelegramWebhookMessage } from '../telegramAdapter.js';
import { normalizeWhatsAppMessage, verifyWhatsAppWebhook, handleWhatsAppWebhookMessage } from '../whatsappAdapter.js';
import { channelRouter } from '../channelRouter.js';

// ── Telegram ─────────────────────────────────────────────
describe('normalizeTelegramUpdate', () => {
  it('extracts text message from update', () => {
    const result = normalizeTelegramUpdate({
      message: { message_id: 42, date: 1718000000, chat: { id: -100123456 }, from: { id: 98765, username: 'testuser' }, text: 'Hello from Telegram' }
    });
    expect(result).not.toBeNull();
    expect(result!.channelType).toBe('telegram');
    expect(result!.channelUserId).toBe('-100123456');
    expect(result!.text).toBe('Hello from Telegram');
    expect(result!.id).toBe('telegram-42');
  });

  it('handles edited_message', () => {
    const result = normalizeTelegramUpdate({
      edited_message: { message_id: 10, date: 1718000100, edit_date: 1718000200, chat: { id: 123 }, from: { id: 456 }, text: 'Edited text' }
    });
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Edited text');
  });

  it('returns null for non-message updates', () => {
    const result = normalizeTelegramUpdate({ poll: { id: 'poll1', question: 'Yes or no?' } });
    expect(result).toBeNull();
  });

  it('extracts caption from media messages', () => {
    const result = normalizeTelegramUpdate({
      message: { message_id: 5, date: 1718000300, chat: { id: 123 }, from: { id: 456 }, photo: [{ file_id: 'abc' }], caption: 'Look at this photo' }
    });
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Look at this photo');
  });

  it('returns empty text for media without caption', () => {
    const result = normalizeTelegramUpdate({
      message: { message_id: 6, date: 1718000400, chat: { id: 123 }, from: { id: 456 }, photo: [{ file_id: 'abc' }] }
    });
    expect(result).not.toBeNull();
    expect(result!.text).toBe('');
  });
});

describe('handleTelegramWebhookMessage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('routes non-command messages through channelRouter', async () => {
    mockRunAiCommand.mockResolvedValue({
      response: 'AI reply', intent: 'general_chat', confidence: 0.9,
      proposedActions: [], executedActions: [], pendingApprovals: [],
      memoryUpdates: [], sources: [], errors: []
    });

    const result = await handleTelegramWebhookMessage('user-1', {
      message: { message_id: 1, date: 1718000000, chat: { id: 123 }, from: { id: 456 }, text: 'Hello' }
    });
    expect(result.ok).toBe(true);
    expect(mockRunAiCommand).toHaveBeenCalledTimes(1);
  });

  it('routes slash commands through telegramCommandService', async () => {
    mockHandleTelegramCommand.mockResolvedValue({ message: 'Command executed' });

    const result = await handleTelegramWebhookMessage('user-1', {
      message: { message_id: 2, date: 1718000000, chat: { id: 123 }, from: { id: 456 }, text: '/todo list' }
    });
    expect(result.ok).toBe(true);
    expect(mockHandleTelegramCommand).toHaveBeenCalledTimes(1);
    expect(mockRunAiCommand).not.toHaveBeenCalled();
  });
});

// ── WhatsApp ─────────────────────────────────────────────
describe('normalizeWhatsAppMessage', () => {
  it('extracts text message', () => {
    const entry = { changes: [{ value: { messaging_product: 'whatsapp', messages: [{ from: '15557654321', id: 'w1', timestamp: '1718000000', type: 'text', text: { body: 'Hello' } }] } }] };
    const result = normalizeWhatsAppMessage(entry as unknown as Record<string, unknown>);
    expect(result).not.toBeNull();
    expect(result!.channelType).toBe('whatsapp');
    expect(result!.channelUserId).toBe('15557654321');
    expect(result!.text).toBe('Hello');
  });

  it('handles voice messages', () => {
    const entry = { changes: [{ value: { messaging_product: 'whatsapp', messages: [{ from: '15557654321', id: 'w2', timestamp: '1718000100', type: 'voice', voice: { mime_type: 'audio/ogg' } }] } }] };
    const result = normalizeWhatsAppMessage(entry as unknown as Record<string, unknown>);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('[Voice message received]');
    expect(result!.attachments).toHaveLength(1);
    expect(result!.attachments[0].type).toBe('voice');
  });

  it('handles image with caption', () => {
    const entry = { changes: [{ value: { messaging_product: 'whatsapp', messages: [{ from: '15557654321', id: 'w3', timestamp: '1718000200', type: 'image', image: { mime_type: 'image/jpeg' }, caption: 'Nice pic' }] } }] };
    const result = normalizeWhatsAppMessage(entry as unknown as Record<string, unknown>);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Nice pic');
    expect(result!.attachments[0].type).toBe('image');
  });

  it('returns null when no messages in entry', () => {
    expect(normalizeWhatsAppMessage({ changes: [{ value: {} }] } as unknown as Record<string, unknown>)).toBeNull();
  });

  it('returns null for empty changes', () => {
    expect(normalizeWhatsAppMessage({ changes: [] } as unknown as Record<string, unknown>)).toBeNull();
  });
});

describe('verifyWhatsAppWebhook', () => {
  it('returns challenge when token matches', () => {
    const r = verifyWhatsAppWebhook({ 'hub.mode': 'subscribe', 'hub.verify_token': 'my_verify_token_123', 'hub.challenge': 'challenge_string_42' });
    expect(r.verified).toBe(true);
    expect(r.challenge).toBe('challenge_string_42');
  });

  it('fails when token is wrong', () => {
    expect(verifyWhatsAppWebhook({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': 'abc' }).verified).toBe(false);
  });

  it('fails when mode is wrong', () => {
    expect(verifyWhatsAppWebhook({ 'hub.mode': 'unsubscribe', 'hub.verify_token': 'my_verify_token_123', 'hub.challenge': 'abc' }).verified).toBe(false);
  });
});

describe('handleWhatsAppWebhookMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunAiCommand.mockResolvedValue({
      response: 'AI reply', intent: 'general_chat', confidence: 0.9,
      proposedActions: [], executedActions: [], pendingApprovals: [],
      memoryUpdates: [], sources: [], errors: []
    });
  });

  it('processes messages through channelRouter', async () => {
    const body = { entry: [{ changes: [{ value: { messaging_product: 'whatsapp', messages: [{ from: '15557654321', id: 'w1', timestamp: '1718000000', type: 'text', text: { body: 'Hi' } }] } }] }] };
    const result = await handleWhatsAppWebhookMessage(body as unknown as Record<string, unknown>);
    expect(result.ok).toBe(true);
    expect(mockRunAiCommand).toHaveBeenCalled();
  });

  it('returns 200 for empty entries', async () => {
    expect((await handleWhatsAppWebhookMessage({ entry: [] } as unknown as Record<string, unknown>)).ok).toBe(true);
    expect(mockRunAiCommand).not.toHaveBeenCalled();
  });
});

// ── Channel Router ───────────────────────────────────────
describe('channelRouter', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('handleIncoming', () => {
    it('routes message to AI and returns reply', async () => {
      mockRunAiCommand.mockResolvedValue({
        response: 'Here is your reply!', intent: 'general_chat', confidence: 0.9,
        proposedActions: [], executedActions: [], pendingApprovals: [],
        memoryUpdates: [], sources: [], errors: []
      });
      const result = await channelRouter.handleIncoming({
        id: 'test-1', channelType: 'telegram', channelUserId: '12345', chatId: '12345',
        text: 'Hello AI', attachments: [], timestamp: new Date().toISOString(), raw: {}
      });
      expect(result.ok).toBe(true);
      expect(result.reply!.text).toBe('Here is your reply!');
    });

    it('handles error from AI', async () => {
      mockRunAiCommand.mockRejectedValue(new Error('AI service timeout'));
      const result = await channelRouter.handleIncoming({
        id: 'test-2', channelType: 'whatsapp', channelUserId: '5551112222', chatId: '5551112222',
        text: 'Hello', attachments: [], timestamp: new Date().toISOString(), raw: {}
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('AI service timeout');
    });
  });

  describe('linkUser', () => {
    it('links a new user', async () => {
      mockUserDocumentStore.readUserDoc.mockResolvedValue(null);
      const result = await channelRouter.linkUser('telegram_123', 'telegram', 'nova-user-1');
      expect(result.ok).toBe(true);
      expect(result.status).toBe('linked');
      expect(mockUserDocumentStore.writeUserDoc).toHaveBeenCalledTimes(2);
    });

    it('returns already_linked when same user', async () => {
      mockUserDocumentStore.readUserDoc.mockResolvedValue({ userId: 'nova-user-1' });
      const result = await channelRouter.linkUser('telegram_123', 'telegram', 'nova-user-1');
      expect(result.ok).toBe(true);
      expect(result.status).toBe('already_linked');
      expect(mockUserDocumentStore.writeUserDoc).not.toHaveBeenCalled();
    });

    it('re-links different user', async () => {
      mockUserDocumentStore.readUserDoc.mockResolvedValue({ userId: 'old-user' });
      const result = await channelRouter.linkUser('telegram_123', 'telegram', 'nova-user-2');
      expect(result.ok).toBe(true);
      expect(result.status).toBe('linked');
      expect(mockUserDocumentStore.writeUserDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('unlinkUser', () => {
    it('unlinks existing user', async () => {
      mockUserDocumentStore.readUserDoc.mockResolvedValue({ userId: 'nova-user-1' });
      const result = await channelRouter.unlinkUser('telegram_123', 'telegram');
      expect(result.ok).toBe(true);
      expect(result.status).toBe('unlinked');
      expect(mockUserDocumentStore.writeUserDoc).toHaveBeenCalled();
    });

    it('returns unlinked when no link exists', async () => {
      mockUserDocumentStore.readUserDoc.mockRejectedValue(new Error('Not found'));
      const result = await channelRouter.unlinkUser('telegram_123', 'telegram');
      expect(result.ok).toBe(true);
      expect(result.status).toBe('unlinked');
      expect(result.error).toContain('No link found');
    });
  });

  describe('getLinkedUser', () => {
    it('returns userId when link exists', async () => {
      mockUserDocumentStore.readUserDoc.mockResolvedValue({ userId: 'nova-user-1' });
      expect(await channelRouter.getLinkedUser('telegram_123', 'telegram')).toBe('nova-user-1');
    });

    it('returns null when no link', async () => {
      mockUserDocumentStore.readUserDoc.mockRejectedValue(new Error('Not found'));
      expect(await channelRouter.getLinkedUser('telegram_123', 'telegram')).toBeNull();
    });
  });
});
