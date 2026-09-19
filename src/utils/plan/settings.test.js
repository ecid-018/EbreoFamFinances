import { describe, it, expect } from 'vitest';
import {
  getSplitTotal, getSplitRemainder, isSplitBalanced, isPlanConfigured, resolveSplit,
} from './settings.js';

const settings = (over = {}) => ({
  payHousehold: null, payHub: null,
  splitVacationReserve: null, splitInsurance: null, splitGoals: null,
  splitTrips: null, splitRetirement: null, splitTrading: null,
  bankFloorTarget: null, vacationReserveTarget: null,
  presignoffActive: false, presignoffVacationAmount: null,
  vacationGoalId: null,
  ...over,
});

describe('getSplitTotal', () => {
  it('treats unset lines as zero without counting them as decisions', () => {
    expect(getSplitTotal(settings())).toBe(0);
    expect(getSplitTotal(null)).toBe(0);
  });
  it('sums the six lines', () => {
    expect(getSplitTotal(settings({ splitGoals: 10, splitTrips: 5, splitTrading: 1 }))).toBe(16);
  });
});

describe('getSplitRemainder', () => {
  it('is null when there is no hub figure to measure against', () => {
    expect(getSplitRemainder(settings({ splitGoals: 10 }))).toBeNull();
    expect(getSplitRemainder(null)).toBeNull();
  });
  it('reports what is left to assign, and overspend as negative', () => {
    expect(getSplitRemainder(settings({ payHub: 100, splitGoals: 40 }))).toBe(60);
    expect(getSplitRemainder(settings({ payHub: 100, splitGoals: 140 }))).toBe(-40);
  });
});

describe('isSplitBalanced', () => {
  it('is null while there is nothing to balance against', () => {
    expect(isSplitBalanced(settings())).toBeNull();
  });
  it('tolerates float dust from the numeric round trip', () => {
    expect(isSplitBalanced(settings({ payHub: 0.3, splitGoals: 0.1, splitTrips: 0.2 }))).toBe(true);
  });
  it('is false when the lines do not add up', () => {
    expect(isSplitBalanced(settings({ payHub: 100, splitGoals: 90 }))).toBe(false);
  });
});

describe('isPlanConfigured', () => {
  it('needs a hub figure and at least one split', () => {
    expect(isPlanConfigured(null)).toBe(false);
    expect(isPlanConfigured(settings())).toBe(false);
    expect(isPlanConfigured(settings({ payHub: 100 }))).toBe(false);
    expect(isPlanConfigured(settings({ payHub: 100, splitGoals: 100 }))).toBe(true);
  });
});

describe('resolveSplit — the pre-sign-off rule', () => {
  const base = settings({
    payHub: 100,
    splitVacationReserve: 40, splitInsurance: 10, splitGoals: 20,
    splitTrips: 10, splitRetirement: 10, splitTrading: 10,
    vacationReserveTarget: 1000, presignoffVacationAmount: 15,
    vacationGoalId: 'vac',
  });
  const under = [{ id: 'vac', saved: 500, target: 1000 }];
  const met = [{ id: 'vac', saved: 1000, target: 1000 }];

  it('is inactive unless switched on', () => {
    const r = resolveSplit(base, under);
    expect(r).toMatchObject({ vacation: 40, goals: 20, presignoffApplied: false });
  });

  it('holds the vacation line and moves the difference to goals while under target', () => {
    const r = resolveSplit({ ...base, presignoffActive: true }, under);
    expect(r).toMatchObject({ vacation: 15, goals: 45, presignoffApplied: true, presignoffFreed: 25 });
  });

  it('keeps the total unchanged — money is moved between lines, not created', () => {
    const on = resolveSplit({ ...base, presignoffActive: true }, under);
    const off = resolveSplit(base, under);
    const sum = (r) => r.vacation + r.insurance + r.goals + r.trips + r.retirement + r.trading;
    expect(sum(on)).toBe(sum(off));
  });

  it('lapses by itself once the reserve reaches target', () => {
    const r = resolveSplit({ ...base, presignoffActive: true }, met);
    expect(r).toMatchObject({ vacation: 40, goals: 20, presignoffApplied: false });
  });

  it('stays off when it has nothing to measure', () => {
    // No goal pointed at, and no target set: either way the rule would
    // otherwise hold the vacation line down forever with no way to lapse.
    expect(resolveSplit({ ...base, presignoffActive: true }, []).presignoffApplied).toBe(false);
    expect(
      resolveSplit({ ...base, presignoffActive: true, vacationReserveTarget: null }, under).presignoffApplied
    ).toBe(false);
  });
});
