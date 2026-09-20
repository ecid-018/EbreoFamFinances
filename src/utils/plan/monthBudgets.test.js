import { describe, it, expect } from 'vitest';
import {
  BUDGET_SOURCE,
  indexBudgetRows,
  resolveEnvelopeBudget,
  resolveEnvelopesForMonth,
  isMonthEditable,
} from './monthBudgets.js';

// Invented figures throughout. Nothing here mirrors a real budget.
const env = (id, monthlyBudget) => ({ id, name: `env-${id}`, group: 'G', monthlyBudget });
const row = (envelopeId, monthKey, amount) => ({ envelopeId, monthKey, amount });

describe('indexBudgetRows', () => {
  it('groups by envelope and sorts newest first', () => {
    const index = indexBudgetRows([
      row('a', '2026-01', 10),
      row('a', '2026-03', 30),
      row('a', '2026-02', 20),
      row('b', '2026-05', 50),
    ]);
    expect(index.get('a').map((r) => r.monthKey)).toEqual(['2026-03', '2026-02', '2026-01']);
    expect(index.get('b')).toHaveLength(1);
  });

  it('ignores malformed rows rather than throwing', () => {
    const index = indexBudgetRows([row('a', '2026-01', 10), { amount: 5 }, null, { envelopeId: 'c' }]);
    expect(index.size).toBe(1);
  });

  it('sorts across a year boundary', () => {
    const index = indexBudgetRows([row('a', '2026-09', 1), row('a', '2027-01', 2)]);
    expect(index.get('a')[0].monthKey).toBe('2027-01');
  });
});

describe('resolveEnvelopeBudget', () => {
  const e = env('a', 100);

  it('falls back to the base when there are no rows at all', () => {
    const got = resolveEnvelopeBudget(e, indexBudgetRows([]), '2026-09');
    expect(got).toEqual({ amount: 100, source: BUDGET_SOURCE.BASE, fromMonthKey: null });
  });

  it('prefers an exact row for the viewed month', () => {
    const index = indexBudgetRows([row('a', '2026-10', 250)]);
    const got = resolveEnvelopeBudget(e, index, '2026-10');
    expect(got).toEqual({ amount: 250, source: BUDGET_SOURCE.MONTH, fromMonthKey: '2026-10' });
  });

  it('carries the nearest earlier row forward', () => {
    const index = indexBudgetRows([row('a', '2026-10', 250), row('a', '2026-12', 400)]);
    const got = resolveEnvelopeBudget(e, index, '2026-11');
    expect(got).toEqual({ amount: 250, source: BUDGET_SOURCE.CARRIED, fromMonthKey: '2026-10' });
  });

  it('does NOT let a later row leak backwards into an earlier month', () => {
    // The property the whole table exists for: writing October must leave
    // September showing the figure it always had.
    const index = indexBudgetRows([row('a', '2026-10', 250)]);
    const got = resolveEnvelopeBudget(e, index, '2026-09');
    expect(got).toEqual({ amount: 100, source: BUDGET_SOURCE.BASE, fromMonthKey: null });
  });

  it('resolves per envelope, not globally', () => {
    const index = indexBudgetRows([row('other', '2026-10', 999)]);
    expect(resolveEnvelopeBudget(e, index, '2026-10').amount).toBe(100);
  });

  it('treats an explicit zero as a real figure, not a missing one', () => {
    const index = indexBudgetRows([row('a', '2026-10', 0)]);
    const got = resolveEnvelopeBudget(e, index, '2026-10');
    expect(got.amount).toBe(0);
    expect(got.source).toBe(BUDGET_SOURCE.MONTH);
  });
});

describe('resolveEnvelopesForMonth', () => {
  const envelopes = [env('a', 100), env('b', 200)];

  it('replaces monthlyBudget with the month figure and tags the source', () => {
    const got = resolveEnvelopesForMonth(envelopes, [row('a', '2026-10', 250)], '2026-10');
    expect(got.map((e) => e.monthlyBudget)).toEqual([250, 200]);
    expect(got.map((e) => e.budgetSource)).toEqual([BUDGET_SOURCE.MONTH, BUDGET_SOURCE.BASE]);
  });

  it('leaves every other envelope field untouched', () => {
    const [a] = resolveEnvelopesForMonth(envelopes, [], '2026-09');
    expect(a.name).toBe('env-a');
    expect(a.group).toBe('G');
  });

  it('does not mutate the envelopes passed in', () => {
    resolveEnvelopesForMonth(envelopes, [row('a', '2026-10', 250)], '2026-10');
    expect(envelopes[0].monthlyBudget).toBe(100);
  });

  it('returns the base for every envelope when the table is empty', () => {
    // The pre-migration and freshly-migrated state: nothing changes anywhere.
    const got = resolveEnvelopesForMonth(envelopes, [], '2026-09');
    expect(got.map((e) => e.monthlyBudget)).toEqual([100, 200]);
  });
});

describe('isMonthEditable', () => {
  it('allows the current and future months', () => {
    expect(isMonthEditable('2026-09', '2026-09')).toBe(true);
    expect(isMonthEditable('2026-10', '2026-09')).toBe(true);
    expect(isMonthEditable('2027-01', '2026-09')).toBe(true);
  });

  it('refuses a month that has already closed', () => {
    expect(isMonthEditable('2026-08', '2026-09')).toBe(false);
    expect(isMonthEditable('2025-12', '2026-09')).toBe(false);
  });
});
