export type SocialPlatform = 'instagram' | 'linkedin';
export type SocialConnectionMode = 'api_connected' | 'manual_mode';

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  displayName: string;
  handle?: string;
  mode: SocialConnectionMode;
  requiredEnv: string[];
  missingEnv: string[];
  lastSyncAt?: string;
}

const env = (key: string) => process.env[key]?.trim() || '';

const accountStatus = (
  platform: SocialPlatform,
  displayName: string,
  requiredEnv: string[],
  handle?: string
): SocialAccount => {
  const missingEnv = requiredEnv.filter(key => !env(key));
  return {
    id: platform,
    platform,
    displayName,
    handle,
    mode: missingEnv.length ? 'manual_mode' : 'api_connected',
    requiredEnv,
    missingEnv,
    lastSyncAt: missingEnv.length ? undefined : new Date().toISOString()
  };
};

export const getSocialAccounts = (): SocialAccount[] => [
  accountStatus('instagram', 'Instagram Business', ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'], env('INSTAGRAM_HANDLE')),
  accountStatus('linkedin', 'LinkedIn Page', ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_ORGANIZATION_URN'], env('LINKEDIN_HANDLE'))
];

export const getSocialAccount = (platform: SocialPlatform) => {
  const account = getSocialAccounts().find(item => item.platform === platform);
  if (!account) throw new Error(`Unsupported social platform: ${platform}`);
  return account;
};
