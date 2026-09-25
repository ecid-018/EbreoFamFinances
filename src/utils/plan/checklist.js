// What the plan says to do with money that has just arrived.
//
// Pure, and the ONLY place the amounts come from. Phase 10's second principle
// is that numbers come from code and words come from the AI: every figure here
// is computed deterministically, and the AI may later reword the `reason`
// string but never the arithmetic behind it.
//
// Nothing here moves money. It produces a list of suggestions; each one is
// carried out by the household through the existing transfer form.

import { formatPHP } from '../currency.js';
import { routeGoalsLine, fillVacationReserve } from './payday.js';

export const INCOME_KINDS = {
  ALLOTMENT: 'allotment',
  REMITTANCE: 'remittance',
  LEAVE_PAY: 'leave_pay',
  INSTALMENT: 'instalment',
  TRADING_PAYOUT: 'trading_payout',
  WINDFALL: 'windfall',
  OTHER: 'other',
};

// What each kind is called on screen, and what the plan does with it. Order is
// the order the "What is this money?" buttons appear in.
export const INCOME_KIND_META = [
  { value: INCOME_KINDS.ALLOTMENT, label: 'Allotment', hint: 'The monthly pay — split by the plan' },
  { value: INCOME_KINDS.REMITTANCE, label: 'Pay on board', hint: 'Follows goal priority' },
  { value: INCOME_KINDS.LEAVE_PAY, label: 'Leave pay', hint: 'Vacation reserve first, then goals' },
  { value: INCOME_KINDS.INSTALMENT, label: 'Instalment', hint: 'Goes to the car fund' },
  { value: INCOME_KINDS.TRADING_PAYOUT, label: 'Trading payout', hint: '50 goals / 30 tax / 20 reinvest' },
  { value: INCOME_KINDS.WINDFALL, label: 'Windfall', hint: 'Mostly goals, some trips' },
  { value: INCOME_KINDS.OTHER, label: 'Something else', hint: 'No routing — decide yourself' },
];

// Which answers to "What is this money?" correspond exactly to a value of
// income.kind. Only these three: 'allotment' and 'leave_pay' describe money a
// payday creates and already stamps, and 'remittance' and 'instalment' have no
// equivalent at all. Mislabelling them would be worse than leaving them null.
export const INCOME_KIND_TO_ROW_KIND = {
  [INCOME_KINDS.TRADING_PAYOUT]: 'trading_payout',
  [INCOME_KINDS.WINDFALL]: 'windfall',
  [INCOME_KINDS.OTHER]: 'other',
};

// The trading plan's split. Named rather than inline so the three numbers are
// visibly one rule that adds to 100.
const TRADING_SPLIT = { goals: 0.5, tax: 0.3, reinvest: 0.2 };

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function getIncomeKindMeta(kind) {
  return INCOME_KIND_META.find((k) => k.value === kind) ?? INCOME_KIND_META[INCOME_KIND_META.length - 1];
}

// A guess at what money is, from where it landed and what it was called.
//
// Deliberately conservative: anything it is not reasonably sure about comes
// back as null, which is what makes the screen ASK rather than route money by
// a hunch. Being wrong here would mean suggesting real transfers for the
// wrong reason.
export function classifyIncome(entry, settings, schedule = []) {
  if (!entry) return null;

  // An expected item on the schedule, matched by name, is the strongest
  // signal there is: the household said in advance that this was coming.
  const expected = schedule.find(
    (s) => s.kind === 'incoming' && s.isActive && s.name.toLowerCase() === (entry.source ?? '').toLowerCase()
  );
  if (expected) {
    const named = INCOME_KIND_META.find((k) => k.label.toLowerCase() === expected.name.toLowerCase());
    if (named) return named.value;
  }

  // Income the payday screen created already did its own routing.
  if (entry.kind === 'pay') return INCOME_KINDS.ALLOTMENT;
  if (entry.kind === 'signoff') return INCOME_KINDS.LEAVE_PAY;
  if (entry.kind === 'windfall') return INCOME_KINDS.WINDFALL;
  if (entry.kind === 'trading_payout') return INCOME_KINDS.TRADING_PAYOUT;

  // Money landing in the trading account is a trading payout by definition.
  if (settings?.tradingAccountId && entry.accountId === settings.tradingAccountId) {
    return INCOME_KINDS.TRADING_PAYOUT;
  }

  return null;
}

function item({ amount, reason, toAccountId = null, goalId = null, fromAccountId = null }) {
  return { amount: round2(amount), reason, toAccountId, goalId, fromAccountId, status: 'todo' };
}

// Money that follows the goal waterfall, as a list of suggestions.
function goalPriorityItems(amount, goals, fromAccountId) {
  const { routed, unrouted } = routeGoalsLine(amount, goals);
  const items = routed.map((r) =>
    item({
      amount: r.amount,
      goalId: r.goalId,
      toAccountId: r.accountId,
      fromAccountId,
      reason: `${formatPHP(r.amount)} to ${r.goalName}, the next goal in priority order`,
    })
  );
  return { items, unrouted };
}

/**
 * What to do with one piece of income.
 *
 * Returns { kind, items, unrouted, note }. `items` may be empty with a `note`
 * saying why — an unconfigured pointer produces an explanation, never a guess
 * at where the money should go.
 */
