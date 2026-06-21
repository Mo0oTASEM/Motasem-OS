import type { CharacterReflection } from '../types';

export interface PrivacySettings {
  reflectionsDefaultPrivacy: 'private' | 'shared' | 'public';
  aiAnalysisConsent: boolean;
  crmSharingEnabled: boolean;
  accountabilitySharingEnabled: boolean;
  proofAttachmentsPrivate: boolean;
  externalIntegrationsAllowed: boolean;
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  reflectionsDefaultPrivacy: 'private',
  aiAnalysisConsent: false,
  crmSharingEnabled: false,
  accountabilitySharingEnabled: true,
  proofAttachmentsPrivate: true,
  externalIntegrationsAllowed: false,
};

export function canShareReflectionWithCRM(reflection: CharacterReflection, settings: PrivacySettings): boolean {
  if (!settings.crmSharingEnabled) return false;
  if (reflection.privacySetting === 'private') return false;
  return reflection.privacySetting === 'public' || (reflection.privacySetting === 'shared' && settings.crmSharingEnabled);
}

export function canAIAnalyzeReflection(reflection: CharacterReflection, settings: PrivacySettings): boolean {
  if (!settings.aiAnalysisConsent) return false;
  if (reflection.privacySetting === 'private') return false;
  return true;
}

export function canShareWithAccountabilityPartner(reflection: CharacterReflection, settings: PrivacySettings): boolean {
  if (!settings.accountabilitySharingEnabled) return false;
  if (reflection.privacySetting === 'private') return false;
  return true;
}

export function filterPrivateReflections(
  reflections: CharacterReflection[],
  settings: PrivacySettings,
): CharacterReflection[] {
  return reflections.filter(r => {
    if (r.privacySetting === 'private') return false;
    if (r.privacySetting === 'shared' && !settings.accountabilitySharingEnabled) return false;
    return true;
  });
}
