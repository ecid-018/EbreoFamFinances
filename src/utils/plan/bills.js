// Bills and subscriptions: what is due, when, and what they cost per month.
//
// A bill is a reminder plus a prefilled form. Nothing here pays anything, and
// nothing here advances a due date — pay_bill owns that, because advancing the
// date and writing the expense have to happen together or not at all. The one
// date this file computes is the FIRST due date of a new bill, which is a
// different question ("when does this next fall due?") and not a second copy
// of the same rule.

import { getDaysInMonth, pad2, toISODateString } from '../date.js';

// Three things recur, not one. They share a table and every field that
// matters; what differs is what "done" means for each.
export const SCHEDULE_KINDS = { BILL: 'bill', INCOMING: 'incoming', TASK: 'task' };

export const SCHEDULE_KIND_META = [
  { value: SCHEDULE_KINDS.BILL, label: 'Bill', hint: 'Something we pay', action: 'Pay' },
  { value: SCHEDULE_KINDS.INCOMING, label: 'Expected', hint: 'Money we expect to arrive', action: 'Received' },
  { value: SCHEDULE_KINDS.TASK, label: 'Task', hint: 'A job with a date', action: 'Done' },
];

// How many days after its date an expected payment goes from "due" to "hasn't
// turned up". Money is routinely a day or two late; two days is long enough
// not to cry wolf and short enough to still chase it.
export const INCOMING_GRACE_DAYS = 2;

export function getKindMeta(kind) {
  return SCHEDULE_KIND_META.find((k) => k.value === kind) ?? SCHEDULE_KIND_META[0];
}

// An item with no kind is a bill: that is what every row was before 0014.
export function getKind(item) {
  return item?.kind ?? SCHEDULE_KINDS.BILL;
}

export const BILL_PERIODS = [
  { value: 'monthly', label: 'Monthly', months: 1 },
  { value: 'quarterly', label: 'Every 3 months', months: 3 },
  { value: 'semiannual', label: 'Every 6 months', months: 6 },
  { value: 'annual', label: 'Yearly', months: 12 },
];

const MONTHS_BY_PERIOD = Object.fromEntries(BILL_PERIODS.map((p) => [p.value, p.months]));

export function getPeriodMonths(period) {
  return MONTHS_BY_PERIOD[period] ?? 1;
}

export function getPeriodLabel(period) {
  return BILL_PERIODS.find((p) => p.value === period)?.label ?? period;
}

// What a bill costs per month, whatever rhythm it is actually paid on. A
// yearly premium is a twelfth of itself every month for planning purposes.
export function getMonthlyEquivalent(bill) {
  if (!bill || !(bill.amount > 0)) return 0;
  return bill.amount / getPeriodMonths(bill.period);
}

// Only what is actually PAID. Counting expected money here would inflate
// outgoings with income, and counting tasks would add jobs that cost nothing.
export function getFixedCostsPerMonth(bills = []) {
  return bills
    .filter((b) => b.isActive && getKind(b) === SCHEDULE_KINDS.BILL)
    .reduce((total, b) => total + getMonthlyEquivalent(b), 0);
}

// The next date with this day-of-month, counting today as still to come.
// A day past the end of a short month falls on that month's last day.
export function getNextOccurrence(dueDay, today = new Date()) {
  if (!dueDay || dueDay < 1 || dueDay > 31) return null;
  let year = today.getFullYear();
  let monthIndex = today.getMonth();
  const clamp = (y, m) => Math.min(dueDay, getDaysInMonth(y, m));
  if (clamp(year, monthIndex) < today.getDate()) {
    const next = new Date(year, monthIndex + 1, 1);
    year = next.getFullYear();
    monthIndex = next.getMonth();
  }
  return `${year}-${pad2(monthIndex + 1)}-${pad2(clamp(year, monthIndex))}`;
}

// Whole days from today until the bill is due. Negative means overdue.
export function getDaysUntilDue(bill, today = new Date()) {
  if (!bill?.nextDue) return null;
  const [y, m, d] = bill.nextDue.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due - from) / 86400000);
}

export function isOverdue(bill, today = new Date()) {
  const days = getDaysUntilDue(bill, today);
  return days != null && days < 0;
}

// Active bills falling due inside the window, soonest first. Overdue ones are
// included and sort to the top: a bill that was missed is more urgent than one
// that is merely close.
//
// Nothing needs to check whether the bill was already paid. pay_bill moves
// next_due forward as part of paying, so a bill still showing a date in the
// window has not been paid for that cycle.
export function getDueSoon(bills = [], today = new Date(), withinDays = 14) {
  return bills
    .filter((b) => b.isActive && b.nextDue)
    .map((b) => ({ ...b, daysUntilDue: getDaysUntilDue(b, today) }))
    .filter((b) => b.daysUntilDue <= withinDays)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

// An expected payment that has not been logged within the grace period.
// Nothing here can tell whether the money actually arrived -- it only knows
// nobody has ticked it off -- so the wording everywhere says "not logged",
// not "not received".
export function isOverdueIncoming(item, today = new Date()) {
  if (getKind(item) !== SCHEDULE_KINDS.INCOMING || !item.isActive) return false;
  const days = getDaysUntilDue(item, today);
  return days != null && days < -INCOMING_GRACE_DAYS;
}

export function groupByKind(items = []) {
  const active = items.filter((b) => b.isActive);
  const byDue = (a, b) => String(a.nextDue ?? '9999').localeCompare(String(b.nextDue ?? '9999'));
  return SCHEDULE_KIND_META.map((meta) => ({
    ...meta,
    items: active.filter((b) => getKind(b) === meta.value).sort(byDue),
  })).filter((group) => group.items.length > 0);
}

export function splitBills(bills = []) {
  const active = [...bills.filter((b) => b.isActive)].sort((a, b) =>
    String(a.nextDue ?? '9999').localeCompare(String(b.nextDue ?? '9999'))
  );
  return { active, inactive: bills.filter((b) => !b.isActive) };
}

// What the expense form should open with when paying a bill. The note names
// the bill so the expense is recognisable in a list months later.
export function getPaymentDraft(bill, today = new Date()) {
  return {
    billId: bill.id,
    date: toISODateString(today),
    amount: bill.amount,
    note: bill.name,
    categoryId: bill.envelopeId ?? null,
    accountId: bill.accountId ?? null,
  };
}
