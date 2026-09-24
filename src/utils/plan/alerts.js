// Deterministic alerts. No AI anywhere near this file.
//
// Phase 10's first principle is that everything works without AI: the alerts,
// the pace bars and the simulator are plain code, and the AI layer only ever
// adds wording on top. This is that plain code, so it is pure, unit-tested,
// and never guesses — a rule it cannot measure truthfully is left out rather
// than approximated.

import { getDaysInMonth, getMonthKey } from '../date.js';
import { formatPHP } from '../currency.js';
import { resolveSplit } from './settings.js';
import { getGoalPace } from './simulate.js';
import { getBankFloorAccounts } from './floor.js';
import { getDueSoon } from './bills.js';

export const SEVERITY = { ALERT: 'alert', WARNING: 'warning' };

// More than this far ahead of where the calendar says spending should be.
// Percentage points, per the build spec.
const PACE_POINTS = 20;
// Funding an annual figure may lag the calendar by this much before it is
// worth saying anything: money arrives in monthly lumps, not daily.
const FUNDING_POINTS = 25;
const CAP_WARNING_FRACTION = 0.75;
// A payday split logged this many days after the money arrived is late.
const PAYDAY_GRACE_DAYS = 3;
// How far ahead a bill starts being mentioned.
const BILL_NOTICE_DAYS = 7;
// Float dust from the numeric(12,2) round trip.
const EPSILON = 0.005;

function daysBetween(fromDateStr, today) {
  const [y, m, d] = fromDateStr.split('-').map(Number);
  const from = new Date(y, m - 1, d);
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((to - from) / 86400000);
}

function severityRank(severity) {
  return severity === SEVERITY.ALERT ? 0 : 1;
}

/**
 * Every alert the plan can raise from the data the app already holds.
 *
 * Month-scoped rules (envelope pace, an unsplit payday, the goal line) describe
 * the month being viewed. The rest — the floor, the caps, milestone drift —
 * describe now, because that is what they are: a floor is not a thing you were
 * below in March, it is a thing you are below.
 */
