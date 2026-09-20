import { describe, it, expect } from 'vitest';
import { deriveMonthFinancials, deriveDayFinancials } from './derive.js';

// A fixed "today" so daysLeft / isCurrentMonth / isPastMonth are deterministic.
const TODAY = new Date(2026, 8, 15); // 15 Sep 2026
const SEP = { year: 2026, monthIndex: 8 };
const AUG = { year: 2026, monthIndex: 7 };
const OCT = { year: 2026, monthIndex: 9 };

const U1 = 'user-1';

function fixture() {
  return {
    envelopes: [
      { id: 'e1', name: 'Groceries', monthlyBudget: 100, group: 'Needs' },
      { id: 'e2', name: 'Fun', monthlyBudget: 0, group: 'Wants' },
      { id: 'e3', name: 'Savings', monthlyBudget: 50, group: 'Savings' },
    ],
    accounts: [
      { id: 'a1', name: 'Bank', type: 'bank', balance: 1000, currency: 'PHP', ownerId: U1 },
      { id: 'a2', name: 'USD Cash', type: 'cash', balance: 50, currency: 'USD', ownerId: U1 },
    ],
    transactions: [
      { id: 't1', date: '2026-09-03', amount: 30, note: 'veg', categoryId: 'e1', accountId: 'a1' },
      { id: 't2', date: '2026-09-10', amount: 5, note: 'arcade', categoryId: 'e2', accountId: 'a1' },
      { id: 't3', date: '2026-08-20', amount: 999, note: 'last month', categoryId: 'e1', accountId: 'a1' },
      { id: 't4', date: '2026-09-12', amount: 10, note: 'unknown', categoryId: null, accountId: 'a1' },
      { id: 't5', date: '2026-09-14', amount: 20, note: 'to savings', categoryId: 'e3', accountId: 'a1' },
      { id: 't6', date: '2026-07-01', amount: 1, note: 'old unknown', categoryId: null, accountId: null },
    ],
    income: [
      { id: 'i1', date: '2026-09-01', source: 'Salary', amount: 500, accountId: 'a1', budgetMonthKey: '2026-09' },
      { id: 'i2', date: '2026-08-30', source: 'Early pay', amount: 200, accountId: 'a1', budgetMonthKey: '2026-09' },
      { id: 'i3', date: '2026-09-05', source: 'USD gift', amount: 100, accountId: 'a2', budgetMonthKey: '2026-09' },
      { id: 'i4', date: '2026-09-06', source: 'Next month', amount: 300, accountId: 'a1', budgetMonthKey: '2026-10' },
    ],
    goals: [
      { id: 'g1', name: 'Trip', target: 1000, saved: 250 },
      { id: 'g2', name: 'Empty', target: 0, saved: 0 },
    ],
    month: SEP,
  };
}

