import { createApproval } from '../approvals/approvalService.js';
import { createCrmRepository } from '../crm/crmRepository.js';
import { getSocialAccount, getSocialAccounts, type SocialPlatform } from './socialRegistry.js';

export type SocialReplyTone = 'professional' | 'friendly' | 'sales' | 'helpful' | 'arabic' | 'english' | 'mixed';
export type SocialCommentStatus = 'unread' | 'unreplied' | 'drafted' | 'pending_approval' | 'handled' | 'rejected';

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  accountId: string;
  title: string;
  url?: string;
  publishedAt: string;
}

export interface SocialComment {
  id: string;
  platform: SocialPlatform;
  postId: string;
  authorName: string;
  authorHandle?: string;
  text: string;
  createdAt: string;
  status: SocialCommentStatus;
  crmLeadId?: string;
  crmContactId?: string;
  riskFlags: string[];
}

export interface SuggestedReply {
  id: string;
  commentId: string;
  tone: SocialReplyTone;
  body: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'handled';
  safeToAutoReply: boolean;
  reason: string;
  approvalId?: string;
  createdAt: string;
}

const now = () => new Date().toISOString();

const posts: SocialPost[] = [
  { id: 'ig-post-logo-reveal', platform: 'instagram', accountId: 'instagram', title: 'Logo reveal breakdown reel', publishedAt: '2026-06-12T08:30:00.000Z', url: 'manual://instagram/logo-reveal' },
  { id: 'li-post-case-study', platform: 'linkedin', accountId: 'linkedin', title: 'Motion design case study post', publishedAt: '2026-06-11T15:20:00.000Z', url: 'manual://linkedin/case-study' }
];

const comments = new Map<string, SocialComment>([
  ['comment-ig-1', {
    id: 'comment-ig-1',
    platform: 'instagram',
    postId: 'ig-post-logo-reveal',
    authorName: 'Sara Mansour',
    authorHandle: '@glowline.co',
    text: 'This style is exactly what we need for our product launch. Do you do Arabic/English versions?',
    createdAt: '2026-06-12T10:15:00.000Z',
    status: 'unreplied',
    crmLeadId: 'lead-ig-sara',
    riskFlags: []
  }],
  ['comment-li-1', {
    id: 'comment-li-1',
    platform: 'linkedin',
    postId: 'li-post-case-study',
    authorName: 'Omar Khaled',
    authorHandle: 'North Pixel',
    text: 'Great result. What timeline do you usually need for a similar launch animation?',
    createdAt: '2026-06-12T11:10:00.000Z',
    status: 'unread',
    crmLeadId: 'lead-north-pixel',
    riskFlags: ['pricing_or_timeline']
  }]
]);

const replies = new Map<string, SuggestedReply>();

const riskFlagsFor = (text: string) => {
  const flags: string[] = [];
  if (/hate|stupid|idiot|abuse|kill/i.test(text)) flags.push('abuse_or_hate');
  if (/price|cost|timeline|how long|budget/i.test(text)) flags.push('pricing_or_timeline');
  if (/link|url|website|whatsapp|phone/i.test(text)) flags.push('external_link_or_private_info');
  return flags;
};

export const safeRulesForReply = (comment: SocialComment, body: string) => {
  const flags = [...new Set([...comment.riskFlags, ...riskFlagsFor(comment.text), ...riskFlagsFor(body)])];
  const safeToAutoReply = flags.length === 0 && !/promise|guarantee|\$\d|http|www\.|phone|private/i.test(body);
  return {
    flags,
    safeToAutoReply,
    reason: safeToAutoReply
      ? 'Low-risk public reply. No promises, prices, private info, or external links detected.'
      : `Approval required: ${flags.join(', ') || 'reply contains sensitive claims'}.`
  };
};

export const listSocialInbox = async () => ({
  accounts: getSocialAccounts(),
  posts,
  comments: [...comments.values()],
  suggestedReplies: [...replies.values()],
  modeNote: 'Official APIs only. Missing API credentials keep the Social Inbox in manual mode.'
});

