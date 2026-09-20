import { describe, it, expect } from 'vitest';
import {
  PAYDAY_KINDS,
  applyPresignoffRule,
  routeGoalsLine,
  groupByDestination,
  computePaydaySplit,
} from './payday.js';

// Every figure invented.
const goal = (over = {}) => ({
  id: 'g', name: 'G', target: 100, saved: 0,
  priority: null, isSinkingFund: false, archivedAt: null, heldInAccountId: null,
  ...over,
});

const settings = (over = {}) => ({
  splitGoals: 500, splitRetirement: 200, splitTrading: 50,
  splitInsurance: 100, splitTrips: 100, splitVacationReserve: 50,
  hubAccountId: 'hub', vacationGoalId: 'vac',
  presignoffActive: false, presignoffVacationAmount: null, vacationReserveTarget: null,
  windfallGoalsPct: 90,
  ...over,
});

describe('applyPresignoffRule', () => {
  const base = { splitGoals: 500, splitVacationReserve: 50 };
  const vac = goal({ id: 'vac', target: 400, saved: 100 });

  it('does nothing when the rule is off', () => {
    const got = applyPresignoffRule(base, { settings: settings(), goals: [vac] });
    expect(got.applied).toBe(false);
    expect(got.lines).toEqual(base);
  });

  it('raises the vacation line and takes the difference from goals', () => {
    const s = settings({ presignoffActive: true, presignoffVacationAmount: 200, vacationReserveTarget: 400 });
    const got = applyPresignoffRule(base, { settings: s, goals: [vac] });
    expect(got.applied).toBe(true);
    expect(got.lines.splitVacationReserve).toBe(200);
    expect(got.lines.splitGoals).toBe(350); // 500 - (200 - 50)
    expect(got.heldBack).toBe(150);
  });

  it('lapses by itself once the reserve reaches target', () => {
    const s = settings({ presignoffActive: true, presignoffVacationAmount: 200, vacationReserveTarget: 400 });
    const got = applyPresignoffRule(base, { settings: s, goals: [goal({ id: 'vac', target: 400, saved: 400 })] });
    expect(got.applied).toBe(false);
    expect(got.lines).toEqual(base);
  });

  it('stays off when there is no goal to measure against', () => {
    const s = settings({ presignoffActive: true, presignoffVacationAmount: 200, vacationReserveTarget: 400 });
    expect(applyPresignoffRule(base, { settings: s, goals: [] }).applied).toBe(false);
  });

  it('stays off when the amount or target is missing', () => {
    const noAmount = settings({ presignoffActive: true, vacationReserveTarget: 400 });
    const noTarget = settings({ presignoffActive: true, presignoffVacationAmount: 200 });
    expect(applyPresignoffRule(base, { settings: noAmount, goals: [vac] }).applied).toBe(false);
    expect(applyPresignoffRule(base, { settings: noTarget, goals: [vac] }).applied).toBe(false);
  });
});

describe('routeGoalsLine', () => {
  it('funds the highest priority unfilled goal first', () => {
    const goals = [
      goal({ id: 'b', name: 'B', priority: 2, target: 100 }),
      goal({ id: 'a', name: 'A', priority: 1, target: 100 }),
    ];
    const { routed } = routeGoalsLine(60, goals);
    expect(routed).toEqual([{ goalId: 'a', goalName: 'A', amount: 60, accountId: null }]);
  });

  it('rolls the overshoot on to the next goal', () => {
    const goals = [
      goal({ id: 'a', name: 'A', priority: 1, target: 100, saved: 80 }),
      goal({ id: 'b', name: 'B', priority: 2, target: 100 }),
    ];
    const { routed } = routeGoalsLine(50, goals);
    expect(routed).toEqual([
      { goalId: 'a', goalName: 'A', amount: 20, accountId: null },
      { goalId: 'b', goalName: 'B', amount: 30, accountId: null },
    ]);
  });

  it('never overfunds a goal', () => {
    const { routed } = routeGoalsLine(500, [goal({ id: 'a', target: 100, saved: 90 })]);
    expect(routed[0].amount).toBe(10);
  });

  it('reports money with nowhere to go rather than dropping it', () => {
    const { routed, unrouted } = routeGoalsLine(500, [goal({ target: 100, saved: 100 })]);
    expect(routed).toEqual([]);
    expect(unrouted).toBe(500);
  });

  it('skips sinking funds — they are funded by their own split lines', () => {
    const goals = [goal({ id: 's', isSinkingFund: true, priority: 1 }), goal({ id: 'a', priority: 2 })];
    const { routed } = routeGoalsLine(50, goals);
    expect(routed.map((r) => r.goalId)).toEqual(['a']);
  });

  it('skips archived goals', () => {
    const { routed } = routeGoalsLine(50, [goal({ archivedAt: '2026-01-01', priority: 1 })]);
    expect(routed).toEqual([]);
  });

  it('sorts unprioritised goals last', () => {
    const goals = [goal({ id: 'none', name: 'None' }), goal({ id: 'p', name: 'P', priority: 9 })];
    const { routed } = routeGoalsLine(300, goals);
    expect(routed.map((r) => r.goalId)).toEqual(['p', 'none']);
  });

  it('carries each goal held-in account through for routing', () => {
    const { routed } = routeGoalsLine(50, [goal({ priority: 1, heldInAccountId: 'acc-9' })]);
    expect(routed[0].accountId).toBe('acc-9');
  });

  it('handles a zero or negative line', () => {
    expect(routeGoalsLine(0, [goal({ priority: 1 })]).routed).toEqual([]);
    expect(routeGoalsLine(-5, [goal({ priority: 1 })]).routed).toEqual([]);
  });
});