describe('deriveMonthFinancials', () => {
  const result = deriveMonthFinancials(fixture(), { today: TODAY });

  it('counts income by budgetMonthKey, PHP only, and reports excluded USD separately', () => {
    expect(result.totalIncome).toBe(700); // i1 + i2; i3 is USD, i4 counts toward October
    expect(result.monthUsdIncome).toBe(100);
    expect(result.monthIncomeEntries.map((i) => i.id)).toEqual(['i1', 'i2', 'i3']);
  });

  it('sums spending for the viewed month only', () => {
    expect(result.totalSpent).toBe(65); // t1 + t2 + t4 + t5
  });

  it('derives budget totals, unassigned and safe-to-spend', () => {
    expect(result.totalBudget).toBe(150);
    expect(result.unassigned).toBe(550);
    expect(result.safeToSpend).toBe(635);
  });

  it('computes per-envelope spent/ratio/isOver and sorts tightest first', () => {
    const byId = Object.fromEntries(result.envelopeStats.map((e) => [e.id, e]));
    expect(byId.e1).toMatchObject({ spent: 30, ratio: 0.3, isOver: false });
    expect(byId.e2).toMatchObject({ spent: 5, ratio: Infinity, isOver: true });
    expect(byId.e3).toMatchObject({ spent: 20, ratio: 0.4, isOver: false });
    expect(result.envelopeStats.map((e) => e.id)).toEqual(['e2', 'e3', 'e1']);
    expect(result.tightestEnvelope.id).toBe('e2');
    expect(result.overBudgetEnvelopes.map((e) => e.id)).toEqual(['e2']);
  });

  it('orders envelopeStatsByHighestSpend by spent descending', () => {
    expect(result.envelopeStatsByHighestSpend.map((e) => e.id)).toEqual(['e1', 'e3', 'e2']);
  });

  it('groups envelopes in first-seen order of the ratio-sorted list with rollups', () => {
    expect(result.envelopeGroups.map((g) => g.group)).toEqual(['Wants', 'Savings', 'Needs']);
    expect(result.envelopeGroups[0]).toMatchObject({ spent: 5, budget: 0, isOver: true });
    expect(result.envelopeGroups[2]).toMatchObject({ spent: 30, budget: 100, isOver: false });
  });

  it('lists uncategorised transactions from every month, not just the viewed one', () => {
    expect(result.uncategorizedTransactions.map((t) => t.id)).toEqual(['t4', 't6']);
  });

  it('reports days left and month position for the current month', () => {
    expect(result.daysLeft).toBe(16); // 30 - 15 + 1
    expect(result.isCurrentMonth).toBe(true);
    expect(result.isPastMonth).toBe(false);
  });

  it('treats a past month as closed and a future month as fully open', () => {
    const past = deriveMonthFinancials({ ...fixture(), month: AUG }, { today: TODAY });
    expect(past.daysLeft).toBe(0);
    expect(past.isCurrentMonth).toBe(false);
    expect(past.isPastMonth).toBe(true);
    expect(past.totalSpent).toBe(999);

    const future = deriveMonthFinancials({ ...fixture(), month: OCT }, { today: TODAY });
    expect(future.daysLeft).toBe(31);
    expect(future.isCurrentMonth).toBe(false);
    expect(future.isPastMonth).toBe(false);
    expect(future.totalIncome).toBe(300); // i4 counts toward October
  });

  it('splits account balances by currency without converting', () => {
    expect(result.totalPhpAccountBalance).toBe(1000);
    expect(result.totalUsdAccountBalance).toBe(50);
    expect(result.totalReceivable).toBe(0);
  });

  it('keeps receivables out of the balance totals and reports them separately', () => {
    const withLoan = deriveMonthFinancials(
      {
        ...fixture(),
        accounts: [
          { id: 'a1', name: 'Bank', type: 'bank', balance: 1000, currency: 'PHP', ownerId: U1 },
          { id: 'a3', name: 'Lend', type: 'receivable', balance: 400, currency: 'PHP', ownerId: U1 },
        ],
      },
      { today: TODAY }
    );
    // The loan is real money, but it is owed to the household rather than
    // held by it — counting it as cash on hand would overstate what can be spent.
    expect(withLoan.totalPhpAccountBalance).toBe(1000);
    expect(withLoan.totalReceivable).toBe(400);
  });

  it('still counts a cooperative balance as held money', () => {
    const withCoop = deriveMonthFinancials(
      {
        ...fixture(),
        accounts: [{ id: 'a4', name: 'Co-op', type: 'cooperative', balance: 250, currency: 'PHP', ownerId: U1 }],
      },
      { today: TODAY }
    );
    expect(withCoop.totalPhpAccountBalance).toBe(250);
    expect(withCoop.totalReceivable).toBe(0);
  });

  it('computes goals progress and guards against a zero total target', () => {
    expect(result.goalsProgressPct).toBe(25);
    const noTargets = deriveMonthFinancials(
      { ...fixture(), goals: [{ id: 'g', name: 'x', target: 0, saved: 0 }] },
      { today: TODAY }
    );
    expect(noTargets.goalsProgressPct).toBe(0);
  });

  it("sums this month's spending in the 'Savings' group", () => {
    expect(result.savingsFundedThisMonth).toBe(20);
  });

  it('defaults today to the real clock when not supplied', () => {
    const now = new Date();
    const viewed = { year: now.getFullYear(), monthIndex: now.getMonth() };
    const r = deriveMonthFinancials({ ...fixture(), month: viewed });
    expect(r.isCurrentMonth).toBe(true);
    expect(r.isPastMonth).toBe(false);
  });
});

