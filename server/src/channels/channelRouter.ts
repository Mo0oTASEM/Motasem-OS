import { aiGateway } from '../services/ai/aiGateway.js';
import { runAiCommand } from '../services/aiBrain/brainRouter.js';
import { userDocumentStore } from '../services/userDocumentStore.js';
import type { IncomingChannelMessage, OutgoingChannelMessage, ChannelRouter, ChannelLinkResult } from './channelTypes.js';

const LINK_COLLECTION = 'channel_links';

const typedUserDoc = {
  async read(channelUserId: string, channelType: string) {
    try {
      return await userDocumentStore.readUserDoc<{ userId: string }>(
        channelUserId, LINK_COLLECTION, channelType
      );
    } catch {
      return null;
    }
  },
  async write(channelUserId: string, channelType: string, novaUserId: string) {
    await userDocumentStore.writeUserDoc(novaUserId, LINK_COLLECTION, channelType, {
      channelUserId,
      channelType,
      linkedAt: new Date().toISOString()
    });
    await userDocumentStore.writeUserDoc(channelUserId, LINK_COLLECTION, channelType, {
      userId: novaUserId,
      channelType,
      linkedAt: new Date().toISOString()
    });
  },
  async delete(channelUserId: string, channelType: string) {
    const doc = await this.read(channelUserId, channelType);
    if (doc?.userId) {
      try {
        await userDocumentStore.writeUserDoc(doc.userId, LINK_COLLECTION, channelType, { unlinked: true, unlinkedAt: new Date().toISOString() });
      } catch {
      }
    }
    await userDocumentStore.writeUserDoc(channelUserId, LINK_COLLECTION, channelType, { unlinked: true, unlinkedAt: new Date().toISOString() });
  }
};

export const channelRouter: ChannelRouter = {
  async handleIncoming(message: IncomingChannelMessage) {
    const linkDoc = await typedUserDoc.read(message.channelUserId, message.channelType);
    const userId = linkDoc?.userId ?? 'system';

    try {
      const result = await runAiCommand(userId, {
        message: message.text,
        currentView: message.channelType === 'web' ? 'dashboard' : message.channelType,
        conversationId: `channel-${message.channelType}-${message.chatId}`,
        contextHints: {
          channel: message.channelType,
          channelMessageId: message.id,
          channelChatId: message.chatId,
          channelUserId: message.channelUserId
        },
        dryRun: false
      });

      const reply: OutgoingChannelMessage = {
        text: result.response,
        parseMode: 'markdown'
      };

      return { ok: true, reply };
    } catch (error) {
      return {
        ok: false,
        reply: { text: `Sorry, I encountered an error processing your message: ${(error as Error).message}` },
        error: (error as Error).message
      };
    }
  },

  async linkUser(channelUserId: string, channelType: 'telegram' | 'whatsapp' | 'web', novaUserId: string): Promise<ChannelLinkResult> {
    const existing = await typedUserDoc.read(channelUserId, channelType);
    if (existing?.userId) {
      if (existing.userId === novaUserId) {
        return { ok: true, userId: novaUserId, channelType, channelUserId, status: 'already_linked' };
      }
    }

    await typedUserDoc.write(channelUserId, channelType, novaUserId);
    return { ok: true, userId: novaUserId, channelType, channelUserId, status: 'linked' };
  },

  async unlinkUser(channelUserId: string, channelType: 'telegram' | 'whatsapp' | 'web'): Promise<ChannelLinkResult> {
    const existing = await typedUserDoc.read(channelUserId, channelType);
    if (!existing?.userId) {
      return { ok: true, userId: '', channelType, channelUserId, status: 'unlinked', error: 'No link found.' };
    }
    await typedUserDoc.delete(channelUserId, channelType);
    return { ok: true, userId: existing.userId, channelType, channelUserId, status: 'unlinked' };
  },

  async getLinkedUser(channelUserId: string, channelType: 'telegram' | 'whatsapp' | 'web'): Promise<string | null> {
    const doc = await typedUserDoc.read(channelUserId, channelType);
    return doc?.userId ?? null;
  }
};
