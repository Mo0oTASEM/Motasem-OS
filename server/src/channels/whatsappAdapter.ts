import { config } from '../config.js';
import { channelRouter } from './channelRouter.js';
import type { ChannelAdapter, IncomingChannelMessage, OutgoingChannelMessage } from './channelTypes.js';

const WHATSAPP_API = 'https://graph.facebook.com/v21.0';

const sendWhatsAppRequest = async (payload: Record<string, unknown>) => {
  if (!config.whatsappPhoneNumberId || !config.whatsappAccessToken) {
    return { ok: false, error: 'WhatsApp not configured' };
  }
  const response = await fetch(
    `${WHATSAPP_API}/${config.whatsappPhoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.whatsappAccessToken}`
      },
      body: JSON.stringify(payload)
    }
  );
  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: `WhatsApp API error ${response.status}: ${text}` };
  }
  const json = await response.json() as { messages?: Array<{ id: string }> };
  return { ok: true, messageId: json.messages?.[0]?.id };
};

export const whatsappAdapter: ChannelAdapter = {
  type: 'whatsapp',

  async sendMessage(channelUserId: string, message: OutgoingChannelMessage) {
    const body: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: channelUserId,
      type: 'text',
      text: { body: message.text }
    };
    if (message.replyTo) {
      body.context = { message_id: message.replyTo };
    }
    return sendWhatsAppRequest(body);
  },

  async sendTyping(channelUserId: string) {
    await sendWhatsAppRequest({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: channelUserId,
      type: 'action',
      action: 'typing_on'
    });
  },

  isAvailable() {
    return Boolean(config.whatsappPhoneNumberId && config.whatsappAccessToken);
  },

  getHealth() {
    return {
      configured: Boolean(config.whatsappPhoneNumberId && config.whatsappAccessToken && config.whatsappWebhookSecret),
      error: !config.whatsappPhoneNumberId ? 'WHATSAPP_PHONE_NUMBER_ID not configured'
        : !config.whatsappAccessToken ? 'WHATSAPP_ACCESS_TOKEN not configured'
          : !config.whatsappWebhookSecret ? 'WHATSAPP_WEBHOOK_SECRET not configured'
            : undefined
    };
  }
};

export const verifyWhatsAppWebhook = (query: Record<string, string | undefined>): { verified: boolean; challenge?: string } => {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsappVerifyToken) {
    return { verified: true, challenge };
  }
  return { verified: false };
};

const isAllowedSender = (phoneNumber: string) => {
  if (!config.whatsappAllowedSenders.length) return true;
  return config.whatsappAllowedSenders.includes(phoneNumber);
};

export const normalizeWhatsAppMessage = (entry: Record<string, unknown>): IncomingChannelMessage | null => {
  const changes = (entry.changes ?? []) as Array<Record<string, unknown>>;
  for (const change of changes) {
    const value = change.value as Record<string, unknown> | undefined;
    const messages = value?.messages as Array<Record<string, unknown>> | undefined;
    if (!messages?.length) continue;

    const msg = messages[0];
    const from = String(msg.from ?? '');
    const msgType = String(msg.type ?? 'text');

    if (!isAllowedSender(from)) return null;

    let text = '';
    const attachments: Array<{ type: 'image' | 'voice' | 'video' | 'document' | 'audio'; mimeType: string }> = [];

    if (msgType === 'text') {
      const textBody = msg.text as Record<string, unknown> | undefined;
      text = String(textBody?.body ?? '');
    } else if (msgType === 'audio' || msgType === 'voice') {
      const audio = msg[msgType] as Record<string, unknown> | undefined;
      text = '[Voice message received]';
      attachments.push({
        type: 'voice',
        mimeType: String(audio?.mime_type ?? 'audio/ogg')
      });
    } else if (msgType === 'image') {
      const image = msg.image as Record<string, unknown> | undefined;
      text = String(msg.caption ?? '[Image received]');
      attachments.push({
        type: 'image',
        mimeType: String(image?.mime_type ?? 'image/jpeg')
      });
    }

    if (!text && !attachments.length) return null;

    return {
      id: `whatsapp-${String(msg.id ?? Date.now())}`,
      channelType: 'whatsapp',
      channelUserId: from,
      chatId: from,
      text,
      attachments: attachments.map(a => ({ ...a, mimeType: a.mimeType })),
      timestamp: new Date(
        ((msg.timestamp as number) ?? Math.floor(Date.now() / 1000)) * 1000
      ).toISOString(),
      raw: msg as Record<string, unknown>
    };
  }
  return null;
};

export const handleWhatsAppWebhookMessage = async (body: Record<string, unknown>) => {
  if (!config.whatsappPhoneNumberId || !config.whatsappAccessToken) {
    return { ok: false, error: 'WhatsApp not configured', statusCode: 503 };
  }

  const entries = body.entry as Array<Record<string, unknown>> | undefined;
  if (!entries?.length) return { ok: true, statusCode: 200 };

  for (const entry of entries) {
    const normalized = normalizeWhatsAppMessage(entry);
    if (!normalized) continue;

    await whatsappAdapter.sendTyping(normalized.channelUserId);
    const routerResult = await channelRouter.handleIncoming(normalized);

    if (routerResult.ok && routerResult.reply) {
      await whatsappAdapter.sendMessage(normalized.channelUserId, routerResult.reply);
    }
  }

  return { ok: true, statusCode: 200 };
};
