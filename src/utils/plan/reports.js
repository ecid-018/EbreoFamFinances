// The numbers behind the Reports screen. Pure, so every figure on a chart can
// be checked without a browser.
//
// One rule runs through all of it: a month with no data is ABSENT, not zero.
// Drawing a zero for a month that was never recorded would show the household
// losing everything and getting it back, which is the single most misleading
// thing a net-worth chart can do.

import { addMonths, getMonthKey, getMonthKeyFromDateStr, parseMonthKey } from '../date.js';

// Which slice of an account's money each snapshot column holds. Labels are
// what the table shows; the keys are the snapshot's own columns.
export const ACCOUNT_TYPE_SERIES = [
  { key: 'bankTotal', label: 'Bank' },
  { key: 'cooperativeTotal', label: 'Cooperative' },
  { key: 'ewalletTotal', label: 'E-wallet' },
  { key: 'cashTotal', label: 'Cash' },
];

// income.kind, as the reports name it. 'other' catches both the explicit tag
// and every row logged before tagging existed -- see getIncomeByMonth.
export const INCOME_KIND_SERIES = [
  { key: 'pay', label: 'Pay' },
  { key: 'signoff', label: 'Sign-off' },
  { key: 'windfall', label: 'Windfall' },
  { key: 'trading_payout', label: 'Trading' },
  { key: 'other', label: 'Other' },
];

// The last `count` months ending with the one containing `today`, oldest first.
export function getMonthWindow(today = new Date(), count = 12) {
  const end = { year: today.getFullYear(), monthIndex: today.getMonth() };
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const { year, monthIndex } = addMonths(end, -i);
    out.push(getMonthKey(year, monthIndex));
  }
  return out;
}

export function formatMonthShort(monthKey) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return new Date(year, monthIndex, 1).toLocaleString('en-PH', { month: 'short' });
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Net worth per recorded month, oldest first.
 *
 * Only months that actually have a snapshot appear. USD is folded in at the
 * rate stored WITH that snapshot, not today's -- a chart of the past must not
 * move when the exchange rate does. A snapshot taken without a rate reports
 * its USD separately rather than converting at a rate nobody recorded.
 */
export function getNetWorthSeries(snapshots = []) {
  return [...snapshots]
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((s) => {
      const converted = s.usdPhpRate != null ? round2(s.totalUsd * s.usdPhpRate) : 0;
      return {
        monthKey: s.monthKey,
        value: round2(s.totalPhp + converted),
        php: s.totalPhp,
        usd: s.totalUsd,
        rate: s.usdPhpRate,
        // The chart can say so rather than quietly understating the month.
        usdUnconverted: s.usdPhpRate == null && s.totalUsd > 0,
        takenOn: s.takenOn,
        byType: ACCOUNT_TYPE_SERIES.map((t) => ({ ...t, value: s[t.key] ?? 0 })),
        goalsSaved: s.goalsSavedTotal ?? 0,
        receivable: s.receivableTotal ?? 0,
      };
    });
}

// One series per account type, for small multiples. Identity comes from the
// label above each little chart, never from colour -- the app's warm palette
// cannot separate four categories (measured: deltaE 3.4 under deutan).
export function getNetWorthByType(snapshots = []) {
  const series = getNetWorthSeries(snapshots);
  return ACCOUNT_TYPE_SERIES.map((t) => ({
    ...t,
    points: series.map((s) => ({ monthKey: s.monthKey, value: s.byType.find((b) => b.key === t.key)?.value ?? 0 })),
  })).filter((s) => s.points.some((p) => p.value !== 0));
}

/**
 * Income per month over a window, with the split by kind.
 *
 * Unlike net worth, a month with no income genuinely IS zero -- nothing came
 * in -- so every month in the window appears.
 */
