// What a payday does with the money, decided before anything is written.
//
// Pure and unit-tested because this is the one place the plan turns into actual
// movements of money. Everything here works in plain numbers; the RPC does the
// writing, and it calls the same add_income / add_transfer / contribute_to_goal
// the rest of the app uses rather than repeating their logic.

import { SPLIT_FIELDS } from './settings.js';

export const PAYDAY_KINDS = { PAY: 'pay', WINDFALL: 'windfall' };

// The split lines come from SPLIT_FIELDS rather than a list of their own. A
// second copy here would be one more place to forget when a line is added, and
// the two would disagree silently.
export { SPLIT_FIELDS } from './settings.js';

function round2(n) {
  return Math.round(n * 100) / 100;
}

// The pre-sign-off rule. While the rule is active and the vacation reserve is
// short of its target, the vacation line is raised to a fixed amount and the
// difference comes out of the goals line. It lapses by itself the moment the
// reserve reaches target — nobody has to remember to turn it off.
export function applyPresignoffRule(lines, { settings, goals }) {
  if (!settings?.presignoffActive) return { lines, applied: false };

  const amount = settings.presignoffVacationAmount;
  const target = settings.vacationReserveTarget;
  if (amount == null || target == null) return { lines, applied: false };

  const goal = goals.find((g) => g.id === settings.vacationGoalId);
  // No goal to measure means no way to know when to stop, so the rule stays off
  // rather than running forever.
  if (!goal || goal.saved >= target) return { lines, applied: false };

  const difference = amount - (lines.splitVacationReserve ?? 0);
  return {
    lines: {
      ...lines,
      splitVacationReserve: amount,
      splitGoals: round2((lines.splitGoals ?? 0) - difference),
    },
    applied: true,
    heldBack: difference,
  };
}

// Where the goals line actually goes: the highest-priority non-sinking goal
// that is not yet full, then the next, until the money runs out. A goal only
// takes what it still needs, so an overshoot rolls on rather than overfunding.
export function routeGoalsLine(amount, goals) {
  const candidates = goals
    .filter((g) => !g.isSinkingFund && !g.archivedAt && g.saved < g.target)
    .sort((a, b) => {
      // Unprioritised goals sort last; the plan funds what it has ordered.
      if (a.priority == null && b.priority == null) return a.name.localeCompare(b.name);
      if (a.priority == null) return 1;
      if (b.priority == null) return -1;
      return a.priority - b.priority;
    });

  const routed = [];
  let left = round2(amount);

  for (const goal of candidates) {
    if (left <= 0) break;
    const needed = round2(goal.target - goal.saved);
    const give = Math.min(needed, left);
    if (give <= 0) continue;
    routed.push({ goalId: goal.id, goalName: goal.name, amount: round2(give), accountId: goal.heldInAccountId ?? null });
    left = round2(left - give);
  }

  // Everything already full: the remainder has nowhere to go and must be shown
  // rather than silently dropped.
  return { routed, unrouted: round2(left) };
}

// Groups routed amounts by where the money has to end up. A goal held in the
// hub needs no transfer — the money is already there — so it becomes an
// allocation instead. That distinction is the whole point of this function.
export function groupByDestination(routed, hubAccountId) {
  const transfers = new Map();
  const allocations = [];

  for (const item of routed) {
    if (!item.accountId || item.accountId === hubAccountId) {
      // Both stay in the hub, but for very different reasons. A goal HELD in
      // the hub is deliberate. A goal with no account set is unconfigured, and
      // its money would sit in the hub by accident — the screen has to say
      // which is which rather than making the second look intentional.
      allocations.push({ ...item, unconfigured: !item.accountId });
      continue;
    }
    const existing = transfers.get(item.accountId);
    if (existing) {
      existing.amount = round2(existing.amount + item.amount);
      existing.goals.push(item);
    } else {
      transfers.set(item.accountId, { accountId: item.accountId, amount: item.amount, goals: [item] });
    }
  }

  return { transfers: [...transfers.values()], allocations };
}

// The whole calculation for one payday.
export function computePaydaySplit({ settings, goals = [], kind = PAYDAY_KINDS.PAY, hubAmount = null }) {
  if (!settings) return null;

  if (kind === PAYDAY_KINDS.WINDFALL) {
    const total = round2(hubAmount ?? 0);
    const pct = settings.windfallGoalsPct ?? 0;
    const toGoals = round2((total * pct) / 100);
    const toTrips = round2(total - toGoals);
    const { routed, unrouted } = routeGoalsLine(toGoals, goals);
    return {
      kind,
      lines: { splitGoals: toGoals, splitTrips: toTrips },
      presignoff: { applied: false },
      ...groupByDestination(routed, settings.hubAccountId),
      unrouted,
      total,
    };
  }

  const planned = Object.fromEntries(SPLIT_FIELDS.map((f) => [f.key, settings[f.key] ?? 0]));
  const plannedTotal = round2(Object.values(planned).reduce((sum, n) => sum + n, 0));

  // What actually arrived may differ from the plan. Every line stays fixed and
  // the goals line absorbs the difference, the same rule the plan file names.
  const actual = hubAmount == null ? plannedTotal : round2(hubAmount);
  const difference = round2(actual - plannedTotal);
  const adjusted = { ...planned, splitGoals: round2((planned.splitGoals ?? 0) + difference) };

  const { lines, applied, heldBack } = applyPresignoffRule(adjusted, { settings, goals });
  const { routed, unrouted } = routeGoalsLine(Math.max(0, lines.splitGoals ?? 0), goals);

  return {
    kind,
    lines,
    plannedTotal,
    actual,
    difference,
    presignoff: { applied, heldBack: heldBack ?? 0 },
    // A goals line driven below zero cannot be routed; the screen has to say so
    // rather than quietly funding nothing.
    belowZero: (lines.splitGoals ?? 0) < 0,
    ...groupByDestination(routed, settings.hubAccountId),
    unrouted,
    total: actual,
  };
}
