// The goal waterfall, run forward month by month.
//
// Answers the two questions the Plan view asks that no single stored figure
// can: when does each goal finish, and is it keeping pace with its own target
// date. Pure and unit-tested — it is a projection, and a projection nobody can
// check is worth nothing.
//
// It deliberately REUSES routeGoalsLine from payday.js rather than re-deriving
// priority order. That function already fills each goal only to what it still
// needs and rolls the overshoot onward, which is precisely the waterfall; a
// second implementation here would be a second answer to the same question.

import { addMonths, getMonthKey } from '../date.js';
import { routeGoalsLine } from './payday.js';
import { resolveSplit } from './settings.js';

// 20 years. Long enough that a real plan finishes inside it, short enough that
// a plan funded at ₱0 a month terminates instead of spinning.
const DEFAULT_MAX_MONTHS = 240;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function isOpenGoal(g) {
  return !g.isSinkingFund && !g.archivedAt && g.saved < g.target;
}

// One-offs are keyed by month so a simulation is reproducible: the same inputs
// always give the same answer, with no dependence on when it was run.
function sumFor(entries, monthKey) {
  return entries.reduce((t, e) => (e.monthKey === monthKey ? t + (e.amount ?? 0) : t), 0);
}

/**
 * Projects the goal waterfall forward from `startMonth`.
 *
 * `inflows`  — [{ monthKey, amount }] extra money into the pool that month,
 *              routed by the same priority order as the monthly line.
 * `outflows` — [{ monthKey, amount, goalId }] money leaving. With a goalId it
 *              comes out of that goal's saved (buying the car, paying for the
 *              renovation); without one it reduces that month's pool.
 *
 * Nothing in the app passes one-offs yet — the what-if screen that will is
 * Phase 10c. They are built and tested here so that screen adds a form, not
 * a second simulator.
 */
export function simulateGoalWaterfall({
  goals = [],
  settings = null,
  startMonth,
  inflows = [],
  outflows = [],
  maxMonths = DEFAULT_MAX_MONTHS,
} = {}) {
  const from = startMonth ?? { year: new Date().getFullYear(), monthIndex: new Date().getMonth() };
  const startMonthKey = getMonthKey(from.year, from.monthIndex);

  // A working copy: the simulation moves `saved` around and must not touch the
  // real goals, which are React state.
  let working = goals.map((g) => ({ ...g }));

  const completions = [];
  const completed = new Set();
  let presignoffLapsesMonthKey = null;
  let wasPresignoffApplied = resolveSplit(settings, working).presignoffApplied;
  const monthlyGoalMoney = round2(resolveSplit(settings, working).goals);

  let monthsRun = 0;
  for (let m = 0; m < maxMonths; m += 1) {
    if (!working.some(isOpenGoal)) break;
    monthsRun = m + 1;

    const { year, monthIndex } = addMonths(from, m);
    const monthKey = getMonthKey(year, monthIndex);

    // Outflows first: money spent this month is not available to route.
    for (const out of outflows.filter((o) => o.monthKey === monthKey && o.goalId)) {
      const goal = working.find((g) => g.id === out.goalId);
      if (goal) goal.saved = Math.max(0, round2(goal.saved - (out.amount ?? 0)));
    }

    const split = resolveSplit(settings, working);

    // The vacation reserve is tracked for ONE reason: the pre-sign-off rule
    // lapses when it reaches target, which frees money into the goals line and
    // moves every milestone after it. The other two sinking funds are not
    // modelled — they are spent as bills fall due, and nothing here can know
    // when that is, so projecting them would be inventing a schedule.
    const vacationGoal = working.find((g) => g.id === settings?.vacationGoalId);
    const vacationTarget = settings?.vacationReserveTarget;
    if (vacationGoal && vacationTarget != null && vacationTarget > 0) {
      vacationGoal.saved = round2(Math.min(vacationTarget, vacationGoal.saved + split.vacation));
    }
    if (wasPresignoffApplied && !resolveSplit(settings, working).presignoffApplied) {
      presignoffLapsesMonthKey = monthKey;
      wasPresignoffApplied = false;
    }

    const untargetedOut = outflows
      .filter((o) => o.monthKey === monthKey && !o.goalId)
      .reduce((t, o) => t + (o.amount ?? 0), 0);
    const pool = Math.max(0, round2(split.goals + sumFor(inflows, monthKey) - untargetedOut));

    const { routed } = routeGoalsLine(pool, working);
    for (const r of routed) {
      const goal = working.find((g) => g.id === r.goalId);
      if (!goal) continue;
      goal.saved = round2(goal.saved + r.amount);
      if (goal.saved >= goal.target && !completed.has(goal.id)) {
        completed.add(goal.id);
        completions.push({ goalId: goal.id, goalName: goal.name, monthKey, monthsAway: m });
      }
    }

    // Nothing moved and nothing can: every later month is identical, so the
    // remaining goals are unreachable rather than merely far off.
    if (routed.length === 0 && inflows.length === 0 && outflows.length === 0) break;
  }

  const unfinished = working
    .filter(isOpenGoal)
    .map((g) => ({
      goalId: g.id,
      goalName: g.name,
      saved: g.saved,
      target: g.target,
      remaining: round2(g.target - g.saved),
    }));

  return {
    startMonthKey,
    monthlyGoalMoney,
    completions,
    unfinished,
    presignoffLapsesMonthKey,
    // The month everything currently open is funded by, or null if something
    // never finishes inside the horizon.
    allFundedMonthKey: unfinished.length > 0 ? null : (completions[completions.length - 1]?.monthKey ?? startMonthKey),
    monthsRun,
  };
}

