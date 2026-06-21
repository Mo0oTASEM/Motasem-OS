import { getSocialAccount } from './socialRegistry.js';
import type { SocialComment, SocialPost } from './socialInboxService.js';

export const listInstagramPosts = async (): Promise<SocialPost[]> => {
  const account = getSocialAccount('instagram');
  if (account.mode !== 'api_connected') return [];
  return [];
};

export const listInstagramComments = async (): Promise<SocialComment[]> => {
  const account = getSocialAccount('instagram');
  if (account.mode !== 'api_connected') return [];
  return [];
};

export const publishInstagramReply = async (_commentId: string, _message: string) => {
  void _commentId;
  void _message;
  const account = getSocialAccount('instagram');
  if (account.mode !== 'api_connected') {
    throw new Error('Instagram API is not configured. Use manual mode or connect official Instagram Graph API credentials.');
  }
  throw new Error('Instagram reply publishing is approval-gated and not implemented until official Graph API permissions are verified.');
};
