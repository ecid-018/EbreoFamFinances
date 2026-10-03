// A split line, broken into the named parts it is actually made of.
//
// Sparse by design: a line with no items keeps the behaviour it has today —
// one source account and, for goals, the priority waterfall. Nothing changes
// until a line is itemised deliberately.
//
// Why items exist at all: a real household plan allocates the goals line as
// several standing amounts to several funds, paid partly from one bank and
// partly from the other. One source per line could not say that, and a
// waterfall that fills one goal at a time does something different from
// funding four in parallel.

import { SPLIT_FIELDS } from './settings.js';

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function getLineItems(items = [], lineKey) {
  return items.filter((i) => i.lineKey === lineKey).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function hasItems(items = [], lineKey) {
  return items.some((i) => i.lineKey === lineKey);
}

export function getItemsTotal(items = [], lineKey) {
  return round2(getLineItems(items, lineKey).reduce((sum, i) => sum + i.amount, 0));
}

/**
 * Where an itemised line's money actually goes.
 *
 * Produces the same shape buildRoutedLines produces from the unitemised path,
 * so groupByDestination and everything downstream are unchanged.
 *
 * An item with neither a goal nor an account is money that STAYS where it is —
 * a premium auto-debited from the account it already sits in. That is a real
 * destination, not a missing one, so it is not flagged as unconfigured.
 */
export function routeLineItems(items = [], lineKey, { settings, goals = [], fallbackSource = null } = {}) {
  return getLineItems(items, lineKey).map((item) => {
    const goal = item.goalId ? goals.find((g) => g.id === item.goalId) ?? null : null;
    const source = item.fromAccountId ?? fallbackSource ?? settings?.hubAccountId ?? null;
    // A goal decides its own home account; an account item names one directly.
    const destination = goal ? goal.heldInAccountId ?? null : item.toAccountId ?? null;

    return {
      line: lineKey,
      goalId: goal?.id ?? null,
      goalName: goal?.name ?? null,
      label: item.label,
      amount: round2(item.amount),
      accountId: destination,
      sourceAccountId: source,
      // Only a pointer that was MEANT to resolve and did not. An item that
      // names nothing is deliberate; an item naming a goal that has since been
      // deleted is not.
      missingTarget: Boolean(item.goalId && !goal),
      // Money that stays where it is, ON PURPOSE -- a premium auto-debited
      // from the account it already sits in. Without this it looks identical
      // to a line whose destination was never set, and the screen would call
      // a correct arrangement unconfigured.
      deliberateStay: !item.goalId && !item.toAccountId,
      fromItem: true,
    };
  });
}

/**
 * Does each itemised line add up to the figure the plan says it is?
 *
 * The line amount in plan_settings stays the planned total, and the items are
 * what actually moves. When they disagree the screen has to say so — silently
 * routing a different amount from the one the plan states is how a split stops
 * being checkable.
 */
export function getLineItemDiffs(items = [], settings = null) {
  if (!settings) return [];
  return SPLIT_FIELDS.filter((f) => hasItems(items, f.key))
    .map((f) => {
      const planned = round2(settings[f.key] ?? 0);
      const itemised = getItemsTotal(items, f.key);
      return { key: f.key, label: f.label, planned, itemised, difference: round2(itemised - planned) };
    })
    .filter((d) => Math.abs(d.difference) >= 0.005);
}

// Which accounts an itemised plan actually draws on, so the payday screen can
// say what each is expected to receive. Before items, a line had one source;
// now a single line can draw on several.
export function getItemSourceAccounts(items = []) {
  return [...new Set(items.map((i) => i.fromAccountId).filter(Boolean))];
}

// What one account pays out across every itemised line. The counterpart of
// getExpectedLanding, which says what arrives.
export function getItemisedOutflow(items = [], accountId) {
  if (!accountId) return 0;
  return round2(
    items.filter((i) => i.fromAccountId === accountId).reduce((sum, i) => sum + i.amount, 0)
  );
}