export function buildAlerts(
  {
    envelopeStats = [],
    month,
    isCurrentMonth = true,
    monthMode = 'sea',
    guardRails = [],
    accounts = [],
    goals = [],
    planSettings = null,
    transactions = [],
    transfers = [],
    income = [],
    paydays = [],
    paydayAllocations = [],
    bills = [],
  } = {},
  { today = new Date() } = {}
) {
  const alerts = [];
  const monthKey = month ? getMonthKey(month.year, month.monthIndex) : null;
  const year = today.getFullYear();

  // --- Envelopes: over budget, or spending faster than the month is passing ---
  const daysInMonth = month ? getDaysInMonth(month.year, month.monthIndex) : 30;
  const elapsedFraction = isCurrentMonth ? today.getDate() / daysInMonth : 1;

  for (const env of envelopeStats) {
    if (env.monthlyBudget <= 0) continue;
    if (env.isOver) {
      alerts.push({
        id: `env-over:${env.id}:${monthKey}`,
        severity: SEVERITY.ALERT,
        title: `${env.name} is over budget`,
        detail: `Spent ${formatPHP(env.spent)} of ${formatPHP(env.monthlyBudget)}`,
        amount: env.spent - env.monthlyBudget,
        tab: 'budget',
      });
      continue;
    }
    // Pace only means something while the month is still running. In a closed
    // month an envelope either went over or it did not.
    if (!isCurrentMonth) continue;
    const spentFraction = env.spent / env.monthlyBudget;
    if ((spentFraction - elapsedFraction) * 100 > PACE_POINTS) {
      alerts.push({
        id: `env-pace:${env.id}:${monthKey}`,
        severity: SEVERITY.WARNING,
        title: `${env.name} is spending ahead of the month`,
        detail: `${Math.round(spentFraction * 100)}% spent, ${Math.round(elapsedFraction * 100)}% through the month`,
        amount: env.spent,
        tab: 'budget',
      });
    }
  }

  // --- Money arrived but the payday split was never confirmed ---
  //
  // "Allotment income" is income landing in the hub or household account —
  // the plan's own definition of where it arrives. With neither configured
  // there is no way to tell an allotment from any other income, so the rule
  // stays silent rather than flagging every deposit.
  const payAccountIds = [planSettings?.hubAccountId, planSettings?.householdAccountId].filter(Boolean);
  if (payAccountIds.length > 0 && monthKey) {
    const splitIncomeIds = new Set(
      paydayAllocations.filter((a) => a.kind === 'income' && a.incomeId).map((a) => a.incomeId)
    );
    for (const entry of income) {
      if (entry.budgetMonthKey !== monthKey) continue;
      if (!payAccountIds.includes(entry.accountId)) continue;
      if (splitIncomeIds.has(entry.id)) continue;
      const age = daysBetween(entry.date, today);
      if (age < PAYDAY_GRACE_DAYS) continue;
      alerts.push({
        id: `payday-missing:${entry.id}`,
        severity: SEVERITY.ALERT,
        title: 'Pay arrived but was never split',
        detail: `${entry.source} landed ${age} days ago and no payday has been recorded against it`,
        amount: entry.amount,
        tab: 'transactions',
      });
    }
  }

  // --- The goal line was underfunded in a paid month ---
  //
  // Only once a payday exists for the month: before that, nothing is late, it
  // simply has not happened yet.
  if (monthKey && monthMode === 'sea' && planSettings) {
    const monthPaydayIds = paydays.filter((p) => p.budgetMonthKey === monthKey).map((p) => p.id);
    if (monthPaydayIds.length > 0) {
      const ids = new Set(monthPaydayIds);
      const moved = paydayAllocations
        .filter((a) => a.kind === 'goal' && ids.has(a.paydayId))
        .reduce((total, a) => total + a.amount, 0);
      const planned = resolveSplit(planSettings, goals).goals;
      if (planned > 0 && moved < planned - EPSILON) {
        alerts.push({
          id: `goal-short:${monthKey}`,
          severity: SEVERITY.ALERT,
          title: 'Goals got less than the plan sets aside',
          detail: `${formatPHP(moved)} moved to goals against a plan of ${formatPHP(planned)}`,
          amount: planned - moved,
          tab: 'goals',
        });
      }
    }
  }

  // --- The bank floor ---
  const floorRail = guardRails.find((rail) => rail.key === 'floor');
  if (floorRail?.isBreached) {
    alerts.push({
      id: `floor-below:${monthKey}`,
      severity: SEVERITY.ALERT,
      title: 'Bank floor is below its target',
      detail: `${formatPHP(floorRail.current)} held against a floor of ${formatPHP(floorRail.target)}`,
      amount: floorRail.target - floorRail.current,
      tab: 'accounts',
    });
  }

  // Money leaving a floor account. The build spec asks for "non-emergency
  // use", but nothing in the data records why money moved, and guessing would
  // mean either nagging about real emergencies or staying quiet through the
  // ones that are not. So this reports the movement and lets a human judge it.
  if (monthKey) {
    const floorIds = new Set(getBankFloorAccounts(accounts).map((a) => a.id));
    const debited = new Map();
    for (const t of transactions) {
      if (floorIds.has(t.accountId) && t.date.startsWith(monthKey)) {
        debited.set(t.accountId, (debited.get(t.accountId) ?? 0) + t.amount);
      }
    }
    for (const t of transfers) {
      if (floorIds.has(t.fromAccountId) && t.date.startsWith(monthKey)) {
        debited.set(t.fromAccountId, (debited.get(t.fromAccountId) ?? 0) + t.fromAmount);
      }
    }
    for (const [accountId, amount] of debited) {
      const account = accounts.find((a) => a.id === accountId);
      alerts.push({
        id: `floor-debit:${accountId}:${monthKey}`,
        severity: SEVERITY.WARNING,
        title: `Money left ${account?.name ?? 'a bank floor account'}`,
        detail: `${formatPHP(amount)} out this month. Floor accounts are meant to sit untouched — worth checking this was deliberate`,
        amount,
        tab: 'accounts',
      });
    }
  }

  // --- The trading cap ---
  const trading = guardRails.find((rail) => rail.key === 'trading');
  if (trading && trading.target > 0) {
    const used = trading.current / trading.target;
    if (used >= 1) {
      alerts.push({
        id: `cap-trading:${year}`,
        severity: SEVERITY.ALERT,
        title: 'Trading and apps has reached its annual cap',
        detail: `${formatPHP(trading.current)} of ${formatPHP(trading.target)} for ${year}`,
        amount: trading.current - trading.target,
        tab: 'plan',
      });
    } else if (used >= CAP_WARNING_FRACTION) {
      alerts.push({
        id: `cap-trading:${year}`,
        severity: SEVERITY.WARNING,
        title: 'Trading and apps is near its annual cap',
        detail: `${Math.round(used * 100)}% of the ${year} cap used`,
        amount: trading.target - trading.current,
        tab: 'plan',
      });
    }
  }

  // --- Annual funding falling behind the calendar ---
  //
  // Trips and insurance are measured as money going IN, not out, so unlike the
  // trading cap there is no 100% to breach — reaching the annual figure is the
  // point. What is worth saying is that the year is running out and the fund
  // is short.
  const yearFraction = (today.getMonth() + today.getDate() / 30.44) / 12;
  for (const key of ['trips', 'insurance']) {
    const rail = guardRails.find((r) => r.key === key);
    if (!rail || !(rail.target > 0)) continue;
    const fundedFraction = rail.current / rail.target;
    if ((yearFraction - fundedFraction) * 100 > FUNDING_POINTS) {
      alerts.push({
        id: `funding-behind:${key}:${year}`,
        severity: SEVERITY.WARNING,
        title: `${rail.label} is behind for ${year}`,
        detail: `${Math.round(fundedFraction * 100)}% funded, ${Math.round(yearFraction * 100)}% through the year`,
        amount: rail.target - rail.current,
        tab: 'plan',
      });
    }
  }

  // --- Bills falling due, and bills already missed ---
  //
  // Nothing here checks for a matching expense. pay_bill moves next_due
  // forward as part of paying, so a bill still showing a date inside the
  // window has not been paid for that cycle — the date IS the check.
  for (const bill of getDueSoon(bills, today, BILL_NOTICE_DAYS)) {
    const late = bill.daysUntilDue < 0;
    alerts.push({
      id: `bill-due:${bill.id}:${bill.nextDue}`,
      severity: late ? SEVERITY.ALERT : SEVERITY.WARNING,
      title: late ? `${bill.name} is overdue` : `${bill.name} is due soon`,
      detail: late
        ? `${formatPHP(bill.amount)}, due ${-bill.daysUntilDue} day${bill.daysUntilDue === -1 ? '' : 's'} ago`
        : `${formatPHP(bill.amount)}, due in ${bill.daysUntilDue} day${bill.daysUntilDue === 1 ? '' : 's'}`,
      amount: bill.amount,
      tab: 'bills',
    });
  }

  // --- Dated goals drifting off their own straight line ---
  for (const goal of goals) {
    if (goal.archivedAt || goal.isSinkingFund) continue;
    const pace = getGoalPace(goal, { today });
    if (!pace || pace.status !== 'behind' || pace.monthsOff <= 1) continue;
    alerts.push({
      id: `goal-drift:${goal.id}:${monthKey}`,
      severity: SEVERITY.WARNING,
      title: `${goal.name} is behind its date`,
      detail: `${pace.monthsOff} months behind the straight line to ${goal.targetDate}`,
      amount: -pace.diff,
      tab: 'goals',
    });
  }

  // Worst first; within a severity, keep the order the rules ran in so the
  // list does not reshuffle between renders.
  return alerts.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

// Alert ids carry the month or year they belong to, so a dismissal lapses on
// its own when the period rolls over. Nothing has to expire it.
export function filterDismissed(alerts, dismissedIds = []) {
  const dismissed = new Set(dismissedIds);
  return alerts.filter((a) => !dismissed.has(a.id));
}