export function getIncomeByMonth(income = [], months = []) {
  const wanted = new Set(months);
  const totals = new Map(months.map((m) => [m, 0]));
  const byKind = new Map(months.map((m) => [m, {}]));

  for (const entry of income) {
    const key = entry.budgetMonthKey ?? getMonthKeyFromDateStr(entry.date);
    if (!wanted.has(key)) continue;
    totals.set(key, round2(totals.get(key) + entry.amount));
    // A row logged before kinds existed is 'other' rather than a sixth
    // category: it is not a different kind of money, it is untagged.
    const kind = INCOME_KIND_SERIES.some((k) => k.key === entry.kind) ? entry.kind : 'other';
    const bucket = byKind.get(key);
    bucket[kind] = round2((bucket[kind] ?? 0) + entry.amount);
  }

  return months.map((monthKey) => ({
    monthKey,
    value: totals.get(monthKey),
    byKind: INCOME_KIND_SERIES.map((k) => ({ ...k, value: byKind.get(monthKey)[k.key] ?? 0 })).filter((k) => k.value > 0),
  }));
}

// Drops empty months from the FRONT only.
//
// A 12-month window on records that start in July is nine blank columns and
// three real ones, which reads as a fault rather than as history. Empty months
// in the MIDDLE stay: a month where nothing came in is a fact about that
// month, and closing the gap would make the axis lie about time.
export function trimLeadingEmpty(points = []) {
  const first = points.findIndex((p) => p.value !== 0);
  return first <= 0 ? points : points.slice(first);
}

export function getExpensesByMonth(transactions = [], months = []) {
  const wanted = new Set(months);
  const totals = new Map(months.map((m) => [m, 0]));
  for (const t of transactions) {
    const key = getMonthKeyFromDateStr(t.date);
    if (!wanted.has(key)) continue;
    totals.set(key, round2(totals.get(key) + t.amount));
  }
  return months.map((monthKey) => ({ monthKey, value: totals.get(monthKey) }));
}

// What each envelope group cost in one month, biggest first. Uncategorised
// spending gets its own row rather than disappearing: money left the account
// either way.
export function getExpensesByGroup(envelopes = [], transactions = [], monthKey) {
  const groupOf = new Map(envelopes.map((e) => [e.id, e.group]));
  const totals = new Map();
  for (const t of transactions) {
    if (getMonthKeyFromDateStr(t.date) !== monthKey) continue;
    const group = groupOf.get(t.categoryId) ?? 'Needs a category';
    totals.set(group, round2((totals.get(group) ?? 0) + t.amount));
  }
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

// Two things the household watches that snapshots CAN reconstruct.
//
// Per-goal history cannot be: a snapshot stores goals_saved_total, one figure
// for every goal together, so "this goal over time" is not in the data. The
// screen says that rather than drawing a line it cannot support.
export function getPlanProgressSeries(snapshots = []) {
  const series = getNetWorthSeries(snapshots);
  return [
    { key: 'goalsSaved', label: 'Saved in goals', points: series.map((s) => ({ monthKey: s.monthKey, value: s.goalsSaved })) },
    { key: 'bank', label: 'Held in banks', points: series.map((s) => ({ monthKey: s.monthKey, value: s.byType.find((b) => b.key === 'bankTotal')?.value ?? 0 })) },
  ].filter((s) => s.points.length > 0);
}

/**
 * Which figures the net-worth line may actually plot.
 *
 * A month whose USD was never given a rate is NOT comparable to one whose was:
 * plotting them on the same line shows a fall that did not happen. Measured on
 * real-shaped fixtures, a month holding $2,100 with no rate plotted BELOW the
 * month before it, which held less of everything.
 *
 * So the whole series drops to one basis whenever any month is missing a rate:
 * pesos only, stated on the chart. One consistent basis that understates is
 * honest; two bases on one line is a lie in the shape of a chart.
 */
export function getNetWorthPlot(series = []) {
  const mixed = series.some((s) => s.usdUnconverted);
  return {
    points: series.map((s) => ({ monthKey: s.monthKey, value: mixed ? s.php : s.value })),
    basis: mixed ? 'php' : 'combined',
    note: mixed
      ? 'Pesos only. At least one month holds dollars recorded without a rate, and converting some months but not others would show a change that never happened.'
      : null,
  };
}

// The change between the first and last recorded month. Null with fewer than
// two: one point is a position, not a trend.
export function getNetWorthChange(series = []) {
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const delta = round2(last.value - first.value);
  return {
    delta,
    from: first.monthKey,
    to: last.monthKey,
    pct: first.value > 0 ? round2((delta / first.value) * 100) : null,
  };
}