// Is a dated goal keeping pace with its own target date?
//
// Straight line from when the goal was created to its target date. createdAt is
// the only start the data has; without it there is no line to draw, so the goal
// simply has no pace rather than a made-up one.
//
// "On track" tolerates one month's worth either way. A goal funded in monthly
// lumps is above the line the day after a payday and below it the day before,
// and flipping between "ahead" and "behind" for that reason would be noise.
export function getGoalPace(goal, { today = new Date() } = {}) {
  if (!goal?.targetDate || !goal.createdAt || !(goal.target > 0)) return null;

  const start = new Date(goal.createdAt);
  const end = new Date(`${goal.targetDate}T00:00:00`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;

  const span = end.getTime() - start.getTime();
  if (span <= 0) return null;

  const elapsed = Math.min(1, Math.max(0, (today.getTime() - start.getTime()) / span));
  const expected = round2(goal.target * elapsed);
  const diff = round2(goal.saved - expected);

  const totalMonths = Math.max(1, span / (1000 * 60 * 60 * 24 * 30.44));
  const perMonth = goal.target / totalMonths;
  const monthsOff = perMonth > 0 ? Math.round(Math.abs(diff) / perMonth) : 0;

  if (Math.abs(diff) < perMonth) return { expected, diff, status: 'on-track', monthsOff: 0 };
  return { expected, diff, status: diff > 0 ? 'ahead' : 'behind', monthsOff: Math.max(1, monthsOff) };
}

// How far off going ashore is. Counts to January of the target year — the
// household picked a year, not a day, and pretending to know the day would
// dress a rough plan up as a precise one.
export function getAshoreCountdown(targetYear, { today = new Date() } = {}) {
  if (targetYear == null || !Number.isFinite(targetYear)) return null;
  const monthsAway = targetYear * 12 - (today.getFullYear() * 12 + today.getMonth());
  if (monthsAway <= 0) return { targetYear, monthsAway: 0, years: 0, months: 0, isHere: true };
  return {
    targetYear,
    monthsAway,
    years: Math.floor(monthsAway / 12),
    months: monthsAway % 12,
    isHere: false,
  };
}

// How many months the projection lands after the date the goal was wanted by.
//
// This exists because the pace badge and the projection answer different
// questions and can disagree on the same row: a goal created last month with
// nothing saved is "on track" against its own straight line while the
// waterfall says it finishes a year late. Saying only the first would be
// reassuring and wrong.
export function getMonthsLate(projectedMonthKey, targetDate) {
  if (!projectedMonthKey || !targetDate) return 0;
  const projected = Number(projectedMonthKey.slice(0, 4)) * 12 + Number(projectedMonthKey.slice(5, 7));
  const wanted = Number(targetDate.slice(0, 4)) * 12 + Number(targetDate.slice(5, 7));
  return Math.max(0, projected - wanted);
}

// 'YYYY-MM' → 'Mar 2027'. Kept here rather than in date.js because it is only
// ever used to label a projection.
export function formatProjectedMonth(monthKey) {
  if (!monthKey) return '';
  const year = Number(monthKey.slice(0, 4));
  const monthIndex = Number(monthKey.slice(5, 7)) - 1;
  return new Date(year, monthIndex, 1).toLocaleString('en-PH', { month: 'short', year: 'numeric' });
}
