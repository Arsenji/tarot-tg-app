/**
 * Unit tests for subscription utility functions.
 * Focuses on Moscow-timezone daily-reset logic.
 */
import {
  getMoscowDayStart,
  isUsedToday,
  getMsUntilMoscowMidnight,
  getCooldownMsRemaining,
  getCooldownHoursRemaining,
} from '../src/utils/subscription';

describe('getMoscowDayStart', () => {
  it('returns Moscow midnight for a daytime timestamp', () => {
    // 2026-01-15 14:30:00 MSK = 11:30:00 UTC
    const date = new Date('2026-01-15T11:30:00Z');
    const start = getMoscowDayStart(date);
    // Moscow midnight = 2026-01-15 00:00 MSK = 2026-01-14 21:00 UTC
    expect(start.toISOString()).toBe('2026-01-14T21:00:00.000Z');
  });

  it('returns Moscow midnight for a late-night timestamp (before UTC midnight)', () => {
    // 2026-01-15 23:59:59 MSK = 20:59:59 UTC
    const date = new Date('2026-01-15T20:59:59Z');
    const start = getMoscowDayStart(date);
    // Moscow midnight = 2026-01-15 00:00 MSK = 2026-01-14 21:00 UTC
    expect(start.toISOString()).toBe('2026-01-14T21:00:00.000Z');
  });

  it('handles dates right after Moscow midnight', () => {
    // 2026-06-01 00:01:00 MSK = 2026-05-31 21:01:00 UTC
    const date = new Date('2026-05-31T21:01:00Z');
    const start = getMoscowDayStart(date);
    // Moscow midnight = 2026-06-01 00:00 MSK = 2026-05-31 21:00 UTC
    expect(start.toISOString()).toBe('2026-05-31T21:00:00.000Z');
  });

  it('handles dates just before Moscow midnight in UTC terms', () => {
    // 2026-03-10 20:59:00 UTC = 2026-03-10 23:59:00 MSK (still March 10th in Moscow)
    const date = new Date('2026-03-10T20:59:00Z');
    const start = getMoscowDayStart(date);
    // Moscow midnight March 10 = 2026-03-09 21:00 UTC
    expect(start.toISOString()).toBe('2026-03-09T21:00:00.000Z');
  });

  it('handles UTC midnight (which is 03:00 MSK)', () => {
    // 2026-07-20 00:00:00 UTC = 2026-07-20 03:00 MSK
    const date = new Date('2026-07-20T00:00:00Z');
    const start = getMoscowDayStart(date);
    // Moscow midnight July 20 = 2026-07-19 21:00 UTC
    expect(start.toISOString()).toBe('2026-07-19T21:00:00.000Z');
  });
});

describe('isUsedToday', () => {
  it('returns false when lastDate is null', () => {
    const now = new Date('2026-01-15T12:00:00Z');
    expect(isUsedToday(null, now)).toBe(false);
  });

  it('returns false when lastDate is undefined', () => {
    const now = new Date('2026-01-15T12:00:00Z');
    expect(isUsedToday(undefined, now)).toBe(false);
  });

  it('returns true when lastDate is same Moscow calendar day', () => {
    // now: 2026-01-15 18:00 MSK = 15:00 UTC
    // lastDate: 2026-01-15 10:00 MSK = 07:00 UTC (same day in Moscow)
    const now = new Date('2026-01-15T15:00:00Z');
    const lastDate = new Date('2026-01-15T07:00:00Z');
    expect(isUsedToday(lastDate, now)).toBe(true);
  });

  it('returns false when lastDate is previous Moscow calendar day', () => {
    // now: 2026-01-15 02:00 MSK = 2026-01-14 23:00 UTC
    // lastDate: 2026-01-14 23:00 MSK = 20:00 UTC (yesterday in Moscow)
    const now = new Date('2026-01-14T23:00:00Z');
    const lastDate = new Date('2026-01-14T20:00:00Z');
    expect(isUsedToday(lastDate, now)).toBe(false);
  });

  it('returns false when lastDate is in the future', () => {
    const now = new Date('2026-01-15T12:00:00Z');
    const lastDate = new Date('2026-01-16T12:00:00Z');
    expect(isUsedToday(lastDate, now)).toBe(false);
  });

  it('handles transition across Moscow midnight correctly', () => {
    // lastDate: 2026-01-14 23:59 MSK = 20:59 UTC (Jan 14 in Moscow)
    // now: 2026-01-15 00:01 MSK = 2026-01-14 21:01 UTC (Jan 15 in Moscow)
    const lastDate = new Date('2026-01-14T20:59:00Z');
    const now = new Date('2026-01-14T21:01:00Z');
    expect(isUsedToday(lastDate, now)).toBe(false);
  });

  it('returns true right before Moscow midnight', () => {
    // lastDate: 2026-01-15 01:00 MSK = 2026-01-14 22:00 UTC
    // now: 2026-01-15 23:59 MSK = 2026-01-15 20:59 UTC (same Moscow day)
    const lastDate = new Date('2026-01-14T22:00:00Z');
    const now = new Date('2026-01-15T20:59:00Z');
    expect(isUsedToday(lastDate, now)).toBe(true);
  });
});

