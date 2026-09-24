import { describe, it, expect } from 'vitest';
import {
  INCOME_KINDS,
  classifyIncome,
  buildChecklist,
  getIncomeKindMeta,
  isChecklistStale,
  isChecklistFinished,
  getOpenChecklists,
} from './checklist.js';

// Every figure invented.
const HUB = 'acc-hub';
const settings = {
  hubAccountId: HUB,
  tradingAccountId: 'acc-trading',
  tradingTaxAccountId: 'acc-tax',
  vacationGoalId: 'g-vac',
  vacationReserveTarget: 1000,
  tripsGoalId: 'g-trips',
  carGoalId: 'g-car',
  windfallGoalsPct: 90,
};
const goals = [
  { id: 'g-vac', name: 'Vacation reserve', target: 1000, saved: 400, isSinkingFund: true, heldInAccountId: HUB },
  { id: 'g-trips', name: 'Trips', target: 2000, saved: 0, isSinkingFund: true, heldInAccountId: HUB },
  { id: 'g-car', name: 'Car fund', target: 3000, saved: 1000, isSinkingFund: false, priority: 5, heldInAccountId: HUB },
  { id: 'g-1', name: 'First goal', target: 10000, saved: 0, priority: 1, isSinkingFund: false, heldInAccountId: HUB },
];
const income = (over = {}) => ({ id: 'i1', amount: 1000, source: 'Something', accountId: HUB, ...over });
const run = (kind, over = {}) => buildChecklist({ entry: income(over), kind, settings, goals });
const total = (items) => Math.round(items.reduce((t, i) => t + i.amount, 0) * 100) / 100;

describe('classifyIncome', () => {
  it('reads the kind a payday stamped on it', () => {
    expect(classifyIncome(income({ kind: 'pay' }), settings)).toBe(INCOME_KINDS.ALLOTMENT);
    expect(classifyIncome(income({ kind: 'signoff' }), settings)).toBe(INCOME_KINDS.LEAVE_PAY);
    expect(classifyIncome(income({ kind: 'windfall' }), settings)).toBe(INCOME_KINDS.WINDFALL);
  });

  it('treats money landing in the trading account as a payout', () => {
    expect(classifyIncome(income({ accountId: 'acc-trading' }), settings)).toBe(INCOME_KINDS.TRADING_PAYOUT);
  });

  it('matches an expected item on the schedule by name', () => {
    const schedule = [{ kind: 'incoming', isActive: true, name: 'Leave pay' }];
    expect(classifyIncome(income({ source: 'leave pay' }), settings, schedule)).toBe(INCOME_KINDS.LEAVE_PAY);
  });

  // Guessing would mean suggesting real transfers for the wrong reason.
  it('returns null when it cannot tell, so the screen asks instead', () => {
    expect(classifyIncome(income({ source: 'Mystery' }), settings)).toBeNull();
    expect(classifyIncome(null, settings)).toBeNull();
  });
});

