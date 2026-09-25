import { describe, it, expect } from 'vitest';
import {
  getMonthWindow,
  formatMonthShort,
  getNetWorthSeries,
  getNetWorthByType,
  getIncomeByMonth,
  getExpensesByMonth,
  getExpensesByGroup,
  getPlanProgressSeries,
  getNetWorthChange,
  getNetWorthPlot,
  trimLeadingEmpty,
} from './reports.js';

// Every figure invented.
const snap = (monthKey, over = {}) => ({
  monthKey, takenOn: `${monthKey}-01`, totalPhp: 1000, totalUsd: 0, usdPhpRate: null,
  bankTotal: 600, cooperativeTotal: 300, ewalletTotal: 100, cashTotal: 0,
  receivableTotal: 0, goalsSavedTotal: 400, ...over,
});

describe('getMonthWindow', () => {
  it('ends with the month containing today, oldest first', () => {
    expect(getMonthWindow(new Date(2026, 5, 15), 4)).toEqual(['2026-03', '2026-04', '2026-05', '2026-06']);
  });

  it('crosses a year boundary', () => {
    expect(getMonthWindow(new Date(2026, 0, 5), 3)).toEqual(['2025-11', '2025-12', '2026-01']);
  });
});

describe('formatMonthShort', () => {
  it('reads as a short month name', () => {
    expect(formatMonthShort('2026-03')).toBe('Mar');
  });
});

