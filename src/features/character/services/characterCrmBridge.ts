import type { CharacterReflection } from '../types';

export type CrmLinkRole =
  | 'accountability_partner'
  | 'mentor'
  | 'sales_prospect'
  | 'networking_challenge'
  | 'follow_up_quest'
  | 'communication_practice'
  | 'client_negotiation';

export interface CrmLinkRequest {
  contactId: string;
  role: CrmLinkRole;
  characterEntityType: string;
  characterEntityId: string;
  characterEntityName: string;
  note: string;
  allowReflectionSync: boolean;
}

export function buildFollowUpQuest(contactName: string, contactId: string): Omit<CrmLinkRequest, 'characterEntityType' | 'characterEntityId' | 'characterEntityName'> {
  return {
    contactId,
    role: 'follow_up_quest',
    note: `Follow up with ${contactName}`,
    allowReflectionSync: false,
  };
}

export function buildAccountabilityLink(contactName: string, contactId: string): Omit<CrmLinkRequest, 'characterEntityType' | 'characterEntityId' | 'characterEntityName'> {
  return {
    contactId,
    role: 'accountability_partner',
    note: `${contactName} is my accountability partner`,
    allowReflectionSync: false,
  };
}

export function buildNetworkingQuestLink(contactName: string, contactId: string, eventName: string): Omit<CrmLinkRequest, 'characterEntityType' | 'characterEntityId' | 'characterEntityName'> {
  return {
    contactId,
    role: 'networking_challenge',
    note: `Networking exposure: Connect with ${contactName} at ${eventName}`,
    allowReflectionSync: false,
  };
}

export function buildSalesConfidenceReflectionLink(reflection: CharacterReflection, contactName: string, contactId: string): CrmLinkRequest {
  return {
    contactId,
    role: 'client_negotiation',
    characterEntityType: 'reflection',
    characterEntityId: reflection.id,
    characterEntityName: 'Sales Reflection',
    note: `Sales confidence reflection related to ${contactName}`,
    allowReflectionSync: true,
  };
}