describe('getMsUntilMoscowMidnight', () => {
  it('returns correct ms until Moscow midnight', () => {
    // now: 2026-01-15 23:00 MSK = 20:00 UTC
    // next midnight: 2026-01-16 00:00 MSK = 21:00 UTC
    // diff = 1 hour = 3600000 ms
    const now = new Date('2026-01-15T20:00:00Z');
    const ms = getMsUntilMoscowMidnight(now);
    expect(ms).toBe(3_600_000);
  });

  it('returns ~24h at Moscow midnight', () => {
    // now = Moscow midnight: 2026-01-15 00:00 MSK = 2026-01-14 21:00 UTC
    const now = new Date('2026-01-14T21:00:00Z');
    const ms = getMsUntilMoscowMidnight(now);
    expect(ms).toBe(24 * 60 * 60 * 1000);
  });

  it('returns small value just before Moscow midnight', () => {
    // 2026-01-15 23:59:50 MSK = 2026-01-15 20:59:50 UTC
    // next midnight: 2026-01-15 21:00:00 UTC
    const now = new Date('2026-01-15T20:59:50Z');
    const ms = getMsUntilMoscowMidnight(now);
    expect(ms).toBe(10_000);
  });

  it('returns ~12h at noon Moscow time', () => {
    // 2026-01-15 12:00 MSK = 09:00 UTC
    const now = new Date('2026-01-15T09:00:00Z');
    const ms = getMsUntilMoscowMidnight(now);
    expect(ms).toBe(12 * 60 * 60 * 1000);
  });
});

describe('getCooldownMsRemaining', () => {
  it('returns 0 when lastDate is null (never used)', () => {
    const now = new Date('2026-01-15T12:00:00Z');
    expect(getCooldownMsRemaining(null, now)).toBe(0);
  });

  it('returns 0 when lastDate was yesterday', () => {
    // now: 2026-01-15 03:00 MSK = 00:00 UTC (new Moscow day)
    // lastDate: 2026-01-14 20:00 MSK = 17:00 UTC (yesterday in Moscow)
    const now = new Date('2026-01-15T00:00:00Z');
    const lastDate = new Date('2026-01-14T17:00:00Z');
    expect(getCooldownMsRemaining(lastDate, now)).toBe(0);
  });

  it('returns positive ms when used today', () => {
    // now: 2026-01-15 12:00 MSK = 09:00 UTC
    // lastDate: 2026-01-15 10:00 MSK = 07:00 UTC (same Moscow day)
    const now = new Date('2026-01-15T09:00:00Z');
    const lastDate = new Date('2026-01-15T07:00:00Z');
    const ms = getCooldownMsRemaining(lastDate, now);
    // Until midnight = 12 hours
    expect(ms).toBe(12 * 60 * 60 * 1000);
  });
});

describe('getCooldownHoursRemaining', () => {
  it('returns 0 for 0 ms', () => {
    expect(getCooldownHoursRemaining(0)).toBe(0);
  });

  it('returns 0 for negative ms', () => {
    expect(getCooldownHoursRemaining(-5000)).toBe(0);
  });

  it('returns 1 for 1ms (ceil)', () => {
    expect(getCooldownHoursRemaining(1)).toBe(1);
  });

  it('returns 1 for exactly 1 hour', () => {
    expect(getCooldownHoursRemaining(3_600_000)).toBe(1);
  });

  it('returns 2 for 1 hour + 1ms', () => {
    expect(getCooldownHoursRemaining(3_600_001)).toBe(2);
  });

  it('returns 24 for full day', () => {
    expect(getCooldownHoursRemaining(24 * 60 * 60 * 1000)).toBe(24);
  });
});