describe('getNetWorthSeries', () => {
  it('sorts oldest first', () => {
    const got = getNetWorthSeries([snap('2026-03'), snap('2026-01'), snap('2026-02')]);
    expect(got.map((s) => s.monthKey)).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  // A chart of the past must not move when today's exchange rate does.
  it('folds USD in at the rate stored with that snapshot', () => {
    const got = getNetWorthSeries([snap('2026-01', { totalUsd: 100, usdPhpRate: 60 })]);
    expect(got[0].value).toBe(7000);
    expect(got[0].usdUnconverted).toBe(false);
  });

  it('will not convert at a rate nobody recorded, and says so', () => {
    const got = getNetWorthSeries([snap('2026-01', { totalUsd: 100, usdPhpRate: null })]);
    expect(got[0].value).toBe(1000);
    expect(got[0].usdUnconverted).toBe(true);
  });

  it('does not invent a rate flag when there is no USD at all', () => {
    expect(getNetWorthSeries([snap('2026-01')])[0].usdUnconverted).toBe(false);
  });

  // The whole point of the table beside the chart.
  it('carries the per-type split through', () => {
    const got = getNetWorthSeries([snap('2026-01')]);
    expect(got[0].byType.map((t) => [t.label, t.value])).toEqual([
      ['Bank', 600], ['Cooperative', 300], ['E-wallet', 100], ['Cash', 0],
    ]);
  });

  it('is empty with no snapshots rather than inventing a month', () => {
    expect(getNetWorthSeries([])).toEqual([]);
    expect(getNetWorthSeries()).toEqual([]);
  });
});

describe('getNetWorthByType', () => {
  it('gives one series per type, for small multiples', () => {
    const got = getNetWorthByType([snap('2026-01'), snap('2026-02', { bankTotal: 700 })]);
    expect(got.map((s) => s.label)).toEqual(['Bank', 'Cooperative', 'E-wallet']);
    expect(got[0].points.map((p) => p.value)).toEqual([600, 700]);
  });

  it('leaves out a type that is zero throughout', () => {
    expect(getNetWorthByType([snap('2026-01')]).some((s) => s.label === 'Cash')).toBe(false);
  });
});

describe('getIncomeByMonth', () => {
  const months = ['2026-01', '2026-02', '2026-03'];
  const income = [
    { id: 'a', amount: 900, date: '2026-01-05', budgetMonthKey: '2026-01', kind: 'pay' },
    { id: 'b', amount: 100, date: '2026-01-20', budgetMonthKey: '2026-01', kind: 'trading_payout' },
    { id: 'c', amount: 50, date: '2026-03-01', budgetMonthKey: '2026-03', kind: null },
    { id: 'd', amount: 9999, date: '2025-12-01', budgetMonthKey: '2025-12', kind: 'pay' },
  ];

  // Nothing came in. That is genuinely zero, unlike a missing snapshot.
  it('includes every month in the window, zero when nothing arrived', () => {
    const got = getIncomeByMonth(income, months);
    expect(got.map((m) => m.value)).toEqual([1000, 0, 50]);
  });

  it('splits by kind', () => {
    const jan = getIncomeByMonth(income, months)[0];
    expect(jan.byKind.map((k) => [k.label, k.value])).toEqual([['Pay', 900], ['Trading', 100]]);
  });

  // Untagged is not a different kind of money, it is untagged.
  it('files income with no kind under Other', () => {
    const mar = getIncomeByMonth(income, months)[2];
    expect(mar.byKind).toEqual([{ key: 'other', label: 'Other', value: 50 }]);
  });

  it('files an unrecognised kind under Other too', () => {
    const odd = [{ id: 'x', amount: 5, date: '2026-01-01', budgetMonthKey: '2026-01', kind: 'nonsense' }];
    expect(getIncomeByMonth(odd, months)[0].byKind[0].key).toBe('other');
  });

  it('uses the budget month, not the calendar month it was banked in', () => {
    const late = [{ id: 'y', amount: 7, date: '2026-02-28', budgetMonthKey: '2026-03', kind: 'pay' }];
    expect(getIncomeByMonth(late, months).map((m) => m.value)).toEqual([0, 0, 7]);
  });
});

describe('getExpensesByMonth', () => {
  it('totals each month in the window', () => {
    const tx = [
      { id: 't1', date: '2026-01-05', amount: 200 },
      { id: 't2', date: '2026-01-06', amount: 300 },
      { id: 't3', date: '2026-02-01', amount: 50 },
    ];
    expect(getExpensesByMonth(tx, ['2026-01', '2026-02']).map((m) => m.value)).toEqual([500, 50]);
  });
});

describe('getExpensesByGroup', () => {
  const envelopes = [{ id: 'e1', group: 'Needs' }, { id: 'e2', group: 'Wants' }, { id: 'e3', group: 'Needs' }];
  const tx = [
    { id: 't1', date: '2026-01-05', amount: 200, categoryId: 'e1' },
    { id: 't2', date: '2026-01-06', amount: 100, categoryId: 'e3' },
    { id: 't3', date: '2026-01-07', amount: 400, categoryId: 'e2' },
    { id: 't4', date: '2026-02-01', amount: 900, categoryId: 'e1' },
  ];

  it('totals by group for one month, biggest first', () => {
    expect(getExpensesByGroup(envelopes, tx, '2026-01')).toEqual([
      { label: 'Wants', value: 400 },
      { label: 'Needs', value: 300 },
    ]);
  });

  // Money left the account either way.
  it('gives uncategorised spending its own row', () => {
    const orphan = [{ id: 't5', date: '2026-01-01', amount: 20, categoryId: null }];
    expect(getExpensesByGroup(envelopes, orphan, '2026-01')).toEqual([{ label: 'Needs a category', value: 20 }]);
  });

  it('is empty for a month with no spending', () => {
    expect(getExpensesByGroup(envelopes, tx, '2026-09')).toEqual([]);
  });
});

describe('getPlanProgressSeries', () => {
  it('gives the two things snapshots can actually reconstruct', () => {
    const got = getPlanProgressSeries([snap('2026-01'), snap('2026-02', { goalsSavedTotal: 500 })]);
    expect(got.map((s) => s.label)).toEqual(['Saved in goals', 'Held in banks']);
    expect(got[0].points.map((p) => p.value)).toEqual([400, 500]);
  });

  it('is empty with no snapshots', () => {
    expect(getPlanProgressSeries([])).toEqual([]);
  });
});

describe('getNetWorthChange', () => {
  it('compares the first recorded month with the last', () => {
    const series = getNetWorthSeries([snap('2026-01'), snap('2026-03', { totalPhp: 1500 })]);
    expect(getNetWorthChange(series)).toEqual({ delta: 500, from: '2026-01', to: '2026-03', pct: 50 });
  });

  it('reports a fall as a negative', () => {
    const series = getNetWorthSeries([snap('2026-01'), snap('2026-02', { totalPhp: 750 })]);
    expect(getNetWorthChange(series).delta).toBe(-250);
  });

  // One point is a position, not a trend.
  it('is null with fewer than two months', () => {
    expect(getNetWorthChange(getNetWorthSeries([snap('2026-01')]))).toBeNull();
    expect(getNetWorthChange([])).toBeNull();
  });

  it('has no percentage to give when the first month was zero', () => {
    const series = getNetWorthSeries([snap('2026-01', { totalPhp: 0 }), snap('2026-02')]);
    expect(getNetWorthChange(series).pct).toBeNull();
  });
});

describe('getNetWorthPlot', () => {
  const series = (...snaps) => getNetWorthSeries(snaps);

  it('plots the combined figure when every month has a rate', () => {
    const got = getNetWorthPlot(series(
      snap('2026-01', { totalUsd: 100, usdPhpRate: 60 }),
      snap('2026-02', { totalUsd: 100, usdPhpRate: 60 }),
    ));
    expect(got.basis).toBe('combined');
    expect(got.points.map((p) => p.value)).toEqual([7000, 7000]);
    expect(got.note).toBeNull();
  });

  // The bug this exists for: a month holding dollars with no rate plotted
  // BELOW the month before it, which held less of everything.
  it('drops the whole series to pesos when any month is missing a rate', () => {
    const got = getNetWorthPlot(series(
      snap('2026-01', { totalPhp: 1000, totalUsd: 100, usdPhpRate: 60 }),
      snap('2026-02', { totalPhp: 1100, totalUsd: 100, usdPhpRate: null }),
    ));
    expect(got.basis).toBe('php');
    expect(got.points.map((p) => p.value)).toEqual([1000, 1100]);
    expect(got.note).toMatch(/Pesos only/);
  });

  it('never lets a missing rate make a rising month look like a fall', () => {
    const got = getNetWorthPlot(series(
      snap('2026-01', { totalPhp: 1000, totalUsd: 1800, usdPhpRate: 62 }),
      snap('2026-02', { totalPhp: 1100, totalUsd: 2100, usdPhpRate: null }),
    ));
    expect(got.points[1].value).toBeGreaterThan(got.points[0].value);
  });

  it('stays on the combined basis when there is no USD at all', () => {
    expect(getNetWorthPlot(series(snap('2026-01'), snap('2026-02'))).basis).toBe('combined');
  });

  it('survives an empty series', () => {
    expect(getNetWorthPlot([])).toMatchObject({ points: [], basis: 'combined' });
  });
});

describe('trimLeadingEmpty', () => {
  const p = (monthKey, value) => ({ monthKey, value });

  it('drops empty months from the front', () => {
    expect(trimLeadingEmpty([p('a', 0), p('b', 0), p('c', 5), p('d', 7)]).map((x) => x.monthKey))
      .toEqual(['c', 'd']);
  });

  // Closing a gap in the middle would make the axis lie about time.
  it('keeps empty months in the middle', () => {
    expect(trimLeadingEmpty([p('a', 5), p('b', 0), p('c', 7)]).map((x) => x.monthKey))
      .toEqual(['a', 'b', 'c']);
  });

  it('leaves an all-empty series alone rather than returning nothing', () => {
    expect(trimLeadingEmpty([p('a', 0), p('b', 0)])).toHaveLength(2);
  });

  it('is a no-op when the first month already has data', () => {
    expect(trimLeadingEmpty([p('a', 1), p('b', 0)])).toHaveLength(2);
  });

  it('survives an empty list', () => {
    expect(trimLeadingEmpty([])).toEqual([]);
  });
});
