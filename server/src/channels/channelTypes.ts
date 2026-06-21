export type ChannelType = 'telegram' | 'whatsapp' | 'web';

export type ChannelMessageRole = 'user' | 'assistant' | 'system';

export interface ChannelUser {
  channelUserId: string;
  channelType: ChannelType;
  displayName?: string;
  avatarUrl?: string;
}

export interface ChannelAttachment {
  type: 'image' | 'voice' | 'video' | 'document' | 'audio';
  mimeType: string;
  url?: string;
  data?: Buffer;
  fileName?: string;
  fileSize?: number;
}

export interface IncomingChannelMessage {
  id: string;
  channelType: ChannelType;
  channelUserId: string;
  chatId: string;
  text: string;
  attachments: ChannelAttachment[];
  timestamp: string;
  raw: Record<string, unknown>;
}

export interface OutgoingChannelMessage {
  text: string;
  attachments?: ChannelAttachment[];
  replyTo?: string;
  parseMode?: 'markdown' | 'html';
}

export interface ChannelLinkResult {
  ok: boolean;
  userId: string;
  channelType: ChannelType;
  channelUserId: string;
  status: 'linked' | 'already_linked' | 'unlinked';
  error?: string;
}

export interface ChannelAdapter {
  readonly type: ChannelType;
  sendMessage(channelUserId: string, message: OutgoingChannelMessage): Promise<{ ok: boolean; messageId?: string; error?: string }>;
  sendTyping(channelUserId: string): Promise<void>;
  isAvailable(): boolean;
  getHealth(): { configured: boolean; error?: string };
}

export interface ChannelRouter {
  handleIncoming(message: IncomingChannelMessage): Promise<{ ok: boolean; reply?: OutgoingChannelMessage; error?: string }>;
  linkUser(channelUserId: string, channelType: ChannelType, novaUserId: string): Promise<ChannelLinkResult>;
  unlinkUser(channelUserId: string, channelType: ChannelType): Promise<ChannelLinkResult>;
  getLinkedUser(channelUserId: string, channelType: ChannelType): Promise<string | null>;
}
