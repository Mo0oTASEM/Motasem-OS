import { config } from '../config.js';
import { ingestMemoryItem } from './memoryService.js';
import { transcribeAudioWithSecondBrain } from './aiBrain/secondBrainRouter.js';
import { userDocumentStore } from './userDocumentStore.js';

interface TelegramVoiceMessage {
  message_id?: number;
  date?: number;
  from?: { id?: number; username?: string; first_name?: string; last_name?: string };
  chat?: { id?: number };
  caption?: string;
  voice?: { file_id: string; file_unique_id?: string; duration?: number; mime_type?: string };
}

interface TelegramUpdate {
  update_id?: number;
  message?: TelegramVoiceMessage;
}

const telegramApi = (method: string) => `https://api.telegram.org/bot${config.telegramBotToken}/${method}`;

const getTelegramFileUrl = async (fileId: string) => {
  const response = await fetch(telegramApi(`getFile?file_id=${encodeURIComponent(fileId)}`));
  if (!response.ok) throw new Error(`Telegram getFile failed: ${response.status}`);
  const payload = await response.json() as { ok: boolean; result?: { file_path?: string } };
  if (!payload.ok || !payload.result?.file_path) throw new Error('Telegram did not return file path.');
  return `https://api.telegram.org/file/bot${config.telegramBotToken}/${payload.result.file_path}`;
};

const transcribeWithGemini = async (audioBuffer: Buffer, mimeType: string) => {
  const result = await transcribeAudioWithSecondBrain(
    'telegram_transcription',
    'Transcribe this voice memo faithfully. Then add a short "Memory summary" sentence.',
    { mimeType, data: audioBuffer }
  );
  return result.output;
};

export const handleTelegramWebhook = async (userId: string, update: TelegramUpdate) => {
  if (!config.telegramBotToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured.');
  }

  const message = update.message;
  if (!message?.voice?.file_id) {
    return { ignored: true, reason: 'Update did not include a voice message.' };
  }

  const fileUrl = await getTelegramFileUrl(message.voice.file_id);
  const fileResponse = await fetch(fileUrl);
  if (!fileResponse.ok) throw new Error(`Telegram file download failed: ${fileResponse.status}`);

  const audioBuffer = Buffer.from(await fileResponse.arrayBuffer());
  const mimeType = message.voice.mime_type || 'audio/ogg';
  const transcript = await transcribeWithGemini(audioBuffer, mimeType);
  const sender = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || message.from?.username || 'Telegram';
  const createdAt = message.date ? new Date(message.date * 1000).toISOString() : new Date().toISOString();

  const memory = await ingestMemoryItem(userId, {
    id: `telegram-voice-${message.voice.file_unique_id || message.message_id || Date.now()}`,
    type: 'voice_capture',
    title: `Telegram voice memo from ${sender}`,
    content: transcript,
    source: 'telegram',
    sourceId: message.voice.file_unique_id || message.voice.file_id,
    createdAt,
    updatedAt: new Date().toISOString(),
    tags: ['telegram', 'voice', 'transcribed'],
    links: [],
    aiSummary: transcript.split('\n').find(line => line.toLowerCase().includes('memory summary')) || transcript.slice(0, 220),
    importanceScore: 78,
    relatedEntityIds: []
  });

  await userDocumentStore.writeUserDoc(userId, 'sync_state', 'telegram', {
    userId,
    service: 'telegram',
    status: 'connected',
    lastSyncAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'telegram',
    tags: ['telegram', 'voice'],
    links: [],
    importanceScore: 75
  });

  return { ok: true, memoryId: memory.id, transcript };
};
