// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  BASE_GOOGLE_SCOPES,
  ALL_GOOGLE_SCOPES,
  SERVICE_SCOPES,
  getScopesForServices,
  hasRequiredScopes,
  type GoogleServiceName,
} from '../googleScopeRegistry.js';

describe('googleScopeRegistry', () => {
  describe('BASE_GOOGLE_SCOPES', () => {
    it('includes email and profile', () => {
      expect(BASE_GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/userinfo.email');
      expect(BASE_GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/userinfo.profile');
    });

    it('has openid, email, and profile (3 base scopes)', () => {
      expect(BASE_GOOGLE_SCOPES).toHaveLength(3);
    });
  });

  describe('ALL_GOOGLE_SCOPES', () => {
    it('includes all service scopes', () => {
      expect(ALL_GOOGLE_SCOPES.length).toBeGreaterThan(BASE_GOOGLE_SCOPES.length);
    });

    it('contains gmail modify scope', () => {
      expect(ALL_GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/gmail.modify');
    });

    it('contains calendar scope', () => {
      expect(ALL_GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/calendar.events');
    });

    it('contains tasks scope', () => {
      expect(ALL_GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/tasks');
    });

    it('contains drive scope', () => {
      expect(ALL_GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/drive.file');
    });

    it('contains sheets scope', () => {
      expect(ALL_GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/spreadsheets');
    });

    it('contains docs scope', () => {
      expect(ALL_GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/documents');
    });

    it('contains contacts scope', () => {
      expect(ALL_GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/contacts');
    });
  });

  describe('SERVICE_SCOPES', () => {
    it('has entries for all 7 Google services', () => {
      const expected: GoogleServiceName[] = ['gmail', 'calendar', 'drive', 'tasks', 'contacts', 'sheets', 'docs'];
      expect(Object.keys(SERVICE_SCOPES).sort()).toEqual(expected.sort());
    });

    it('gmail has modify scope in scopes array', () => {
      expect(SERVICE_SCOPES.gmail.scopes).toContain('https://www.googleapis.com/auth/gmail.modify');
    });

    it('calendar has events scope in scopes array', () => {
      expect(SERVICE_SCOPES.calendar.scopes).toContain('https://www.googleapis.com/auth/calendar.events');
    });

    it('tasks has tasks scope in scopes array', () => {
      expect(SERVICE_SCOPES.tasks.scopes).toContain('https://www.googleapis.com/auth/tasks');
    });

    it('drive has drive.file scope in scopes array', () => {
      expect(SERVICE_SCOPES.drive.scopes).toContain('https://www.googleapis.com/auth/drive.file');
    });

    it('contacts has contacts scope in scopes array', () => {
      expect(SERVICE_SCOPES.contacts.scopes).toContain('https://www.googleapis.com/auth/contacts');
    });

    it('sheets has spreadsheets scope in scopes array', () => {
      expect(SERVICE_SCOPES.sheets.scopes).toContain('https://www.googleapis.com/auth/spreadsheets');
    });

    it('docs has documents scope in scopes array', () => {
      expect(SERVICE_SCOPES.docs.scopes).toContain('https://www.googleapis.com/auth/documents');
    });
  });

  describe('getScopesForServices', () => {
    it('returns base + requested service scopes', () => {
      const scopes = getScopesForServices(['gmail']);
      expect(scopes).toContain('https://www.googleapis.com/auth/userinfo.email');
      expect(scopes).toContain('https://www.googleapis.com/auth/gmail.modify');
    });

    it('returns services for multiple services', () => {
      const scopes = getScopesForServices(['gmail', 'calendar']);
      expect(scopes).toContain('https://www.googleapis.com/auth/gmail.modify');
      expect(scopes).toContain('https://www.googleapis.com/auth/calendar.events');
    });

    it('returns only base scopes for empty list', () => {
      const scopes = getScopesForServices([]);
      expect(scopes).toEqual(BASE_GOOGLE_SCOPES);
    });

    it('deduplicates overlapping scopes', () => {
      const scopes = getScopesForServices(['gmail', 'gmail']);
      const emailCount = scopes.filter(s => s === 'https://www.googleapis.com/auth/gmail.modify').length;
      expect(emailCount).toBe(1);
    });
  });

  describe('hasRequiredScopes', () => {
    it('returns true if all required scopes are present', () => {
      const all = [...BASE_GOOGLE_SCOPES, ...ALL_GOOGLE_SCOPES];
      expect(hasRequiredScopes(all, getScopesForServices(['gmail', 'calendar']))).toBe(true);
    });

    it('returns false if required scopes are missing', () => {
      expect(hasRequiredScopes(BASE_GOOGLE_SCOPES, getScopesForServices(['gmail']))).toBe(false);
    });
  });
});
