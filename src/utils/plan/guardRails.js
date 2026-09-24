// The guard-rails: the plan's limits, and where the household stands against
// each one.
//
// Extracted from usePlanFinancials so the Plan view and the alerts read the
// same figures. Two implementations would eventually disagree, and the screen
// saying a cap is fine while the alert says it is breached is worse than
// either being wrong on its own.

import { getBankFloorStatus } from './floor.js';

// Year-to-date transfers into one account. Complete for the trading line:
// apply_payday routes account lines through add_transfer, so a payday and a
// transfer made by hand both land here.
export function sumTransfersInto(transfers = [], accountId, year) {
  if (!accountId) return null;
  const prefix = `${year}-`;
  return transfers
    .filter((t) => t.toAccountId === accountId && t.date.startsWith(prefix))
    .reduce((total, t) => total + t.toAmount, 0);
}

// What the paydays of one year put into one goal.
//
// Deliberately NOT read from the ledger. Every goal contribution writes a
// ledger row, which would make the ledger the complete source, but those rows
// identify the goal only by the name it had at the time — renaming a goal
// would silently rewrite its history and two goals sharing a name would merge.
// payday_allocations carries the goal's id, so this figure is exact for what
// it counts, and every consumer says plainly that it counts paydays only.
export function sumPaydayGoalFunding(paydays = [], allocations = [], goalId, year) {
  if (!goalId) return null;
  const prefix = `${year}-`;
  const idsThisYear = new Set(paydays.filter((p) => p.date.startsWith(prefix)).map((p) => p.id));
  return allocations
    .filter((a) => a.kind === 'goal' && a.goalId === goalId && idsThisYear.has(a.paydayId))
    .reduce((total, a) => total + a.amount, 0);
}

// `direction` matters. The floor is a minimum to stay above and the trading
// figure a maximum to stay under; rendering them the same way would call a
// healthy floor a breach. A 'target' is neither — it is an annual intention
// that cannot be failed part-way through the year.
export function buildGuardRails({
  accounts = [],
  planSettings = null,
  transfers = [],
  paydays = [],
  paydayAllocations = [],
  year,
}) {
  const floor = getBankFloorStatus(accounts, planSettings?.bankFloorTarget);
  const tradingYtd = sumTransfersInto(transfers, planSettings?.tradingAccountId, year);
  const tripsYtd = sumPaydayGoalFunding(paydays, paydayAllocations, planSettings?.tripsGoalId, year);
  const insuranceYtd = sumPaydayGoalFunding(paydays, paydayAllocations, planSettings?.insuranceGoalId, year);
  const cap = planSettings?.tradingCapAnnual ?? null;

  return [
    {
      key: 'floor',
      label: 'Bank floor',
      direction: 'min',
      current: floor.current,
      target: floor.target,
      isBreached: floor.isMet === false,
      note: 'Tagged PHP bank accounts, excluding archived ones.',
    },
    {
      key: 'trading',
      label: 'Trading and apps',
      direction: 'max',
      current: tradingYtd,
      target: cap,
      isBreached: tradingYtd != null && cap != null && tradingYtd > cap,
      note: `Transferred in during ${year}.`,
    },
    {
      key: 'trips',
      label: 'Trips fund',
      direction: 'target',
      current: tripsYtd,
      target: planSettings?.tripsAnnual ?? null,
      isBreached: false,
      note: `Funded by paydays in ${year}. Contributions made by hand are not counted.`,
    },
    {
      key: 'insurance',
      label: 'Insurance fund',
      direction: 'target',
      current: insuranceYtd,
      target: planSettings?.insuranceAnnual ?? null,
      isBreached: false,
      note: `Funded by paydays in ${year}. Contributions made by hand are not counted.`,
    },
    // A rail with no figure or no target has nothing to say. Showing it at
    // zero would read as a decision the household never made.
  ].filter((rail) => rail.current != null && rail.target != null);
}
