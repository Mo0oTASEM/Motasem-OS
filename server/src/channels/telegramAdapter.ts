import { config } from '../config.js';
import { handleTelegramCommandWebhook } from '../services/telegram/telegramCommandService.js';
import { handleTelegramWebhook as handleTelegramVoiceWebhook } from '../services/telegramVoiceService.js';
import { channelRouter } from './channelRouter.js';
import type { ChannelAdapter, IncomingChannelMessage, OutgoingChannelMessage } from './channelTypes.js';

const TELEGRAM_API = `https://api.telegram.org/bot${config.telegramBotToken}`;

const sendTelegramRequest = async (method: string, payload: Record<string, unknown>) => {
  if (!config.telegramBotToken) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
  const response = await fetch(`${TELEGRAM_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: `Telegram API error ${response.status}: ${text}` };
  }
  const json = await response.json() as { ok: boolean; result?: { message_id?: number } };
  return { ok: json.ok, messageId: json.result?.message_id ? String(json.result.message_id) : undefined };
};

export const telegramAdapter: ChannelAdapter = {
  type: 'telegram',

  async sendMessage(channelUserId: string, message: OutgoingChannelMessage) {
    return sendTelegramRequest('sendMessage', {
      chat_id: Number(channelUserId),
      text: message.text,
      parse_mode: message.parseMode === 'html' ? 'HTML' : 'MarkdownV2',
      reply_to_message_id: message.replyTo ? Number(message.replyTo) : undefined
    });
  },

  async sendTyping(channelUserId: string) {
    await sendTelegramRequest('sendChatAction', {
      chat_id: Number(channelUserId),
      action: 'typing'
    });
  },

  isAvailable() {
    return Boolean(config.telegramBotToken);
  },

  getHealth() {
    return {
      configured: Boolean(config.telegramBotToken && config.telegramWebhookSecret),
      error: !config.telegramBotToken ? 'TELEGRAM_BOT_TOKEN not configured'
        : !config.telegramWebhookSecret ? 'TELEGRAM_WEBHOOK_SECRET not configured'
          : undefined
    };
  }
};

export const normalizeTelegramUpdate = (update: Record<string, unknown>): IncomingChannelMessage | null => {
  const message = (update.message ?? update.edited_message) as Record<string, unknown> | undefined;
  if (!message) return null;

  const chat = message.chat as Record<string, unknown> | undefined;
  const from = message.from as Record<string, unknown> | undefined;

  return {
    id: `telegram-${String(message.message_id ?? Date.now())}`,
    channelType: 'telegram',
    channelUserId: String(chat?.id ?? from?.id ?? ''),
    chatId: String(chat?.id ?? ''),
    text: String(message.text ?? message.caption ?? ''),
    attachments: [],
    timestamp: new Date(
      ((message.date as number) ?? Math.floor(Date.now() / 1000)) * 1000
    ).toISOString(),
    raw: update as Record<string, unknown>
  };
};

export const handleTelegramWebhookMessage = async (userId: string, body: Record<string, unknown>) => {
  if (!config.telegramBotToken) {
    return { ok: false, error: 'Telegram not configured', statusCode: 503 };
  }

  const normalized = normalizeTelegramUpdate(body);
  if (!normalized) return { ok: true, statusCode: 200 };

  if (normalized.text.startsWith('/')) {
    const result = await handleTelegramCommandWebhook(userId, body as never);
    if (result.message) {
      await telegramAdapter.sendMessage(normalized.channelUserId, {
        text: result.message,
        parseMode: 'markdown'
      });
    }
    return { ok: true, statusCode: 200 };
  }

  const routerResult = await channelRouter.handleIncoming(normalized);
  if (routerResult.ok && routerResult.reply) {
    await telegramAdapter.sendMessage(normalized.channelUserId, routerResult.reply);
  }

  return { ok: routerResult.ok, statusCode: 200, error: routerResult.error };
};