describe('groupByDestination', () => {
  const r = (over) => ({ goalId: 'g', goalName: 'G', amount: 10, accountId: null, ...over });

  it('turns a goal held elsewhere into a transfer', () => {
    const got = groupByDestination([r({ accountId: 'other' })], 'hub');
    expect(got.transfers).toHaveLength(1);
    expect(got.allocations).toHaveLength(0);
  });

  it('keeps a goal held in the hub as an allocation, with no transfer', () => {
    // The money is already in the hub; moving it to itself would be a no-op
    // transfer and a misleading ledger entry.
    const got = groupByDestination([r({ accountId: 'hub' })], 'hub');
    expect(got.transfers).toHaveLength(0);
    expect(got.allocations).toHaveLength(1);
  });

  it('treats a goal with no account as an allocation, but marks it unconfigured', () => {
    const got = groupByDestination([r({ accountId: null })], 'hub');
    expect(got.allocations).toHaveLength(1);
    expect(got.allocations[0].unconfigured).toBe(true);
  });

  it('does not mark a goal deliberately held in the hub as unconfigured', () => {
    const got = groupByDestination([r({ accountId: 'hub' })], 'hub');
    expect(got.allocations[0].unconfigured).toBe(false);
  });

  it('combines two goals in the same account into one transfer', () => {
    const got = groupByDestination(
      [r({ goalId: 'a', accountId: 'x', amount: 10 }), r({ goalId: 'b', accountId: 'x', amount: 15 })],
      'hub'
    );
    expect(got.transfers).toHaveLength(1);
    expect(got.transfers[0].amount).toBe(25);
    expect(got.transfers[0].goals).toHaveLength(2);
  });
});

describe('computePaydaySplit', () => {
  const goals = [goal({ id: 'a', name: 'A', priority: 1, target: 12345, heldInAccountId: 'other' })];

  it('returns null without settings', () => {
    expect(computePaydaySplit({ settings: null })).toBeNull();
  });

  it('uses the planned lines when the amount matches the plan', () => {
    const got = computePaydaySplit({ settings: settings(), goals });
    expect(got.difference).toBe(0);
    expect(got.lines.splitGoals).toBe(500);
    expect(got.total).toBe(1000);
  });

  it('gives a surplus to the goals line only', () => {
    const got = computePaydaySplit({ settings: settings(), goals, hubAmount: 1200 });
    expect(got.difference).toBe(200);
    expect(got.lines.splitGoals).toBe(700);
    expect(got.lines.splitRetirement).toBe(200);
  });

  it('takes a shortfall out of the goals line only', () => {
    const got = computePaydaySplit({ settings: settings(), goals, hubAmount: 800 });
    expect(got.lines.splitGoals).toBe(300);
    expect(got.lines.splitTrips).toBe(100);
  });

  it('flags a goals line driven below zero', () => {
    const got = computePaydaySplit({ settings: settings(), goals, hubAmount: 100 });
    expect(got.belowZero).toBe(true);
  });

  it('applies the pre-sign-off rule inside the full calculation', () => {
    const s = settings({ presignoffActive: true, presignoffVacationAmount: 200, vacationReserveTarget: 400 });
    const got = computePaydaySplit({ settings: s, goals: [...goals, goal({ id: 'vac', target: 400, saved: 0, isSinkingFund: true })] });
    expect(got.presignoff.applied).toBe(true);
    expect(got.lines.splitVacationReserve).toBe(200);
  });

  it('splits a windfall by percentage and routes the goals share', () => {
    const got = computePaydaySplit({ settings: settings(), goals, kind: PAYDAY_KINDS.WINDFALL, hubAmount: 1000 });
    expect(got.lines.splitGoals).toBe(900);
    expect(got.lines.splitTrips).toBe(100);
    expect(got.transfers[0].amount).toBe(900);
  });

  it('routes a goal held in the hub as an allocation, not a transfer', () => {
    const inHub = [goal({ id: 'h', priority: 1, target: 12345, heldInAccountId: 'hub' })];
    const got = computePaydaySplit({ settings: settings(), goals: inHub });
    expect(got.transfers).toHaveLength(0);
    expect(got.allocations[0].amount).toBe(500);
  });
});
