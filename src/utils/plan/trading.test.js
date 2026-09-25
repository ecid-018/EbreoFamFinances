import { describe, it, expect } from 'vitest';
import { getTradingCosts, getTradingPayouts, getTradingYear } from './trading.js';

// Every figure invented.
const TODAY = new Date(2026, 5, 15);
const envelopes = [
  { id: 'e1', name: 'Options Data Feed', isTradingCost: true },
  { id: 'e2', name: 'Platform fees', isTradingCost: true },
  { id: 'e3', name: 'Food', isTradingCost: false },
];
const tx = (id, categoryId, amount, date) => ({ id, categoryId, amount, date });
const transactions = [
  tx('t1', 'e1', 900, '2026-02-01'),
  tx('t2', 'e1', 100, '2026-05-01'),
  tx('t3', 'e2', 400, '2026-03-01'),
  tx('t4', 'e3', 9000, '2026-03-01'),   // not a trading cost
  tx('t5', 'e1', 5000, '2025-12-31'),   // last year
];
const income = [
  { id: 'i1', amount: 2000, date: '2026-04-01', kind: 'trading_payout' },
  { id: 'i2', amount: 500, date: '2026-05-01', kind: 'trading_payout' },
  { id: 'i3', amount: 90000, date: '2026-04-01', kind: 'pay' },     // not a payout
  { id: 'i4', amount: 700, date: '2026-04-01' },                     // untagged
  { id: 'i5', amount: 4000, date: '2025-06-01', kind: 'trading_payout' }, // last year
];

describe('getTradingCosts', () => {
  it('totals expenses in flagged envelopes for the year, biggest first', () => {
    const got = getTradingCosts({ envelopes, transactions }, 2026);
    expect(got.total).toBe(1400);
    expect(got.byEnvelope.map((e) => [e.name, e.amount])).toEqual([
      ['Options Data Feed', 1000],
      ['Platform fees', 400],
    ]);
  });

  it('ignores unflagged envelopes and other years', () => {
    expect(getTradingCosts({ envelopes, transactions }, 2025).total).toBe(5000);
    expect(getTradingCosts({ envelopes: [], transactions }, 2026).total).toBe(0);
  });

  it('says how many envelopes are flagged, so the screen can tell "none" from "zero"', () => {
    expect(getTradingCosts({ envelopes, transactions }, 2026).flaggedCount).toBe(2);
    expect(getTradingCosts({ envelopes: [envelopes[2]], transactions }, 2026).flaggedCount).toBe(0);
  });
});

describe('getTradingPayouts', () => {
  it('counts only income tagged as a payout, this year', () => {
    const got = getTradingPayouts({ income }, 2026);
    expect(got).toEqual({ total: 2500, count: 2 });
  });

  // Guessing which old deposits were payouts would invent a history.
  it('does not count untagged income', () => {
    expect(getTradingPayouts({ income: [{ amount: 999, date: '2026-01-01' }] }, 2026).total).toBe(0);
  });
});

describe('getTradingYear', () => {
  it('nets payouts against costs', () => {
    const got = getTradingYear({ envelopes, transactions, income }, { today: TODAY });
    expect(got).toMatchObject({ year: 2026, net: 1100, hasData: true });
    expect(got.costs.total).toBe(1400);
    expect(got.payouts.total).toBe(2500);
  });

  // A year that cost more than it returned has to say so, not show a large
  // payouts figure and leave the subtraction to the reader.
  it('goes negative when the year cost more than it returned', () => {
    const expensive = [...transactions, tx('t6', 'e1', 5000, '2026-06-01')];
    expect(getTradingYear({ envelopes, transactions: expensive, income }, { today: TODAY }).net).toBe(-3900);
  });

  it('reports having nothing to say when nothing is flagged or tagged', () => {
    expect(getTradingYear({ envelopes: [envelopes[2]], transactions, income: [] }, { today: TODAY }).hasData).toBe(false);
  });

  it('survives no data at all', () => {
    expect(getTradingYear().net).toBe(0);
    expect(getTradingYear({}, { today: TODAY }).hasData).toBe(false);
  });
});
