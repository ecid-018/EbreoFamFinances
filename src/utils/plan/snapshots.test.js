import { describe, it, expect } from 'vitest';
import {
  hasSnapshot,
  getLatestSnapshot,
  getMonthsNeedingSnapshot,
  getMonthToAutoSnapshot,
  formatMonthKey,
  getEarliestActivityMonth,
} from './snapshots.js';

// Fixed clock so nothing depends on when the suite runs.
const SEP_2026 = new Date(2026, 8, 23); // 23 Sep 2026
const snap = (monthKey) => ({ monthKey, takenOn: '2026-01-01', totalPhp: 0 });

describe('hasSnapshot', () => {
  it('finds a month that has one', () => {
    expect(hasSnapshot([snap('2026-08')], '2026-08')).toBe(true);
  });

  it('is false for a month that does not, and for no snapshots at all', () => {
    expect(hasSnapshot([snap('2026-08')], '2026-07')).toBe(false);
    expect(hasSnapshot([], '2026-08')).toBe(false);
    expect(hasSnapshot(undefined, '2026-08')).toBe(false);
  });
});

describe('getLatestSnapshot', () => {
  it('returns the newest by month key', () => {
    const got = getLatestSnapshot([snap('2026-07'), snap('2026-09'), snap('2026-08')]);
    expect(got.monthKey).toBe('2026-09');
  });

  it('compares across a year boundary', () => {
    expect(getLatestSnapshot([snap('2026-12'), snap('2027-01')]).monthKey).toBe('2027-01');
  });

  it('is null with none', () => {
    expect(getLatestSnapshot([])).toBeNull();
  });
});

describe('getMonthsNeedingSnapshot', () => {
  it('never includes the current month, which has not finished', () => {
    // A figure taken today would claim to be the month's closing position.
    expect(getMonthsNeedingSnapshot(SEP_2026, [])).not.toContain('2026-09');
  });

  it('starts from the month that just ended, oldest first', () => {
    const got = getMonthsNeedingSnapshot(SEP_2026, []);
    expect(got[got.length - 1]).toBe('2026-08');
    expect(got[0] < got[got.length - 1]).toBe(true);
  });

  it('skips months already recorded', () => {
    const got = getMonthsNeedingSnapshot(SEP_2026, [snap('2026-08'), snap('2026-07')]);
    expect(got).not.toContain('2026-08');
    expect(got).not.toContain('2026-07');
    expect(got).toContain('2026-06');
  });

  it('is empty when everything in range is recorded', () => {
    const all = getMonthsNeedingSnapshot(SEP_2026, []);
    expect(getMonthsNeedingSnapshot(SEP_2026, all.map(snap))).toEqual([]);
  });

  it('caps the backfill rather than walking all history', () => {
    expect(getMonthsNeedingSnapshot(SEP_2026, []).length).toBeLessThanOrEqual(12);
  });

  it('stops at the month the household actually started', () => {
    // Otherwise a two-month-old app reports a year of lost months.
    expect(getMonthsNeedingSnapshot(SEP_2026, [], '2026-08')).toEqual(['2026-08']);
    expect(getMonthsNeedingSnapshot(SEP_2026, [], '2026-07')).toEqual(['2026-07', '2026-08']);
  });

  it('falls back to the cap when activity start is unknown', () => {
    expect(getMonthsNeedingSnapshot(SEP_2026, [], null).length).toBe(12);
  });

  it('crosses a year boundary correctly', () => {
    const got = getMonthsNeedingSnapshot(new Date(2027, 0, 15), []); // Jan 2027
    expect(got).toContain('2026-12');
    expect(got).not.toContain('2027-01');
  });
});

describe('getMonthToAutoSnapshot', () => {
  it('is the month that just ended', () => {
    expect(getMonthToAutoSnapshot(SEP_2026, [])).toBe('2026-08');
  });

  it('is null once that month is recorded', () => {
    expect(getMonthToAutoSnapshot(SEP_2026, [snap('2026-08')])).toBeNull();
  });

  it('does not offer to auto-record older gaps', () => {
    // Those would be written with today's balances while claiming to be a
    // historical position, so they stay a deliberate choice.
    expect(getMonthToAutoSnapshot(SEP_2026, [snap('2026-08')])).toBeNull();
  });

  it('crosses a year boundary', () => {
    expect(getMonthToAutoSnapshot(new Date(2027, 0, 2), [])).toBe('2026-12');
  });
});

describe('formatMonthKey', () => {
  it('reads as a month and year', () => {
    expect(formatMonthKey('2026-08')).toBe('August 2026');
    expect(formatMonthKey('2027-01')).toBe('January 2027');
  });
});

describe('getEarliestActivityMonth', () => {
  it('finds the oldest month across every dated list', () => {
    const got = getEarliestActivityMonth({
      transactions: [{ date: '2026-09-03' }],
      income: [{ date: '2026-07-28' }],
      transfers: [{ date: '2026-08-15' }],
    });
    expect(got).toBe('2026-07');
  });

  it('is null when there is nothing dated', () => {
    expect(getEarliestActivityMonth({})).toBeNull();
    expect(getEarliestActivityMonth()).toBeNull();
  });

  it('ignores rows with no usable date', () => {
    expect(getEarliestActivityMonth({ transactions: [{}, { date: null }, { date: '2026-05-01' }] })).toBe('2026-05');
  });
});
