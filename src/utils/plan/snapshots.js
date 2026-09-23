// Which closed months still need a net-worth snapshot.
//
// Balances are stored, not derived, so a month that has ended cannot be
// reconstructed later — the app has to record it while it can. This decides
// what is owed; the RPC does the recording.
//
// The current month is never snapshotted automatically. It has not finished,
// so a figure taken today would claim to be the month's closing position and
// be wrong by everything spent between now and the last day. "Snapshot now"
// exists for the case where someone deliberately wants today's figure.

import { addMonths, getCurrentMonth, getMonthKey, parseMonthKey } from '../date.js';

// How far back to offer to backfill. Anything older cannot be reconstructed
// either, so there is nothing to gain by walking the whole history.
const MAX_BACKFILL_MONTHS = 12;

export function hasSnapshot(snapshots = [], monthKey) {
  return snapshots.some((s) => s.monthKey === monthKey);
}

export function getLatestSnapshot(snapshots = []) {
  if (!snapshots.length) return null;
  // Month keys are 'YYYY-MM', so plain string comparison is chronological.
  return snapshots.reduce((latest, s) => (s.monthKey > latest.monthKey ? s : latest));
}

// Closed months with no snapshot, oldest first.
//
// `earliestMonthKey` bounds it to when the household actually had activity.
// Without it the answer is always MAX_BACKFILL_MONTHS on a fresh install, which
// reads as a year of lost data when the app may only be two months old. The
// point of showing this is to be honest about the gap, so overstating it is
// worse than useless.
export function getMonthsNeedingSnapshot(today = new Date(), snapshots = [], earliestMonthKey = null) {
  const current = getCurrentMonth(today);
  const needed = [];

  for (let back = 1; back <= MAX_BACKFILL_MONTHS; back += 1) {
    const month = addMonths(current, -back);
    const key = getMonthKey(month.year, month.monthIndex);
    if (earliestMonthKey && key < earliestMonthKey) break;
    if (!hasSnapshot(snapshots, key)) needed.push(key);
  }

  return needed.reverse();
}

// The month the household's records start in, from whichever of its dated
// entries is oldest. Month keys are 'YYYY-MM' so the comparison is a plain
// string one.
export function getEarliestActivityMonth({ transactions = [], income = [], transfers = [] } = {}) {
  let earliest = null;
  for (const list of [transactions, income, transfers]) {
    for (const row of list) {
      const key = row?.date?.slice(0, 7);
      if (key && (!earliest || key < earliest)) earliest = key;
    }
  }
  return earliest;
}

// The single month the app should record on its own: the one that just ended.
// Older gaps are left for the owner to fill deliberately rather than having
// the app quietly write a pile of rows dated today, all claiming to be
// historical positions they are not.
export function getMonthToAutoSnapshot(today = new Date(), snapshots = []) {
  const previous = addMonths(getCurrentMonth(today), -1);
  const key = getMonthKey(previous.year, previous.monthIndex);
  return hasSnapshot(snapshots, key) ? null : key;
}

export function formatMonthKey(monthKey) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return `${new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'long' })} ${year}`;
}