describe('deriveMonthFinancials with month-scoped budgets', () => {
  // Invented figures. Base budgets come from fixture(): e1=100, e2=0, e3=50.
  const base = () => deriveMonthFinancials({ ...fixture(), month: SEP }, { today: TODAY });

  it('is unchanged when no month has its own budget', () => {
    const withEmpty = deriveMonthFinancials(
      { ...fixture(), month: SEP, envelopeBudgets: [] },
      { today: TODAY }
    );
    expect(withEmpty.totalBudget).toBe(base().totalBudget);
  });

  it('uses the row for the month being viewed', () => {
    const got = deriveMonthFinancials(
      { ...fixture(), month: OCT, envelopeBudgets: [{ envelopeId: 'e1', monthKey: '2026-10', amount: 400 }] },
      { today: TODAY }
    );
    expect(got.totalBudget).toBe(450); // 400 + 0 + 50
  });

  it('leaves an earlier month on its base figure', () => {
    // The property this table exists for: October's budget must not rewrite
    // what September was measured against.
    const budgets = [{ envelopeId: 'e1', monthKey: '2026-10', amount: 400 }];
    const sep = deriveMonthFinancials({ ...fixture(), month: SEP, envelopeBudgets: budgets }, { today: TODAY });
    expect(sep.totalBudget).toBe(base().totalBudget);
    expect(sep.envelopeStats.find((e) => e.id === 'e1').monthlyBudget).toBe(100);
  });

  it('recomputes isOver against the month figure, not the base', () => {
    // e1 spends 30 in September. A September budget of 10 puts it over;
    // the base of 100 would not.
    const got = deriveMonthFinancials(
      { ...fixture(), month: SEP, envelopeBudgets: [{ envelopeId: 'e1', monthKey: '2026-09', amount: 10 }] },
      { today: TODAY }
    );
    const e1 = got.envelopeStats.find((e) => e.id === 'e1');
    expect(e1.spent).toBe(30);
    expect(e1.isOver).toBe(true);
    expect(got.overBudgetEnvelopes.map((e) => e.id)).toContain('e1');
  });

  it('carries a budget forward to later months', () => {
    const budgets = [{ envelopeId: 'e1', monthKey: '2026-08', amount: 70 }];
    const sep = deriveMonthFinancials({ ...fixture(), month: SEP, envelopeBudgets: budgets }, { today: TODAY });
    expect(sep.envelopeStats.find((e) => e.id === 'e1').monthlyBudget).toBe(70);
  });

  it('keeps group rollups consistent with the month figure', () => {
    const got = deriveMonthFinancials(
      { ...fixture(), month: OCT, envelopeBudgets: [{ envelopeId: 'e1', monthKey: '2026-10', amount: 400 }] },
      { today: TODAY }
    );
    const needs = got.envelopeGroups.find((g) => g.group === 'Needs');
    expect(needs.budget).toBe(400);
  });
});

describe('deriveMonthFinancials with month modes', () => {
  // fixture(): budgets 100 + 0 + 50 = 150. Invented figures throughout.
  const vacationGoal = { id: 'vg', name: 'Vacation reserve', target: 1000, saved: 600, saved_: 0 };
  const settings = { vacationGoalId: 'vg' };

  function run(over) {
    const f = fixture();
    return deriveMonthFinancials(
      { ...f, goals: [...f.goals, vacationGoal], month: SEP, ...over },
      { today: TODAY }
    );
  }

  it('is unchanged when no month is tagged', () => {
    const tagged = run({ monthModes: [] });
    const plain = deriveMonthFinancials({ ...fixture(), month: SEP }, { today: TODAY });
    expect(tagged.unassigned).toBe(plain.unassigned);
    expect(tagged.safeToSpend).toBe(plain.safeToSpend);
    expect(tagged.monthMode).toBe('sea');
  });

  it('measures a vacation month against the reserve, not income', () => {
    const got = run({
      monthModes: [{ monthKey: '2026-09', mode: 'vacation' }],
      planSettings: settings,
    });
    expect(got.monthMode).toBe('vacation');
    expect(got.available).toMatchObject({ amount: 600, source: 'vacationReserve' });
    expect(got.unassigned).toBe(450); // 600 reserve - 150 budgeted
  });

  it('does not report a vacation month as wildly over budget', () => {
    // The failure this exists to prevent: with no income, measuring against
    // income makes every month at home look catastrophic.
    const againstIncome = run({ monthModes: [], income: [] });
    const againstReserve = run({
      monthModes: [{ monthKey: '2026-09', mode: 'vacation' }],
      planSettings: settings,
      income: [],
    });
    expect(againstIncome.unassigned).toBeLessThan(0);
    expect(againstReserve.unassigned).toBeGreaterThan(0);
  });

  it('leaves another month alone when only one is tagged', () => {
    const got = deriveMonthFinancials(
      { ...fixture(), month: OCT, monthModes: [{ monthKey: '2026-09', mode: 'vacation' }], planSettings: settings },
      { today: TODAY }
    );
    expect(got.monthMode).toBe('sea');
    expect(got.available.source).toBe('income');
  });

  it('falls back to income when the plan names no vacation goal', () => {
    const got = run({ monthModes: [{ monthKey: '2026-09', mode: 'vacation' }], planSettings: null });
    expect(got.available).toMatchObject({ source: 'income', unconfigured: true });
  });

  it('does not change what was spent or budgeted, only what they are measured against', () => {
    const sea = run({ monthModes: [] });
    const vac = run({ monthModes: [{ monthKey: '2026-09', mode: 'vacation' }], planSettings: settings });
    expect(vac.totalSpent).toBe(sea.totalSpent);
    expect(vac.totalBudget).toBe(sea.totalBudget);
  });
});