export function buildChecklist({ entry, kind, settings, goals = [] } = {}) {
  const total = round2(entry?.amount ?? 0);
  const from = entry?.accountId ?? null;
  const empty = (note) => ({ kind, items: [], unrouted: total, note });

  if (!settings || total <= 0) return empty('Nothing to route.');

  switch (kind) {
    // The payday screen already split this and made the transfers. Repeating
    // them here would double every movement.
    case INCOME_KINDS.ALLOTMENT:
      return empty('Allotments are split on the Payday screen, which has already moved this money.');

    case INCOME_KINDS.REMITTANCE: {
      const { items, unrouted } = goalPriorityItems(total, goals, from);
      return { kind, items, unrouted, note: items.length ? null : 'Every goal is already funded.' };
    }

    case INCOME_KINDS.LEAVE_PAY: {
      const reserve = fillVacationReserve(total, settings, goals);
      const items = [];
      if (reserve.toReserve > 0) {
        const goal = goals.find((g) => g.id === reserve.goalId);
        items.push(
          item({
            amount: reserve.toReserve,
            goalId: reserve.goalId,
            toAccountId: goal?.heldInAccountId ?? null,
            fromAccountId: from,
            reason:
              reserve.stillShort > 0
                ? `${formatPHP(reserve.toReserve)} to the vacation reserve, still ${formatPHP(reserve.stillShort)} short of target`
                : `${formatPHP(reserve.toReserve)} finishes the vacation reserve`,
          })
        );
      }
      const rest = goalPriorityItems(reserve.remainder, goals, from);
      return {
        kind,
        items: [...items, ...rest.items],
        unrouted: rest.unrouted,
        note: reserve.unconfigured ? 'No vacation reserve is set, so all of this follows goal priority.' : null,
      };
    }

    case INCOME_KINDS.INSTALMENT: {
      const carGoal = goals.find((g) => g.id === settings.carGoalId);
      // "Car fund until the car is bought; after that, the car line." Once the
      // fund is full the car has been bought, so it follows goal priority.
      if (!carGoal) {
        const { items, unrouted } = goalPriorityItems(total, goals, from);
        return { kind, items, unrouted, note: 'No car fund is set in Settings, so this follows goal priority.' };
      }
      const needed = round2(Math.max(0, carGoal.target - carGoal.saved));
      if (needed <= 0) {
        const { items, unrouted } = goalPriorityItems(total, goals, from);
        return { kind, items, unrouted, note: 'The car fund is full, so this follows goal priority.' };
      }
      const toCar = round2(Math.min(needed, total));
      const items = [
        item({
          amount: toCar,
          goalId: carGoal.id,
          toAccountId: carGoal.heldInAccountId ?? null,
          fromAccountId: from,
          reason: `${formatPHP(toCar)} to ${carGoal.name} until the car is bought`,
        }),
      ];
      const rest = goalPriorityItems(round2(total - toCar), goals, from);
      return { kind, items: [...items, ...rest.items], unrouted: rest.unrouted, note: null };
    }

    case INCOME_KINDS.TRADING_PAYOUT: {
      const toGoals = round2(total * TRADING_SPLIT.goals);
      const toTax = round2(total * TRADING_SPLIT.tax);
      // The remainder rather than a third multiplication, so the three parts
      // always add back to the total exactly.
      const toReinvest = round2(total - toGoals - toTax);

      const goalItems = goalPriorityItems(toGoals, goals, from);
      const items = [...goalItems.items];
      if (toTax > 0) {
        items.push(
          item({
            amount: toTax,
            toAccountId: settings.tradingTaxAccountId ?? null,
            fromAccountId: from,
            reason: settings.tradingTaxAccountId
              ? `${formatPHP(toTax)} set aside for tax and reserve`
              : `${formatPHP(toTax)} for tax and reserve — no account set for it in Settings`,
          })
        );
      }
      return {
        kind,
        items,
        unrouted: goalItems.unrouted,
        note: `${formatPHP(toReinvest)} stays where it is to reinvest.`,
      };
    }

    case INCOME_KINDS.WINDFALL: {
      const pct = settings.windfallGoalsPct;
      if (pct == null) {
        const { items, unrouted } = goalPriorityItems(total, goals, from);
        return { kind, items, unrouted, note: 'No windfall split is set, so all of this follows goal priority.' };
      }
      const toGoals = round2((total * pct) / 100);
      const toTrips = round2(total - toGoals);
      const goalItems = goalPriorityItems(toGoals, goals, from);
      const items = [...goalItems.items];
      const tripsGoal = goals.find((g) => g.id === settings.tripsGoalId);
      if (toTrips > 0) {
        items.push(
          item({
            amount: toTrips,
            goalId: tripsGoal?.id ?? null,
            toAccountId: tripsGoal?.heldInAccountId ?? null,
            fromAccountId: from,
            reason: tripsGoal
              ? `${formatPHP(toTrips)} to ${tripsGoal.name}`
              : `${formatPHP(toTrips)} for trips — no trips fund set in Settings`,
          })
        );
      }
      return { kind, items, unrouted: goalItems.unrouted, note: null };
    }

    default:
      return empty('No routing rule for this. Decide where it should go yourself.');
  }
}

// A checklist nobody finished. Three days, per the build spec.
export const CHECKLIST_STALE_DAYS = 3;

export function getOpenChecklists(checklists = []) {
  return checklists.filter((c) => c.completedAt == null);
}

export function isChecklistStale(checklist, today = new Date()) {
  if (!checklist || checklist.completedAt) return false;
  const created = new Date(checklist.createdAt);
  if (!Number.isFinite(created.getTime())) return false;
  const days = Math.floor((today - created) / 86400000);
  return days >= CHECKLIST_STALE_DAYS;
}

// Done when nothing is left to do — every item either carried out or
// deliberately skipped.
export function isChecklistFinished(items = []) {
  return items.length > 0 && items.every((i) => i.status !== 'todo');
}
