import { describe, it, expect } from 'vitest';
import {
  PAYDAY_KINDS,
  applyPresignoffRule,
  routeGoalsLine,
  groupByDestination,
  buildRoutedLines,
  getLineSource,
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
    expect(got.transfers[0].items).toHaveLength(2);
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

describe('buildRoutedLines', () => {
  const settings2 = (over = {}) => ({
    hubAccountId: 'hub',
    insuranceGoalId: 'ins', tripsGoalId: 'trp', vacationGoalId: 'vac',
    retirementAccountId: 'ret', tradingAccountId: 'trd',
    ...over,
  });
  const sinkingGoals = [
    goal({ id: 'ins', name: 'Insurance fund', isSinkingFund: true, heldInAccountId: 'hub' }),
    goal({ id: 'trp', name: 'Trips fund', isSinkingFund: true, heldInAccountId: 'hub' }),
    goal({ id: 'vac', name: 'Vacation reserve', isSinkingFund: true, heldInAccountId: 'hub' }),
  ];
  const lines = {
    splitGoals: 0, splitInsurance: 100, splitTrips: 50,
    splitVacationReserve: 25, splitRetirement: 200, splitTrading: 10,
  };

  it('sends each sinking-fund line to its own goal', () => {
    const { items } = buildRoutedLines({ lines, settings: settings2(), goals: sinkingGoals });
    const byLine = Object.fromEntries(items.map((i) => [i.line, i]));
    expect(byLine.splitInsurance).toMatchObject({ goalId: 'ins', amount: 100 });
    expect(byLine.splitTrips).toMatchObject({ goalId: 'trp', amount: 50 });
    expect(byLine.splitVacationReserve).toMatchObject({ goalId: 'vac', amount: 25 });
  });

  it('sends retirement and trading to their accounts, with no goal', () => {
    const { items } = buildRoutedLines({ lines, settings: settings2(), goals: sinkingGoals });
    const byLine = Object.fromEntries(items.map((i) => [i.line, i]));
    expect(byLine.splitRetirement).toMatchObject({ accountId: 'ret', goalId: null, amount: 200 });
    expect(byLine.splitTrading).toMatchObject({ accountId: 'trd', goalId: null, amount: 10 });
  });

  it('marks a line whose destination is not configured', () => {
    const { items } = buildRoutedLines({ lines, settings: settings2({ retirementAccountId: null }), goals: sinkingGoals });
    expect(items.find((i) => i.line === 'splitRetirement').missingTarget).toBe(true);
  });

  it('marks a sinking line whose goal does not exist', () => {
    const { items } = buildRoutedLines({ lines, settings: settings2(), goals: [] });
    expect(items.find((i) => i.line === 'splitInsurance')).toMatchObject({ missingTarget: true, goalId: null });
  });

  it('skips a line that is zero or negative', () => {
    const { items } = buildRoutedLines({
      lines: { ...lines, splitTrading: 0, splitRetirement: -5 },
      settings: settings2(), goals: sinkingGoals,
    });
    expect(items.map((i) => i.line)).not.toContain('splitTrading');
    expect(items.map((i) => i.line)).not.toContain('splitRetirement');
  });

  it('keeps a sinking fund held in the hub as an allocation, not a transfer', () => {
    const { items } = buildRoutedLines({ lines, settings: settings2(), goals: sinkingGoals });
    const grouped = groupByDestination(items, 'hub');
    const sinkingAllocs = grouped.allocations.filter((a) => a.line.startsWith('split'));
    expect(sinkingAllocs.map((a) => a.goalId)).toEqual(expect.arrayContaining(['ins', 'trp', 'vac']));
    expect(grouped.transfers.map((t) => t.accountId)).toEqual(expect.arrayContaining(['ret', 'trd']));
  });

  it('flags a sinking line whose goal exists but has no account set', () => {
    // The goal is configured, so missingTarget is false — but the money still
    // has nowhere to go, and calling that "stays in the hub" would read as a
    // decision rather than an omission.
    const noAccount = [goal({ id: 'ins', name: 'Insurance fund', isSinkingFund: true, heldInAccountId: null })];
    const { items } = buildRoutedLines({ lines, settings: settings2(), goals: noAccount });
    const grouped = groupByDestination(items, 'hub');
    expect(grouped.allocations.find((a) => a.goalId === 'ins').unconfigured).toBe(true);
  });

  it('does not flag a sinking fund deliberately held in the hub', () => {
    const { items } = buildRoutedLines({ lines, settings: settings2(), goals: sinkingGoals });
    const grouped = groupByDestination(items, 'hub');
    expect(grouped.allocations.find((a) => a.goalId === 'ins').unconfigured).toBe(false);
  });

  it('transfers a sinking fund held somewhere other than the hub', () => {
    const elsewhere = [goal({ id: 'ins', name: 'Insurance fund', isSinkingFund: true, heldInAccountId: 'other' })];
    const { items } = buildRoutedLines({ lines, settings: settings2(), goals: elsewhere });
    const grouped = groupByDestination(items, 'hub');
    expect(grouped.transfers.find((t) => t.accountId === 'other')).toBeTruthy();
  });
});

describe('computePaydaySplit routes every line, not only goals', () => {
  it('produces a destination for all six lines', () => {
    const s = {
      splitGoals: 500, splitRetirement: 200, splitTrading: 50,
      splitInsurance: 100, splitTrips: 100, splitVacationReserve: 50,
      hubAccountId: 'hub', retirementAccountId: 'ret', tradingAccountId: 'trd',
      insuranceGoalId: 'ins', tripsGoalId: 'trp', vacationGoalId: 'vac',
      presignoffActive: false, windfallGoalsPct: 90,
    };
    const goals = [
      goal({ id: 'a', priority: 1, target: 12345, heldInAccountId: 'other' }),
      goal({ id: 'ins', name: 'I', isSinkingFund: true, heldInAccountId: 'hub' }),
      goal({ id: 'trp', name: 'T', isSinkingFund: true, heldInAccountId: 'hub' }),
      goal({ id: 'vac', name: 'V', isSinkingFund: true, heldInAccountId: 'hub' }),
    ];
    const got = computePaydaySplit({ settings: s, goals });
    const placed = [...got.transfers.flatMap((t) => t.items), ...got.allocations];
    // 500 + 200 + 50 + 100 + 100 + 50 = 1000, all of it accounted for.
    expect(placed.reduce((sum, i) => sum + i.amount, 0)).toBe(1000);
    expect(new Set(placed.map((i) => i.line)).size).toBe(6);
  });
});

describe('split line sources', () => {
  const s2 = {
    splitGoals: 300, splitRetirement: 100, splitTrading: 0, splitInsurance: 0,
    splitTrips: 0, splitVacationReserve: 0,
    hubAccountId: 'his', householdAccountId: 'hers',
    retirementAccountId: 'ret', presignoffActive: false,
  };
  const goals = [goal({ id: 'a', priority: 1, target: 12345, heldInAccountId: 'pafc' })];

  it('defaults every line to the hub when there are no rows', () => {
    expect(getLineSource('splitGoals', s2, [])).toBe('his');
    expect(getLineSource('splitRetirement', s2, [])).toBe('his');
  });

  it('uses a configured source for that line only', () => {
    const sources = [{ lineKey: 'splitGoals', accountId: 'hers' }];
    expect(getLineSource('splitGoals', s2, sources)).toBe('hers');
    expect(getLineSource('splitRetirement', s2, sources)).toBe('his');
  });

  it('falls back to the hub when the row has no account', () => {
    expect(getLineSource('splitGoals', s2, [{ lineKey: 'splitGoals', accountId: null }])).toBe('his');
  });

  it('pays the goals line out of its own source account', () => {
    const got = computePaydaySplit({
      settings: s2, goals, sources: [{ lineKey: 'splitGoals', accountId: 'hers' }],
    });
    const toPafc = got.transfers.find((t) => t.accountId === 'pafc');
    expect(toPafc.sourceAccountId).toBe('hers');
  });

  it('leaves other lines on the hub', () => {
    const got = computePaydaySplit({
      settings: s2, goals, sources: [{ lineKey: 'splitGoals', accountId: 'hers' }],
    });
    expect(got.transfers.find((t) => t.accountId === 'ret').sourceAccountId).toBe('his');
  });

  it('reports what each funding account must cover', () => {
    const got = computePaydaySplit({
      settings: s2, goals, sources: [{ lineKey: 'splitGoals', accountId: 'hers' }],
    });
    expect(got.bySource).toEqual({ hers: 300, his: 100 });
  });

  it('does not transfer a line into the account that funds it', () => {
    // Goals held in her account, funded from her account: nothing moves.
    const inHers = [goal({ id: 'a', priority: 1, target: 12345, heldInAccountId: 'hers' })];
    const got = computePaydaySplit({
      settings: s2, goals: inHers, sources: [{ lineKey: 'splitGoals', accountId: 'hers' }],
    });
    expect(got.transfers.find((t) => t.accountId === 'hers')).toBeUndefined();
    expect(got.allocations.some((a) => a.goalId === 'a')).toBe(true);
  });

  it('keeps two sources into one destination as separate transfers', () => {
    const both = [
      goal({ id: 'a', priority: 1, target: 200, heldInAccountId: 'pafc' }),
      goal({ id: 'r', name: 'R', isSinkingFund: true, heldInAccountId: 'pafc' }),
    ];
    const settings3 = { ...s2, splitInsurance: 50, insuranceGoalId: 'r' };
    const got = computePaydaySplit({
      settings: settings3, goals: both, sources: [{ lineKey: 'splitGoals', accountId: 'hers' }],
    });
    const toPafc = got.transfers.filter((t) => t.accountId === 'pafc');
    expect(toPafc).toHaveLength(2);
    expect(new Set(toPafc.map((t) => t.sourceAccountId))).toEqual(new Set(['hers', 'his']));
  });
});
