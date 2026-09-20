import { describe, it, expect } from 'vitest';
import { MONTH_MODES, getMonthMode, isVacationMonth, getAvailableToAllocate } from './monthModes.js';

// Invented figures throughout.
const goal = (over = {}) => ({ id: 'vac', name: 'Vacation reserve', saved: 500, target: 1000, ...over });

describe('getMonthMode', () => {
  it('defaults an untagged month to sea', () => {
    expect(getMonthMode([], '2026-10')).toBe(MONTH_MODES.SEA);
    expect(getMonthMode([{ monthKey: '2026-11', mode: 'vacation' }], '2026-10')).toBe(MONTH_MODES.SEA);
  });

  it('returns the mode of a tagged month', () => {
    expect(getMonthMode([{ monthKey: '2026-10', mode: 'vacation' }], '2026-10')).toBe(MONTH_MODES.VACATION);
  });

  it('is safe with no rows at all', () => {
    expect(getMonthMode(undefined, '2026-10')).toBe(MONTH_MODES.SEA);
  });
});

describe('isVacationMonth', () => {
  it('reads as a plain predicate', () => {
    expect(isVacationMonth([{ monthKey: '2026-10', mode: 'vacation' }], '2026-10')).toBe(true);
    expect(isVacationMonth([{ monthKey: '2026-10', mode: 'sea' }], '2026-10')).toBe(false);
  });
});

describe('getAvailableToAllocate', () => {
  const planSettings = { vacationGoalId: 'vac' };

  it('uses income in a sea month', () => {
    const got = getAvailableToAllocate({ mode: 'sea', totalIncome: 900, goals: [goal()], planSettings });
    expect(got).toEqual({ amount: 900, source: 'income' });
  });

  it('uses the vacation reserve in a vacation month', () => {
    const got = getAvailableToAllocate({ mode: 'vacation', totalIncome: 0, goals: [goal()], planSettings });
    expect(got).toMatchObject({ amount: 500, source: 'vacationReserve', goalName: 'Vacation reserve' });
  });

  it('falls back to income when no vacation goal is configured', () => {
    const got = getAvailableToAllocate({ mode: 'vacation', totalIncome: 900, goals: [goal()], planSettings: {} });
    expect(got).toMatchObject({ amount: 900, source: 'income', unconfigured: true });
  });

  it('falls back to income when the configured goal no longer exists', () => {
    const got = getAvailableToAllocate({ mode: 'vacation', totalIncome: 900, goals: [], planSettings });
    expect(got).toMatchObject({ amount: 900, source: 'income', unconfigured: true });
  });

  it('survives plan settings being null', () => {
    const got = getAvailableToAllocate({ mode: 'vacation', totalIncome: 42, goals: [], planSettings: null });
    expect(got.amount).toBe(42);
  });

  it('reports an empty reserve as zero rather than falling back', () => {
    // A configured but empty reserve is a real answer: nothing to allocate.
    const got = getAvailableToAllocate({
      mode: 'vacation', totalIncome: 900, goals: [goal({ saved: 0 })], planSettings,
    });
    expect(got).toMatchObject({ amount: 0, source: 'vacationReserve' });
  });
});