export const generateSuggestedReply = async (
  commentId: string,
  tone: SocialReplyTone = 'professional'
): Promise<SuggestedReply> => {
  const comment = comments.get(commentId);
  if (!comment) throw new Error('Comment not found.');
  const language = tone === 'arabic' ? 'Arabic' : tone === 'mixed' ? 'mixed Arabic/English' : 'English';
  const body = tone === 'sales'
    ? `Thanks ${comment.authorName}. This looks like a good fit. I can share a concise motion direction and a draft scope after I understand your launch goal and deadline.`
    : tone === 'arabic'
      ? `شكرا ${comment.authorName}. أقدر تعليقك. أقدر أساعدك برد عملي وواضح حسب الهدف والموعد بدون وعود أو أسعار قبل ما أفهم التفاصيل.`
      : tone === 'mixed'
        ? `Thanks ${comment.authorName}. أكيد، I can help with a clear motion direction once I know the goal, deadline, and deliverables.`
        : `Thanks ${comment.authorName}. I appreciate that. Happy to help with a clear motion direction once I understand the goal, deadline, and deliverables.`;
  const rules = safeRulesForReply(comment, body);
  const reply: SuggestedReply = {
    id: `reply-${Date.now()}`,
    commentId,
    tone,
    body,
    status: 'draft',
    safeToAutoReply: rules.safeToAutoReply,
    reason: `${rules.reason} Tone: ${language}.`,
    createdAt: now()
  };
  replies.set(reply.id, reply);
  comments.set(comment.id, { ...comment, status: 'drafted', riskFlags: rules.flags });
  return reply;
};

export const approveSuggestedReply = async (
  userId: string,
  replyId: string,
  body?: string,
  trustedAutoReply = false
) => {
  const reply = replies.get(replyId);
  if (!reply) throw new Error('Suggested reply not found.');
  const comment = comments.get(reply.commentId);
  if (!comment) throw new Error('Comment not found.');
  const finalReply = { ...reply, body: body || reply.body };
  const account = getSocialAccount(comment.platform);
  const rules = safeRulesForReply(comment, finalReply.body);

  if (trustedAutoReply && account.mode === 'api_connected' && rules.safeToAutoReply) {
    const handled: SuggestedReply = { ...finalReply, status: 'handled', safeToAutoReply: true, reason: rules.reason };
    replies.set(replyId, handled);
    comments.set(comment.id, { ...comment, status: 'handled', riskFlags: rules.flags });
    await logCrmSocialActivity(userId, comment, `Trusted auto-reply handled for ${comment.platform}.`);
    return { status: 'handled', reply: handled, published: false, note: 'Publishing adapter is intentionally disabled until platform permissions are verified.' };
  }

  const approval = await createApproval(userId, {
    actionType: 'autoReplySocialComment',
    riskLevel: 'high',
    targetType: 'social_comment',
    targetId: comment.id,
    reason: rules.reason,
    payload: {
      platform: comment.platform,
      commentId: comment.id,
      replyId,
      body: finalReply.body,
      authorName: comment.authorName
    },
    integration: comment.platform
  });
  const pending: SuggestedReply = { ...finalReply, status: 'pending_approval', safeToAutoReply: rules.safeToAutoReply, reason: rules.reason, approvalId: approval.id };
  replies.set(replyId, pending);
  comments.set(comment.id, { ...comment, status: 'pending_approval', riskFlags: rules.flags });
  await logCrmSocialActivity(userId, comment, `Queued social reply approval ${approval.id}.`);
  return { status: 'pending_approval', approval, reply: pending };
};

export const rejectSuggestedReply = async (replyId: string) => {
  const reply = replies.get(replyId);
  if (!reply) throw new Error('Suggested reply not found.');
  const rejected: SuggestedReply = { ...reply, status: 'rejected' };
  replies.set(replyId, rejected);
  return rejected;
};

export const markCommentHandled = async (userId: string, commentId: string) => {
  const comment = comments.get(commentId);
  if (!comment) throw new Error('Comment not found.');
  comments.set(commentId, { ...comment, status: 'handled' });
  await logCrmSocialActivity(userId, comment, `Marked ${comment.platform} comment handled.`);
  return comments.get(commentId);
};

const logCrmSocialActivity = async (userId: string, comment: SocialComment, summary: string) => {
  if (!comment.crmLeadId && !comment.crmContactId) return;
  const repo = createCrmRepository(userId);
  await repo.activities.create({
    leadId: comment.crmLeadId,
    contactId: comment.crmContactId,
    type: 'social_comment_reply',
    summary,
    occurredAt: now(),
    payload: { commentId: comment.id, platform: comment.platform, authorName: comment.authorName, text: comment.text },
    source: 'manual',
    syncStatus: 'pending',
    externalIds: { socialCommentId: comment.id }
  });
};
