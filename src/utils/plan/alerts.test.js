import { describe, it, expect } from 'vitest';
import { buildAlerts, filterDismissed, SEVERITY } from './alerts.js';

// Every figure and date invented. Fixed clock: 15 June 2026, so the month is
// exactly half gone (15 of 30) and the year is roughly half gone.
const MID_JUNE = new Date(2026, 5, 15);
const MONTH = { year: 2026, monthIndex: 5 };

function env(id, name, monthlyBudget, spent) {
  return { id, name, monthlyBudget, spent, isOver: spent > monthlyBudget };
}

function ids(alerts) {
  return alerts.map((a) => a.id);
}

function base(over = {}) {
  return { month: MONTH, isCurrentMonth: true, ...over };
}

describe('envelope alerts', () => {
  it('raises an alert for an envelope over budget, with the overspend as the amount', () => {
    const alerts = buildAlerts(base({ envelopeStats: [env('e1', 'Food', 100, 130)] }), { today: MID_JUNE });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      id: 'env-over:e1:2026-06',
      severity: SEVERITY.ALERT,
      title: 'Food is over budget',
      amount: 30,
      tab: 'budget',
    });
  });

  it('warns when spending runs more than 20 points ahead of the month', () => {
    // Half the month gone, 80% spent — 30 points ahead.
    const alerts = buildAlerts(base({ envelopeStats: [env('e1', 'Food', 100, 80)] }), { today: MID_JUNE });
    expect(alerts[0]).toMatchObject({ id: 'env-pace:e1:2026-06', severity: SEVERITY.WARNING });
  });

  it('stays quiet when spending is merely a little ahead', () => {
    // 65% spent at 50% through: 15 points, under the threshold.
    const alerts = buildAlerts(base({ envelopeStats: [env('e1', 'Food', 100, 65)] }), { today: MID_JUNE });
    expect(alerts).toEqual([]);
  });

  it('does not judge pace in a month that has closed', () => {
    const alerts = buildAlerts(
      base({ envelopeStats: [env('e1', 'Food', 100, 80)], isCurrentMonth: false }),
      { today: MID_JUNE }
    );
    expect(alerts).toEqual([]);
  });

  it('still reports over budget in a closed month', () => {
    const alerts = buildAlerts(
      base({ envelopeStats: [env('e1', 'Food', 100, 130)], isCurrentMonth: false }),
      { today: MID_JUNE }
    );
    expect(ids(alerts)).toEqual(['env-over:e1:2026-06']);
  });

  it('ignores an envelope with no budget rather than dividing by zero', () => {
    const alerts = buildAlerts(base({ envelopeStats: [env('e1', 'Unbudgeted', 0, 500)] }), { today: MID_JUNE });
    expect(alerts).toEqual([]);
  });
});

describe('pay that was never split', () => {
  const planSettings = { hubAccountId: 'hub' };
  const entry = { id: 'i1', date: '2026-06-01', source: 'Allotment', amount: 1000, accountId: 'hub', budgetMonthKey: '2026-06' };

  it('raises an alert once the grace period has passed', () => {
    const alerts = buildAlerts(base({ planSettings, income: [entry] }), { today: MID_JUNE });
    expect(alerts[0]).toMatchObject({
      id: 'payday-missing:i1',
      severity: SEVERITY.ALERT,
      title: 'Pay arrived but was never split',
      amount: 1000,
    });
  });

  it('says nothing inside the grace period', () => {
    const fresh = { ...entry, date: '2026-06-14' };
    expect(buildAlerts(base({ planSettings, income: [fresh] }), { today: MID_JUNE })).toEqual([]);
  });

  it('says nothing once a payday has claimed that income', () => {
    const alerts = buildAlerts(
      base({
        planSettings,
        income: [entry],
        paydayAllocations: [{ kind: 'income', incomeId: 'i1', paydayId: 'p1', amount: 1000 }],
      }),
      { today: MID_JUNE }
    );
    expect(alerts).toEqual([]);
  });

  it('ignores income that did not land in a pay account', () => {
    const elsewhere = { ...entry, accountId: 'other' };
    expect(buildAlerts(base({ planSettings, income: [elsewhere] }), { today: MID_JUNE })).toEqual([]);
  });

  it('stays silent when no pay account is configured, rather than flagging every deposit', () => {
    expect(buildAlerts(base({ planSettings: {}, income: [entry] }), { today: MID_JUNE })).toEqual([]);
  });
});