describe('deriveMonthFinancials with payday allocations', () => {
  const payday = { id: 'p1', budgetMonthKey: '2026-09', date: '2026-09-30', total: 100, kind: 'pay' };
  const alloc = (over) => ({ id: 'a', paydayId: 'p1', kind: 'transfer', amount: 10, ...over });

  it('is unchanged with no paydays logged', () => {
    const got = deriveMonthFinancials({ ...fixture(), month: SEP, paydays: [], paydayAllocations: [] }, { today: TODAY });
    const plain = deriveMonthFinancials({ ...fixture(), month: SEP }, { today: TODAY });
    expect(got.unassigned).toBe(plain.unassigned);
    expect(got.plannedAllocations).toBe(0);
  });

  it('subtracts committed transfers and goal allocations', () => {
    const got = deriveMonthFinancials(
      {
        ...fixture(), month: SEP, paydays: [payday],
        paydayAllocations: [alloc({ amount: 20 }), alloc({ id: 'b', kind: 'goal', amount: 30 })],
      },
      { today: TODAY }
    );
    expect(got.plannedAllocations).toBe(50);
    const plain = deriveMonthFinancials({ ...fixture(), month: SEP }, { today: TODAY });
    expect(got.unassigned).toBe(plain.unassigned - 50);
  });

  it('excludes income allocations, which would subtract the income twice', () => {
    const got = deriveMonthFinancials(
      { ...fixture(), month: SEP, paydays: [payday], paydayAllocations: [alloc({ kind: 'income', amount: 999 })] },
      { today: TODAY }
    );
    expect(got.plannedAllocations).toBe(0);
  });

  it('ignores allocations belonging to another month', () => {
    const other = { ...payday, id: 'p2', budgetMonthKey: '2026-10' };
    const got = deriveMonthFinancials(
      { ...fixture(), month: SEP, paydays: [other], paydayAllocations: [alloc({ paydayId: 'p2', amount: 40 })] },
      { today: TODAY }
    );
    expect(got.plannedAllocations).toBe(0);
  });
});

describe('deriveDayFinancials', () => {
  it('collects a day of expenses with envelope and account resolved', () => {
    const day = deriveDayFinancials(fixture(), '2026-09-03');
    expect(day.daySpent).toBe(30);
    expect(day.dayIncome).toBe(0);
    expect(day.dayNet).toBe(-30);
    expect(day.activity).toHaveLength(1);
    expect(day.activity[0]).toMatchObject({ kind: 'expense', id: 't1', note: 'veg' });
    expect(day.activity[0].envelope.id).toBe('e1');
    expect(day.activity[0].account.id).toBe('a1');
    expect(day.envelopeSpending.map((e) => e.id)).toEqual(['e1']);
  });

  it('counts PHP income on the day and keeps USD income separate', () => {
    const payday = deriveDayFinancials(fixture(), '2026-09-01');
    expect(payday.dayIncome).toBe(500);
    expect(payday.dayNet).toBe(500);
    expect(payday.activity[0]).toMatchObject({ kind: 'income', id: 'i1', note: 'Salary' });

    const usdDay = deriveDayFinancials(fixture(), '2026-09-05');
    expect(usdDay.dayIncome).toBe(0);
    expect(usdDay.dayUsdIncome).toBe(100);
  });

  it('returns empty structures for a day with nothing logged', () => {
    const quiet = deriveDayFinancials(fixture(), '2026-09-20');
    expect(quiet).toMatchObject({ dayIncome: 0, daySpent: 0, dayNet: 0 });
    expect(quiet.activity).toEqual([]);
    expect(quiet.envelopeSpending).toEqual([]);
  });
});