describe('buildChecklist', () => {
  it('suggests nothing for an allotment — payday already moved that money', () => {
    const got = run(INCOME_KINDS.ALLOTMENT);
    expect(got.items).toEqual([]);
    expect(got.note).toMatch(/Payday screen/);
  });

  it('sends a remittance down the goal waterfall', () => {
    const got = run(INCOME_KINDS.REMITTANCE);
    expect(got.items).toHaveLength(1);
    expect(got.items[0]).toMatchObject({ goalId: 'g-1', amount: 1000 });
    expect(got.items[0].reason).toMatch(/priority order/);
  });

  describe('leave pay', () => {
    it('fills the vacation reserve first, then follows priority', () => {
      const got = run(INCOME_KINDS.LEAVE_PAY);
      expect(got.items.map((i) => [i.goalId, i.amount])).toEqual([['g-vac', 600], ['g-1', 400]]);
      expect(got.items[0].reason).toMatch(/finishes the vacation reserve/);
    });

    it('says the reserve is still short when the money does not close the gap', () => {
      const got = buildChecklist({ entry: income({ amount: 100 }), kind: INCOME_KINDS.LEAVE_PAY, settings, goals });
      expect(got.items[0].reason).toMatch(/still ₱500 short/);
    });
  });

  describe('an instalment', () => {
    it('goes to the car fund until it is bought', () => {
      const got = run(INCOME_KINDS.INSTALMENT);
      expect(got.items[0]).toMatchObject({ goalId: 'g-car', amount: 1000 });
      expect(got.items[0].reason).toMatch(/until the car is bought/);
    });

    it('overflows onto goal priority once the fund is full', () => {
      const bought = goals.map((g) => (g.id === 'g-car' ? { ...g, saved: 3000 } : g));
      const got = buildChecklist({ entry: income(), kind: INCOME_KINDS.INSTALMENT, settings, goals: bought });
      expect(got.items[0].goalId).toBe('g-1');
      expect(got.note).toMatch(/car fund is full/);
    });

    it('explains itself rather than guessing when no car fund is set', () => {
      const got = buildChecklist({ entry: income(), kind: INCOME_KINDS.INSTALMENT, settings: { ...settings, carGoalId: null }, goals });
      expect(got.note).toMatch(/No car fund is set/);
      expect(got.items[0].goalId).toBe('g-1');
    });
  });

  describe('a trading payout', () => {
    it('splits 50 goals / 30 tax / 20 reinvest', () => {
      const got = run(INCOME_KINDS.TRADING_PAYOUT);
      expect(got.items.map((i) => i.amount)).toEqual([500, 300]);
      expect(got.items[1].toAccountId).toBe('acc-tax');
      expect(got.note).toMatch(/₱200 stays where it is/);
    });

    // The reinvest share is the remainder, so the three parts always add back
    // to the total however the rounding falls.
    it('adds back to the total exactly on an awkward amount', () => {
      const got = buildChecklist({ entry: income({ amount: 1000.01 }), kind: INCOME_KINDS.TRADING_PAYOUT, settings, goals });
      const reinvest = Number(got.note.match(/₱([\d,]+)/)[1].replace(/,/g, ''));
      expect(total(got.items) + reinvest).toBeCloseTo(1000.01, 0);
    });

    it('still suggests the tax share when no account is set, and says so', () => {
      const got = buildChecklist({ entry: income(), kind: INCOME_KINDS.TRADING_PAYOUT, settings: { ...settings, tradingTaxAccountId: null }, goals });
      expect(got.items[1].reason).toMatch(/no account set for it/);
    });
  });

  describe('a windfall', () => {
    it('splits by the configured percentage, the rest to trips', () => {
      const got = run(INCOME_KINDS.WINDFALL);
      expect(got.items.map((i) => [i.goalId, i.amount])).toEqual([['g-1', 900], ['g-trips', 100]]);
    });

    it('falls back to goal priority when no split is set', () => {
      const got = buildChecklist({ entry: income(), kind: INCOME_KINDS.WINDFALL, settings: { ...settings, windfallGoalsPct: null }, goals });
      expect(got.note).toMatch(/No windfall split/);
    });
  });

  it('suggests nothing for money it has no rule for', () => {
    const got = run(INCOME_KINDS.OTHER);
    expect(got.items).toEqual([]);
    expect(got.note).toMatch(/Decide where it should go yourself/);
  });

  it('reports money it could not route rather than dropping it', () => {
    const tiny = [{ id: 'g-1', name: 'First', target: 10, saved: 0, priority: 1, isSinkingFund: false }];
    const got = buildChecklist({ entry: income({ amount: 500 }), kind: INCOME_KINDS.REMITTANCE, settings, goals: tiny });
    expect(got.unrouted).toBe(490);
  });

  it('survives no settings and no money', () => {
    expect(buildChecklist({}).items).toEqual([]);
    expect(buildChecklist({ entry: income({ amount: 0 }), kind: INCOME_KINDS.REMITTANCE, settings, goals }).items).toEqual([]);
  });

  it('never suggests more than arrived', () => {
    for (const kind of Object.values(INCOME_KINDS)) {
      const got = run(kind);
      expect(total(got.items)).toBeLessThanOrEqual(1000);
    }
  });
});

describe('checklist state', () => {
  const OCT = new Date(2026, 9, 10);

  it('is stale after three days, not before', () => {
    expect(isChecklistStale({ createdAt: '2026-10-08T00:00:00Z', completedAt: null }, OCT)).toBe(false);
    expect(isChecklistStale({ createdAt: '2026-10-07T00:00:00Z', completedAt: null }, OCT)).toBe(true);
  });

  it('is never stale once completed', () => {
    expect(isChecklistStale({ createdAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-02T00:00:00Z' }, OCT)).toBe(false);
  });

  it('is finished when nothing is left to do, skipped counting as done with', () => {
    expect(isChecklistFinished([{ status: 'done' }, { status: 'skipped' }])).toBe(true);
    expect(isChecklistFinished([{ status: 'done' }, { status: 'todo' }])).toBe(false);
    expect(isChecklistFinished([])).toBe(false);
  });

  it('lists only the open ones', () => {
    const all = [{ id: 'a', completedAt: null }, { id: 'b', completedAt: '2026-01-01' }];
    expect(getOpenChecklists(all).map((c) => c.id)).toEqual(['a']);
  });
});

describe('getIncomeKindMeta', () => {
  it('describes what the plan does with each kind', () => {
    expect(getIncomeKindMeta(INCOME_KINDS.LEAVE_PAY).hint).toMatch(/Vacation reserve first/);
  });

  it('falls back to "something else" for anything unrecognised', () => {
    expect(getIncomeKindMeta('nonsense').value).toBe(INCOME_KINDS.OTHER);
  });
});
