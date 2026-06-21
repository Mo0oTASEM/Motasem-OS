import { google } from 'googleapis';
import { assertApprovedForAction, createApproval, markApprovalExecuted } from '../approvals/approvalService.js';
import { createCrmRepository } from '../crm/crmRepository.js';
import { getUserOAuthClient } from '../googleAuthService.js';

type PromoteOptions = {
  approvalId?: string;
  trusted?: boolean;
};

const normalized = (value?: string | null) => (value || '').trim().toLowerCase();

const contactDisplayName = (person: NonNullable<Awaited<ReturnType<typeof findMatchingContact>>>) => (
  person.names?.[0]?.displayName ||
  person.names?.[0]?.givenName ||
  person.emailAddresses?.[0]?.value ||
  person.phoneNumbers?.[0]?.value ||
  'matched contact'
);

const leadContactPayload = (
  lead: Awaited<ReturnType<ReturnType<typeof createCrmRepository>['leads']['read']>>,
  clientGroupResourceName?: string
) => {
  if (!lead) throw new Error('Lead not found.');
  const [givenName, ...familyParts] = lead.name.split(' ');
  return {
    names: [{ givenName: givenName || lead.name, familyName: familyParts.join(' ') }],
    emailAddresses: lead.email ? [{ value: lead.email }] : [],
    phoneNumbers: lead.phone ? [{ value: lead.phone }] : [],
    organizations: lead.company ? [{ name: lead.company }] : [],
    urls: lead.socialProfile ? [{ value: lead.socialProfile }] : [],
    biographies: lead.notes ? [{ value: lead.notes, contentType: 'TEXT_PLAIN' as const }] : [],
    userDefined: [
      { key: 'nova_crm_lead_id', value: lead.id },
      { key: 'nova_source', value: lead.source || 'manual' }
    ],
    ...(clientGroupResourceName ? {
      memberships: [{
        contactGroupMembership: {
          contactGroupResourceName: clientGroupResourceName
        }
      }]
    } : {})
  };
};

const findMatchingContact = async (
  people: ReturnType<typeof google.people>,
  lead: NonNullable<Awaited<ReturnType<ReturnType<typeof createCrmRepository>['leads']['read']>>>
) => {
  const email = normalized(lead.email);
  const phone = normalized(lead.phone);
  const response = await people.people.connections.list({
    resourceName: 'people/me',
    pageSize: 500,
    personFields: 'names,emailAddresses,phoneNumbers,organizations,biographies,urls,userDefined'
  });

  return (response.data.connections || []).find(person => {
    const emails = (person.emailAddresses || []).map(item => normalized(item.value));
    const phones = (person.phoneNumbers || []).map(item => normalized(item.value));
    return Boolean((email && emails.includes(email)) || (phone && phones.includes(phone)));
  }) || null;
};

const mergeMissingFields = (
  existing: NonNullable<Awaited<ReturnType<typeof findMatchingContact>>>,
  lead: NonNullable<Awaited<ReturnType<ReturnType<typeof createCrmRepository>['leads']['read']>>>,
  clientGroupResourceName?: string
) => {
  const payload = leadContactPayload(lead, clientGroupResourceName);

  const existingMemberships: { contactGroupMembership?: { contactGroupResourceName?: string } }[] = (existing as { memberships?: unknown[] }).memberships as { contactGroupMembership?: { contactGroupResourceName?: string } }[] || [];
  const clientGroupMembership: { contactGroupMembership: { contactGroupResourceName: string } } | null = clientGroupResourceName ? {
    contactGroupMembership: {
      contactGroupResourceName: clientGroupResourceName
    }
  } : null;

  const memberships: { contactGroupMembership?: { contactGroupResourceName?: string } }[] = [...existingMemberships];
  if (clientGroupMembership && !memberships.some(m => m.contactGroupMembership?.contactGroupResourceName === clientGroupResourceName)) {
    memberships.push(clientGroupMembership);
  }

  return {
    etag: existing.etag,
    names: existing.names?.length ? existing.names : payload.names,
    emailAddresses: existing.emailAddresses?.length ? existing.emailAddresses : payload.emailAddresses,
    phoneNumbers: existing.phoneNumbers?.length ? existing.phoneNumbers : payload.phoneNumbers,
    organizations: existing.organizations?.length ? existing.organizations : payload.organizations,
    urls: existing.urls?.length ? existing.urls : payload.urls,
    biographies: existing.biographies?.length ? existing.biographies : payload.biographies,
    userDefined: [
      ...(existing.userDefined || []),
      ...payload.userDefined.filter(field => !(existing.userDefined || []).some(existingField => existingField.key === field.key))
    ],
    memberships: memberships.length ? memberships : undefined
  };
};

