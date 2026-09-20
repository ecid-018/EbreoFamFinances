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

// Where each split line's money is supposed to end up.
//
// Only the goals line is routed by priority. The other five have a fixed
// destination named in plan_settings, which is what those pointers are for:
// the three sinking-fund lines top up their own goal, and retirement and
// trading go to their account. Before this, those five were displayed and then
// silently did nothing — the money stayed in the hub with no record of what it
// was for.
const SINKING_LINES = [
  { line: 'splitInsurance', pointer: 'insuranceGoalId' },
  { line: 'splitTrips', pointer: 'tripsGoalId' },
  { line: 'splitVacationReserve', pointer: 'vacationGoalId' },
];

const ACCOUNT_LINES = [
  { line: 'splitRetirement', pointer: 'retirementAccountId' },
  { line: 'splitTrading', pointer: 'tradingAccountId' },
];

const LINE_LABEL = Object.fromEntries(SPLIT_FIELDS.map((f) => [f.key, f.label]));

// Which account a line is paid from. A line with no row is paid from the hub,
// so an empty table behaves exactly as before split_line_sources existed.
export function getLineSource(line, settings, sources = []) {
  const row = sources.find((r) => r.lineKey === line);
  return row?.accountId ?? settings?.hubAccountId ?? null;
}

// What a given account is expected to receive on payday: the lines it funds,
// plus the household's spending money if it is the household account.
//
// plan_settings stores pay_household (spending money) and pay_hub (the TOTAL
// being split, across every source since split_line_sources). Neither is what
// lands in a particular account, so prefilling a field with either is wrong
// the moment more than one account funds the plan. This derives the real
// figure from the lines themselves.
export function getExpectedLanding(accountId, settings, sources = []) {
  if (!accountId || !settings) return 0;
  const fromLines = SPLIT_FIELDS.reduce(
    (sum, f) => (getLineSource(f.key, settings, sources) === accountId ? sum + (settings[f.key] ?? 0) : sum),
    0
  );
  const household = accountId === settings.householdAccountId ? settings.payHousehold ?? 0 : 0;
  return round2(fromLines + household);
}

export function buildRoutedLines({ lines, settings, goals = [], sources = [] }) {
  const items = [];

  const { routed, unrouted } = routeGoalsLine(Math.max(0, lines.splitGoals ?? 0), goals);
  const goalsSource = getLineSource('splitGoals', settings, sources);
  for (const r of routed) {
    items.push({ ...r, line: 'splitGoals', label: r.goalName, missingTarget: false, sourceAccountId: goalsSource });
  }

  for (const { line, pointer } of SINKING_LINES) {
    const amount = round2(lines[line] ?? 0);
    if (amount <= 0) continue;
    const goal = goals.find((g) => g.id === settings?.[pointer]);
    items.push({
      line,
      goalId: goal?.id ?? null,
      goalName: goal?.name ?? null,
      label: goal?.name ?? LINE_LABEL[line],
      amount,
      accountId: goal?.heldInAccountId ?? null,
      sourceAccountId: getLineSource(line, settings, sources),
      // No goal configured for this line: the money has no destination and
      // must be shown as such rather than quietly staying put.
      missingTarget: !goal,
    });
  }

  for (const { line, pointer } of ACCOUNT_LINES) {
    const amount = round2(lines[line] ?? 0);
    if (amount <= 0) continue;
    const accountId = settings?.[pointer] ?? null;
    items.push({
      line,
      goalId: null,
      goalName: null,
      label: LINE_LABEL[line],
      amount,
      accountId,
      sourceAccountId: getLineSource(line, settings, sources),
      missingTarget: !accountId,
    });
  }

  return { items, unrouted };
}

// Groups routed amounts by where the money has to end up. Anything already in
// the hub, or with no destination configured, becomes an allocation rather than
// a transfer — moving money from the hub to itself would be a no-op with a
// misleading ledger entry.
export function groupByDestination(routed, hubAccountId) {
  const transfers = new Map();
  const allocations = [];

  for (const item of routed) {
    const entry = {
      ...item,
      label: item.label ?? item.goalName ?? LINE_LABEL[item.line] ?? 'Unallocated',
      // Both stay in the hub, but for very different reasons. A goal HELD in
      // the hub is deliberate. Something with no destination at all is
      // unconfigured, and its money would sit there by accident.
      //
      // `||` not `??`: a sinking line can have a goal (missingTarget false) and
      // still have no account on that goal, which is just as unconfigured. `??`
      // short-circuited on the false and reported it as deliberate.
      unconfigured: Boolean(item.missingTarget) || !item.accountId,
    };

    // Money already sitting in the account that funds it needs no transfer —
    // moving it to itself would be a no-op with a misleading ledger entry.
    const source = item.sourceAccountId ?? hubAccountId ?? null;
    if (!item.accountId || item.accountId === source) {
      allocations.push(entry);
      continue;
    }
    // Keyed by the PAIR: two lines paid from different accounts into the same
    // destination are two transfers, not one.
    const key = `${source}->${item.accountId}`;
    const existing = transfers.get(key);
    if (existing) {
      existing.amount = round2(existing.amount + item.amount);
      existing.items.push(entry);
    } else {
      transfers.set(key, {
        accountId: item.accountId, sourceAccountId: source, amount: item.amount, items: [entry],
      });
    }
  }

  return { transfers: [...transfers.values()], allocations };
}

// The whole calculation for one payday.
export function computePaydaySplit({ settings, goals = [], kind = PAYDAY_KINDS.PAY, amountToSplit = null, sources = [] }) {
  if (!settings) return null;

  if (kind === PAYDAY_KINDS.WINDFALL) {
    const total = round2(amountToSplit ?? 0);
    const pct = settings.windfallGoalsPct ?? 0;
    const toGoals = round2((total * pct) / 100);
    const toTrips = round2(total - toGoals);
    const lines = { splitGoals: toGoals, splitTrips: toTrips };
    const { items, unrouted } = buildRoutedLines({ lines, settings, goals, sources });
    return {
      kind,
      lines,
      presignoff: { applied: false },
      ...groupByDestination(items, settings.hubAccountId),
      unrouted,
      total,
    };
  }

  const planned = Object.fromEntries(SPLIT_FIELDS.map((f) => [f.key, settings[f.key] ?? 0]));
  const plannedTotal = round2(Object.values(planned).reduce((sum, n) => sum + n, 0));

  // What actually arrived may differ from the plan. Every line stays fixed and
  // the goals line absorbs the difference, the same rule the plan file names.
  //
  // This is the total being split across ALL source accounts, not what landed
  // in any one of them — since split_line_sources, those are different numbers.
  const actual = amountToSplit == null ? plannedTotal : round2(amountToSplit);
  const difference = round2(actual - plannedTotal);
  const adjusted = { ...planned, splitGoals: round2((planned.splitGoals ?? 0) + difference) };

  const { lines, applied, heldBack } = applyPresignoffRule(adjusted, { settings, goals });
  const { items, unrouted } = buildRoutedLines({ lines, settings, goals, sources });

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
    ...groupByDestination(items, settings.hubAccountId),
    unrouted,
    total: actual,
    // What each funding account has to cover. The screen needs this to say
    // "his BPI must supply X" rather than assuming one hub does everything.
    bySource: items.reduce((acc, i) => {
      const key = i.sourceAccountId ?? 'none';
      acc[key] = round2((acc[key] ?? 0) + i.amount);
      return acc;
    }, {}),
  };
}