describe('the goal line', () => {
  const planSettings = { splitGoals: 500 };
  const paydays = [{ id: 'p1', budgetMonthKey: '2026-06', date: '2026-06-01' }];

  it('raises an alert when a paid month moved less to goals than planned', () => {
    const alerts = buildAlerts(
      base({
        planSettings,
        paydays,
        paydayAllocations: [{ kind: 'goal', paydayId: 'p1', goalId: 'g1', amount: 300 }],
      }),
      { today: MID_JUNE }
    );
    expect(alerts[0]).toMatchObject({ id: 'goal-short:2026-06', severity: SEVERITY.ALERT, amount: 200 });
  });

  it('says nothing when the full line was moved', () => {
    const alerts = buildAlerts(
      base({
        planSettings,
        paydays,
        paydayAllocations: [{ kind: 'goal', paydayId: 'p1', goalId: 'g1', amount: 500 }],
      }),
      { today: MID_JUNE }
    );
    expect(alerts).toEqual([]);
  });

  it('says nothing before a payday exists — nothing is late that has not happened', () => {
    expect(buildAlerts(base({ planSettings, paydays: [] }), { today: MID_JUNE })).toEqual([]);
  });

  it('says nothing in a vacation month, which has no pay to split', () => {
    const alerts = buildAlerts(
      base({ planSettings, paydays, monthMode: 'vacation', paydayAllocations: [] }),
      { today: MID_JUNE }
    );
    expect(alerts).toEqual([]);
  });
});

describe('the bank floor', () => {
  const floorAccount = {
    id: 'a1', name: 'Metrobank', type: 'bank', balance: 400,
    currency: 'PHP', countsTowardFloor: true, archivedAt: null,
  };

  it('raises an alert when the floor rail is breached', () => {
    const alerts = buildAlerts(
      base({ guardRails: [{ key: 'floor', current: 400, target: 1000, isBreached: true }] }),
      { today: MID_JUNE }
    );
    expect(alerts[0]).toMatchObject({ id: 'floor-below:2026-06', severity: SEVERITY.ALERT, amount: 600 });
  });

  it('warns when money left a floor account, without claiming to know why', () => {
    const alerts = buildAlerts(
      base({
        accounts: [floorAccount],
        transactions: [{ id: 't1', accountId: 'a1', date: '2026-06-03', amount: 250 }],
      }),
      { today: MID_JUNE }
    );
    expect(alerts[0]).toMatchObject({
      id: 'floor-debit:a1:2026-06',
      severity: SEVERITY.WARNING,
      title: 'Money left Metrobank',
      amount: 250,
    });
    expect(alerts[0].detail).not.toMatch(/emergency/i);
  });

  it('counts transfers out as well as expenses, as one figure per account', () => {
    const alerts = buildAlerts(
      base({
        accounts: [floorAccount],
        transactions: [{ id: 't1', accountId: 'a1', date: '2026-06-03', amount: 250 }],
        transfers: [{ id: 'x1', fromAccountId: 'a1', date: '2026-06-09', fromAmount: 100 }],
      }),
      { today: MID_JUNE }
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].amount).toBe(350);
  });

  it('ignores movement in another month, and money coming in', () => {
    const alerts = buildAlerts(
      base({
        accounts: [floorAccount],
        transactions: [{ id: 't1', accountId: 'a1', date: '2026-05-03', amount: 250 }],
        transfers: [{ id: 'x1', toAccountId: 'a1', fromAccountId: 'other', date: '2026-06-09', fromAmount: 100 }],
      }),
      { today: MID_JUNE }
    );
    expect(alerts).toEqual([]);
  });
});

describe('the trading cap', () => {
  const rail = (current, target) => ({ key: 'trading', label: 'Trading and apps', current, target });

  it('alerts at the cap', () => {
    const alerts = buildAlerts(base({ guardRails: [rail(100, 100)] }), { today: MID_JUNE });
    expect(alerts[0]).toMatchObject({ id: 'cap-trading:2026', severity: SEVERITY.ALERT });
  });

  it('warns from three quarters used', () => {
    const alerts = buildAlerts(base({ guardRails: [rail(75, 100)] }), { today: MID_JUNE });
    expect(alerts[0]).toMatchObject({ id: 'cap-trading:2026', severity: SEVERITY.WARNING, amount: 25 });
  });

  it('says nothing below that', () => {
    expect(buildAlerts(base({ guardRails: [rail(74, 100)] }), { today: MID_JUNE })).toEqual([]);
  });
});