const updateCrmPromotionState = async (
  userId: string,
  leadId: string,
  resourceName: string,
  result: string,
  duplicateWarning?: string
) => {
  const repo = createCrmRepository(userId);
  const lead = await repo.leads.read(leadId);
  if (!lead) throw new Error('Lead not found after promotion.');

  const promoted = await repo.leads.update(leadId, {
    status: 'Client',
    stage: 'won',
    googleContactResourceName: resourceName,
    externalIds: {
      ...lead.externalIds,
      googleContact: resourceName
    },
    syncStatus: 'pending'
  });
  const { contact } = await repo.promoteLead(leadId);
  const syncedContact = await repo.contacts.update(contact.id, {
    googleContactResourceName: resourceName,
    externalIds: {
      ...contact.externalIds,
      googleContact: resourceName
    },
    syncStatus: 'pending'
  });

  await repo.activities.create({
    leadId,
    contactId: syncedContact.id,
    type: 'promoted_to_google_contact',
    summary: result,
    occurredAt: new Date().toISOString(),
    payload: { resourceName, duplicateWarning },
    source: 'google_contacts',
    syncStatus: 'pending',
    externalIds: { googleContact: resourceName }
  });

  return { lead: promoted, contact: syncedContact };
};

const findOrCreateClientGroup = async (people: ReturnType<typeof google.people>) => {
  try {
    const groupsResponse = await people.contactGroups.list({
      pageSize: 100
    });
    let clientGroup = (groupsResponse.data.contactGroups || []).find(
      g => g.name === 'Clients' || g.name === 'Client' || g.formattedName === 'Clients' || g.formattedName === 'Client'
    );
    if (!clientGroup) {
      const newGroup = await people.contactGroups.create({
        requestBody: {
          contactGroup: {
            name: 'Clients'
          }
        }
      });
      clientGroup = newGroup.data;
    }
    return clientGroup;
  } catch (err) {
    console.error('Failed to find or create client group:', err);
    return null;
  }
};

export const promoteLeadToGoogleContact = async (leadId: string, userId: string, options: PromoteOptions = {}) => {
  const repo = createCrmRepository(userId);
  const lead = await repo.leads.read(leadId);
  if (!lead || lead.deletedAt) throw new Error(`Lead not found: ${leadId}`);
  if (!lead.email && !lead.phone) throw new Error('Lead needs an email or phone before it can be promoted to Google Contacts.');

  if (!options.trusted && !options.approvalId) {
    const approval = await createApproval(userId, {
      actionType: 'promoteLeadToGoogleContact',
      riskLevel: 'medium',
      targetType: 'crm_lead',
      targetId: leadId,
      reason: 'Creating or updating a Google Contact writes to an external address book.',
      payload: {
        leadId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company
      },
      integration: 'google_contacts'
    });
    return {
      status: 'pending_approval',
      approval,
      duplicateWarning: '',
      message: 'Promotion requires approval before writing to Google Contacts.'
    };
  }
  if (options.approvalId) {
    await assertApprovedForAction(userId, options.approvalId, 'promoteLeadToGoogleContact');
  }

  const auth = await getUserOAuthClient(userId);
  const people = google.people({ version: 'v1', auth });
  
  // Find or create "Clients" group
  const clientGroup = await findOrCreateClientGroup(people);
  const clientGroupResourceName = clientGroup?.resourceName || undefined;

  const existing = await findMatchingContact(people, lead);
  const duplicateWarning = existing
    ? `Existing Google Contact matched by ${lead.email ? 'email' : 'phone'}: ${contactDisplayName(existing)}`
    : '';

  const contactWrite = {
    resourceName: '',
    result: ''
  };
  if (existing?.resourceName) {
    const update = await people.people.updateContact({
      resourceName: existing.resourceName,
      updatePersonFields: 'names,emailAddresses,phoneNumbers,organizations,biographies,urls,userDefined,memberships',
      requestBody: mergeMissingFields(existing, lead, clientGroupResourceName)
    });
    contactWrite.resourceName = update.data.resourceName || existing.resourceName;
    contactWrite.result = `Updated existing Google Contact for ${lead.name} and added Client label.`;
  } else {
    const created = await people.people.createContact({
      requestBody: leadContactPayload(lead, clientGroupResourceName)
    });
    contactWrite.resourceName = created.data.resourceName || '';
    contactWrite.result = `Created Google Contact for ${lead.name} with Client label.`;
  }

  const crm = await updateCrmPromotionState(userId, leadId, contactWrite.resourceName, contactWrite.result, duplicateWarning);
  if (options.approvalId) {
    await markApprovalExecuted(userId, options.approvalId, 'promoteLeadToGoogleContact', contactWrite);
  }

  return {
    status: 'promoted',
    ...contactWrite,
    duplicateWarning,
    ...crm
  };
};

