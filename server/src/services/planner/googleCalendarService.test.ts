import { describe, expect, it } from 'vitest';
import { mapGoogleEventToCalendarPayload } from './googleCalendarService.js';

describe('Google Calendar event mapping', () => {
  it('maps all-day Google events into Planner calendar payloads', () => {
    const payload = mapGoogleEventToCalendarPayload({
      id: 'google-event-1',
      summary: 'All day planning',
      start: { date: '2026-06-19' },
      end: { date: '2026-06-20' },
      status: 'confirmed',
      updated: '2026-06-18T10:00:00.000Z'
    }, {
      workspaceId: 'workspace-1',
      userId: 'user-1',
      calendarId: 'primary'
    });

    expect(payload.external_id).toBe('google-event-1');
    expect(payload.is_all_day).toBe(true);
    expect(payload.start_time).toBe('2026-06-19T00:00:00.000Z');
    expect(payload.recurrence_data.providerCalendarId).toBe('primary');
  });

  it('maps timed Google events with timezone information', () => {
    const payload = mapGoogleEventToCalendarPayload({
      id: 'google-event-2',
      summary: 'Deep work',
      start: { dateTime: '2026-06-19T09:00:00+03:00', timeZone: 'Asia/Amman' },
      end: { dateTime: '2026-06-19T10:00:00+03:00', timeZone: 'Asia/Amman' },
      htmlLink: 'https://calendar.google.com/calendar/event?eid=abc',
      recurrence: ['RRULE:FREQ=WEEKLY']
    }, {
      workspaceId: 'workspace-1',
      userId: 'user-1',
      calendarId: 'work-calendar'
    });

    expect(payload.is_all_day).toBe(false);
    expect(payload.timezone).toBe('Asia/Amman');
    expect(payload.is_recurring).toBe(true);
    expect(payload.recurrence_data.htmlLink).toContain('calendar.google.com');
  });
});