describe('annual funding falling behind', () => {
  it('warns when a fund is well behind the calendar', () => {
    // Mid-June is about 46% through the year; 10% funded is 36 points behind.
    const alerts = buildAlerts(
      base({ guardRails: [{ key: 'trips', label: 'Trips fund', current: 10, target: 100 }] }),
      { today: MID_JUNE }
    );
    expect(alerts[0]).toMatchObject({ id: 'funding-behind:trips:2026', severity: SEVERITY.WARNING, amount: 90 });
  });

  it('says nothing when funding is keeping up', () => {
    const alerts = buildAlerts(
      base({ guardRails: [{ key: 'trips', label: 'Trips fund', current: 45, target: 100 }] }),
      { today: MID_JUNE }
    );
    expect(alerts).toEqual([]);
  });

  it('never treats a fully funded year as a breach', () => {
    const alerts = buildAlerts(
      base({ guardRails: [{ key: 'insurance', label: 'Insurance fund', current: 100, target: 100 }] }),
      { today: MID_JUNE }
    );
    expect(alerts).toEqual([]);
  });
});

describe('goals drifting off their date', () => {
  const goal = {
    id: 'g1', name: 'Baby fund', target: 1200, saved: 100,
    createdAt: '2026-01-01T00:00:00.000Z', targetDate: '2027-01-01',
    isSinkingFund: false, archivedAt: null,
  };

  it('warns when a dated goal is more than a month behind its line', () => {
    const alerts = buildAlerts(base({ goals: [goal] }), { today: MID_JUNE });
    expect(alerts[0]).toMatchObject({ id: 'goal-drift:g1:2026-06', severity: SEVERITY.WARNING });
  });

  it('says nothing for a goal keeping pace', () => {
    expect(buildAlerts(base({ goals: [{ ...goal, saved: 550 }] }), { today: MID_JUNE })).toEqual([]);
  });

  it('leaves sinking funds and archived goals alone', () => {
    const skipped = [
      { ...goal, id: 'g2', isSinkingFund: true },
      { ...goal, id: 'g3', archivedAt: '2026-02-01T00:00:00.000Z' },
    ];
    expect(buildAlerts(base({ goals: skipped }), { today: MID_JUNE })).toEqual([]);
  });

  it('says nothing about a goal with no date to be behind', () => {
    expect(buildAlerts(base({ goals: [{ ...goal, targetDate: null }] }), { today: MID_JUNE })).toEqual([]);
  });
});

describe('the list as a whole', () => {
  it('puts alerts before warnings', () => {
    const alerts = buildAlerts(
      base({
        envelopeStats: [env('e1', 'Food', 100, 80), env('e2', 'Fuel', 100, 130)],
        guardRails: [{ key: 'floor', current: 1, target: 10, isBreached: true }],
      }),
      { today: MID_JUNE }
    );
    expect(alerts.map((a) => a.severity)).toEqual([SEVERITY.ALERT, SEVERITY.ALERT, SEVERITY.WARNING]);
  });

  it('gives every alert a unique, stable id', () => {
    const args = base({
      envelopeStats: [env('e1', 'Food', 100, 130), env('e2', 'Fuel', 100, 80)],
      goals: [{ id: 'g1', name: 'Baby', target: 1200, saved: 0, createdAt: '2026-01-01T00:00:00.000Z', targetDate: '2027-01-01' }],
    });
    const first = buildAlerts(args, { today: MID_JUNE });
    const second = buildAlerts(args, { today: MID_JUNE });
    expect(ids(first)).toEqual(ids(second));
    expect(new Set(ids(first)).size).toBe(first.length);
  });

  it('returns nothing at all for an app with no data', () => {
    expect(buildAlerts()).toEqual([]);
    expect(buildAlerts({})).toEqual([]);
  });
});

describe('filterDismissed', () => {
  const alerts = [{ id: 'a' }, { id: 'b' }];

  it('removes only what was dismissed', () => {
    expect(filterDismissed(alerts, ['a'])).toEqual([{ id: 'b' }]);
  });

  it('is a no-op with nothing dismissed', () => {
    expect(filterDismissed(alerts)).toEqual(alerts);
  });
});
