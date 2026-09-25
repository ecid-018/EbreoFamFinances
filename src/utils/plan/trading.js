// Does trading actually make money?
//
// The only honest answer counts what it costs to run. Data feeds, platform
// fees and subscriptions are ordinary expenses in ordinary envelopes — they
// stay in the budget they belong to, and the `is_trading_cost` flag is what
// lets them be totalled together without being moved.
//
// Net is the headline. A year of payouts means nothing on its own.

import { getYearRange, isDateInRange } from '../date.js';

export const TRADING_PAYOUT_KIND = 'trading_payout';

// Costs are expenses in flagged envelopes. Deliberately NOT "money that left
// the trading account": paying for a data feed from the household card is
// still a cost of trading, and moving money into the trading account is not a
// cost at all — it is still the household's money.
export function getTradingCosts({ envelopes = [], transactions = [] }, year) {
  const flagged = new Set(envelopes.filter((e) => e.isTradingCost).map((e) => e.id));
  if (flagged.size === 0) return { total: 0, byEnvelope: [], flaggedCount: 0 };

  const range = getYearRange(year);
  const spent = new Map();
  for (const t of transactions) {
    if (!flagged.has(t.categoryId) || !isDateInRange(t.date, range)) continue;
    spent.set(t.categoryId, (spent.get(t.categoryId) ?? 0) + t.amount);
  }

  const byEnvelope = [...spent.entries()]
    .map(([id, amount]) => ({ id, name: envelopes.find((e) => e.id === id)?.name ?? 'Envelope', amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    total: byEnvelope.reduce((sum, e) => sum + e.amount, 0),
    byEnvelope,
    flaggedCount: flagged.size,
  };
}

// Payouts are income rows tagged as such. An income row with no kind at all
// predates the tagging and is not counted — guessing which old deposits were
// payouts would invent a history.
export function getTradingPayouts({ income = [] }, year) {
  const range = getYearRange(year);
  const rows = income.filter((i) => i.kind === TRADING_PAYOUT_KIND && isDateInRange(i.date, range));
  return { total: rows.reduce((sum, i) => sum + i.amount, 0), count: rows.length };
}

/**
 * The year's trading, as one figure with its two halves.
 *
 * `net` is payouts minus costs and may be negative, which is the whole point:
 * a year that cost more than it returned should say so plainly rather than
 * showing a large payouts number and leaving the subtraction to the reader.
 */
export function getTradingYear({ envelopes = [], transactions = [], income = [] } = {}, { today = new Date() } = {}) {
  const year = today.getFullYear();
  const costs = getTradingCosts({ envelopes, transactions }, year);
  const payouts = getTradingPayouts({ income }, year);

  return {
    year,
    costs,
    payouts,
    net: Math.round((payouts.total - costs.total) * 100) / 100,
    // Nothing flagged and nothing tagged means there is nothing to report,
    // as against a real net of zero.
    hasData: costs.flaggedCount > 0 || payouts.count > 0,
  };
}
