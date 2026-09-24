import { describe, it, expect } from 'vitest';
import { sumTransfersInto, sumPaydayGoalFunding, buildGuardRails } from './guardRails.js';

// Every figure invented.
const transfers = [
  { toAccountId: 'trade', date: '2026-02-10', toAmount: 100 },
  { toAccountId: 'trade', date: '2026-11-01', toAmount: 50 },
  { toAccountId: 'trade', date: '2025-12-31', toAmount: 900 }, // last year
  { toAccountId: 'other', date: '2026-03-01', toAmount: 700 }, // another account
];

describe('sumTransfersInto', () => {
  it('sums only that account, only that year', () => {
    expect(sumTransfersInto(transfers, 'trade', 2026)).toBe(150);
  });

  it('is null without an account to measure', () => {
    expect(sumTransfersInto(transfers, null, 2026)).toBeNull();
  });

  it('is zero, not null, when the account simply received nothing', () => {
    expect(sumTransfersInto(transfers, 'trade', 2024)).toBe(0);
  });
});

describe('sumPaydayGoalFunding', () => {
  const paydays = [
    { id: 'p1', date: '2026-01-15' },
    { id: 'p2', date: '2026-06-15' },
    { id: 'p0', date: '2025-06-15' },
  ];
  const allocations = [
    { paydayId: 'p1', kind: 'goal', goalId: 'trips', amount: 30 },
    { paydayId: 'p2', kind: 'goal', goalId: 'trips', amount: 20 },
    { paydayId: 'p0', kind: 'goal', goalId: 'trips', amount: 500 }, // last year
    { paydayId: 'p1', kind: 'goal', goalId: 'other', amount: 400 }, // another goal
    { paydayId: 'p1', kind: 'transfer', goalId: 'trips', amount: 900 }, // not a goal line
  ];

  it('sums this year, this goal, goal lines only', () => {
    expect(sumPaydayGoalFunding(paydays, allocations, 'trips', 2026)).toBe(50);
  });

  it('is null without a goal to measure', () => {
    expect(sumPaydayGoalFunding(paydays, allocations, null, 2026)).toBeNull();
  });
});

describe('buildGuardRails', () => {
  const accounts = [
    { id: 'a', type: 'bank', balance: 400, currency: 'PHP', countsTowardFloor: true, archivedAt: null },
  ];
  const settings = {
    bankFloorTarget: 1000,
    tradingAccountId: 'trade',
    tradingCapAnnual: 120,
    tripsGoalId: 'trips',
    tripsAnnual: 100,
  };

  it('marks a floor below its target as breached, and reads it as a minimum', () => {
    const [floor] = buildGuardRails({ accounts, planSettings: settings, year: 2026 });
    expect(floor).toMatchObject({ key: 'floor', direction: 'min', current: 400, target: 1000, isBreached: true });
  });

  it('does not call a healthy floor a breach', () => {
    const rich = [{ ...accounts[0], balance: 5000 }];
    const [floor] = buildGuardRails({ accounts: rich, planSettings: settings, year: 2026 });
    expect(floor.isBreached).toBe(false);
  });

  it('marks a cap exceeded as breached, and reads it as a maximum', () => {
    const rails = buildGuardRails({ accounts, planSettings: settings, transfers, year: 2026 });
    const trading = rails.find((r) => r.key === 'trading');
    expect(trading).toMatchObject({ direction: 'max', current: 150, target: 120, isBreached: true });
  });

  it('never calls an annual target breached — it cannot be failed part-way through the year', () => {
    const rails = buildGuardRails({
      accounts,
      planSettings: settings,
      paydays: [{ id: 'p1', date: '2026-01-15' }],
      paydayAllocations: [{ paydayId: 'p1', kind: 'goal', goalId: 'trips', amount: 0 }],
      year: 2026,
    });
    const trips = rails.find((r) => r.key === 'trips');
    expect(trips).toMatchObject({ direction: 'target', current: 0, isBreached: false });
  });

  it('leaves out rails with no figure or no target rather than showing a zero nobody chose', () => {
    const rails = buildGuardRails({ accounts, planSettings: { bankFloorTarget: 1000 }, year: 2026 });
    expect(rails.map((r) => r.key)).toEqual(['floor']);
  });

  it('returns nothing at all with no plan settings', () => {
    expect(buildGuardRails({ accounts, planSettings: null, year: 2026 })).toEqual([]);
  });
});
