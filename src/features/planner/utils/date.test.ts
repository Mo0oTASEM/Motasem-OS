import { describe, expect, it } from 'vitest';
import { isDateKeyBetween, parseDateKey, taskDateKey, toLocalDateKey } from './date';

describe('planner date utilities', () => {
  it('formats dates as local calendar keys', () => {
    expect(toLocalDateKey(new Date(2026, 5, 19))).toBe('2026-06-19');
  });

  it('formats single-digit month and day with padding', () => {
    expect(toLocalDateKey(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(toLocalDateKey(new Date(2026, 11, 9))).toBe('2026-12-09');
  });

  it('formats leap year date correctly', () => {
    expect(toLocalDateKey(new Date(2024, 1, 29))).toBe('2024-02-29');
  });

  it('parses date keys without UTC date shifting', () => {
    const parsed = parseDateKey('2026-06-19');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(5);
    expect(parsed.getDate()).toBe(19);
  });

  it('parses date keys with single-digit month and day', () => {
    const parsed = parseDateKey('2026-01-05');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(0);
    expect(parsed.getDate()).toBe(5);
  });

  it('parses date keys with padded zeros correctly', () => {
    const parsed = parseDateKey('2026-12-01');
    expect(parsed.getMonth()).toBe(11);
    expect(parsed.getDate()).toBe(1);
  });

  it('returns empty string for task with no dates', () => {
    expect(taskDateKey({})).toBe('');
  });

  it('uses scheduledStart over deadline and scheduledEnd', () => {
    const result = taskDateKey({
      scheduledStart: '2026-06-20T08:00:00.000Z',
      deadline: '2026-06-19T08:00:00.000Z',
      scheduledEnd: '2026-06-18T08:00:00.000Z'
    });
    expect(result).toBe(toLocalDateKey(new Date('2026-06-20T08:00:00.000Z')));
  });

  it('falls back to deadline when scheduledStart is missing', () => {
    expect(taskDateKey({
      deadline: '2026-06-19T08:00:00.000Z'
    })).toBe(toLocalDateKey(new Date('2026-06-19T08:00:00.000Z')));
  });

  it('falls back to scheduledEnd when other dates are missing', () => {
    expect(taskDateKey({
      scheduledEnd: '2026-06-18T08:00:00.000Z'
    })).toBe(toLocalDateKey(new Date('2026-06-18T08:00:00.000Z')));
  });

  it('checks inclusive planner period ranges', () => {
    expect(isDateKeyBetween('2026-06-19', '2026-06-15', '2026-06-21')).toBe(true);
    expect(isDateKeyBetween('2026-06-22', '2026-06-15', '2026-06-21')).toBe(false);
  });

  it('treats start and end boundaries as inclusive', () => {
    expect(isDateKeyBetween('2026-06-15', '2026-06-15', '2026-06-21')).toBe(true);
    expect(isDateKeyBetween('2026-06-21', '2026-06-15', '2026-06-21')).toBe(true);
  });

  it('handles year-boundary date ranges', () => {
    expect(isDateKeyBetween('2025-12-31', '2025-12-28', '2026-01-04')).toBe(true);
    expect(isDateKeyBetween('2026-01-04', '2025-12-28', '2026-01-04')).toBe(true);
    expect(isDateKeyBetween('2026-01-05', '2025-12-28', '2026-01-04')).toBe(false);
  });

  it('works correctly with single-day ranges', () => {
    expect(isDateKeyBetween('2026-06-19', '2026-06-19', '2026-06-19')).toBe(true);
    expect(isDateKeyBetween('2026-06-20', '2026-06-19', '2026-06-19')).toBe(false);
  });

  it('returns empty string for task with undefined dates', () => {
    expect(taskDateKey({ scheduledStart: undefined, deadline: undefined })).toBe('');
  });
});
