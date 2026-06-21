import { getSocialAccount } from './socialRegistry.js';
import type { SocialComment, SocialPost } from './socialInboxService.js';

export const listLinkedInPosts = async (): Promise<SocialPost[]> => {
  const account = getSocialAccount('linkedin');
  if (account.mode !== 'api_connected') return [];
  return [];
};

export const listLinkedInComments = async (): Promise<SocialComment[]> => {
  const account = getSocialAccount('linkedin');
  if (account.mode !== 'api_connected') return [];
  return [];
};

export const publishLinkedInReply = async (_commentId: string, _message: string) => {
  void _commentId;
  void _message;
  const account = getSocialAccount('linkedin');
  if (account.mode !== 'api_connected') {
    throw new Error('LinkedIn API is not configured. Use manual mode or connect official LinkedIn API credentials.');
  }
  throw new Error('LinkedIn reply publishing is approval-gated and not implemented until official API permissions are verified.');
};
