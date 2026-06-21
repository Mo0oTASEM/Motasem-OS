import { runAiCommand } from '../services/aiBrain/brainRouter.js';
import type { ChannelAdapter, IncomingChannelMessage, OutgoingChannelMessage } from './channelTypes.js';

export const webChatAdapter: ChannelAdapter = {
  type: 'web',

  async sendMessage(_channelUserId: string, message: OutgoingChannelMessage) {
    return { ok: true, messageId: `web-${Date.now()}` };
  },

  async sendTyping(_channelUserId: string) {
  },

  isAvailable() {
    return true;
  },

  getHealth() {
    return { configured: true };
  }
};

export const handleWebChatMessage = async (userId: string, text: string, conversationId?: string) => {
  const message: IncomingChannelMessage = {
    id: `web-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    channelType: 'web',
    channelUserId: userId,
    chatId: userId,
    text,
    attachments: [],
    timestamp: new Date().toISOString(),
    raw: {}
  };

  const result = await runAiCommand(userId, {
    message: text,
    currentView: 'dashboard',
    conversationId: conversationId ?? `web-${userId}`,
    contextHints: {
      channel: 'web',
      channelMessageId: message.id,
      channelChatId: userId
    },
    dryRun: false
  });

  return result;
};