export const importGoogleClientsToCrm = async (userId: string) => {
  const auth = await getUserOAuthClient(userId);
  const people = google.people({ version: 'v1', auth });

  // 1. Find the contact group
  const groupsResponse = await people.contactGroups.list({
    pageSize: 100
  });
  const clientGroup = (groupsResponse.data.contactGroups || []).find(
    g => g.name === 'Clients' || g.name === 'Client' || g.formattedName === 'Clients' || g.formattedName === 'Client'
  );

  if (!clientGroup || !clientGroup.resourceName) {
    return { imported: 0, message: "No 'Clients' or 'Client' group found in Google Contacts." };
  }

  // 2. Get members of the group
  const groupResponse = await people.contactGroups.get({
    resourceName: clientGroup.resourceName,
    maxMembers: 1000
  });
  const memberResourceNames = groupResponse.data.memberResourceNames || [];
  if (memberResourceNames.length === 0) {
    return { imported: 0, message: "No contacts found in 'Clients' group." };
  }

  // 3. Batch get contacts details (max 50 per batch for getBatchGet)
  const batchSize = 50;
  const contacts: Record<string, unknown>[] = [];
  for (let i = 0; i < memberResourceNames.length; i += batchSize) {
    const chunk = memberResourceNames.slice(i, i + batchSize);
    const batchResponse = await people.people.getBatchGet({
      resourceNames: chunk,
      personFields: 'names,emailAddresses,phoneNumbers,organizations,biographies,urls,userDefined'
    });
    const chunkContacts = (batchResponse.data.responses || [])
      .map(r => r.person)
      .filter(Boolean) as Record<string, unknown>[];
    contacts.push(...chunkContacts);
  }

  // 4. Import/link to CRM
  const repo = createCrmRepository(userId);
  const existingLeads = await repo.listLeads();
  let importedCount = 0;

  for (const rawPerson of contacts) {
    const person = rawPerson as Record<string, unknown>;
    const resourceName = person.resourceName as string | undefined;
    if (!resourceName) continue;

    const names = person.names as { displayName?: string; givenName?: string }[] | undefined;
    const emailAddresses = person.emailAddresses as { value?: string }[] | undefined;
    const phoneNumbers = person.phoneNumbers as { value?: string }[] | undefined;
    const organizations = person.organizations as { name?: string }[] | undefined;
    const biographies = person.biographies as { value?: string }[] | undefined;
    const userDefined = person.userDefined as { key?: string; value?: string }[] | undefined;

    const name = names?.[0]?.displayName || names?.[0]?.givenName || emailAddresses?.[0]?.value || 'Unnamed Contact';
    const email = emailAddresses?.[0]?.value || '';
    const phone = phoneNumbers?.[0]?.value || '';
    const company = organizations?.[0]?.name || '';
    const notes = biographies?.[0]?.value || '';
    const source = (userDefined || []).find(ud => ud.key === 'nova_source')?.value || 'google_contacts';

    // Find if already exists by googleContactResourceName or email or phone
    let existing = existingLeads.find(l => l.googleContactResourceName === resourceName);
    if (!existing && email) {
      existing = existingLeads.find(l => l.email && l.email.toLowerCase() === email.toLowerCase());
    }
    if (!existing && phone) {
      existing = existingLeads.find(l => l.phone === phone);
    }

    if (existing) {
      // If it exists but does not have resource name, update it
      const updates: Record<string, unknown> = {};
      if (!existing.googleContactResourceName) {
        updates.googleContactResourceName = resourceName;
        updates.externalIds = {
          ...existing.externalIds,
          googleContact: resourceName
        };
      }
      if (existing.stage !== 'won' || existing.status !== 'Client') {
        updates.stage = 'won';
        updates.status = 'Client';
      }

      if (Object.keys(updates).length > 0) {
        await repo.updateLead(existing.id, updates);
        
        // Ensure corresponding contact is also promoted
        const contactList = await repo.contacts.list(1000);
        const existingContact = contactList.find(c => c.sourceLeadId === existing?.id);
        if (!existingContact) {
          await repo.promoteLead(existing.id);
        } else {
          await repo.contacts.update(existingContact.id, {
            googleContactResourceName: resourceName,
            externalIds: {
              ...existingContact.externalIds,
              googleContact: resourceName
            }
          });
        }
        importedCount++;
      }
    } else {
      // Create new lead in CRM
      const newLead = await repo.createLead({
        name,
        company,
        email,
        phone,
        source,
        status: 'Client',
        stage: 'won',
        notes,
        googleContactResourceName: resourceName,
        externalIds: {
          googleContact: resourceName
        }
      });

      // Promote to contact
      await repo.promoteLead(newLead.id);
      importedCount++;
    }
  }

  return { imported: importedCount };
};
