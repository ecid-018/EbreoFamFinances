// Resolving "what is this envelope's budget in this month".
//
// Until phase 4 there was one budget per envelope, shared by every month:
// derive.js filtered transactions by month but summed monthlyBudget flat, so
// changing a budget silently rewrote what past months were measured against.
//
// envelope_budgets fixes that without a backfill. It is SPARSE — a month only
// gets a row when its budget differs from what came before — and
// envelopes.monthlyBudget stays as the base, never rewritten. Resolution runs:
//
//   the row for this month
//     -> else the newest row for an EARLIER month (carried forward)
//     -> else envelopes.monthlyBudget (the base)
//
// so a month recorded before the table existed still resolves to the figure it
// always had, and a month after an explicit row inherits that row until the
// next one. Month keys are 'YYYY-MM', which sort chronologically under plain
// string comparison — no date parsing anywhere in here.

export const BUDGET_SOURCE = {
  MONTH: 'month', // an explicit row for the month being viewed
  CARRIED: 'carried', // inherited from an earlier month's row
  BASE: 'base', // no rows at all; envelopes.monthlyBudget
};

// Rows grouped per envelope and sorted newest first, so resolution is two
// finds rather than a scan per envelope per render.
export function indexBudgetRows(rows = []) {
  const byEnvelope = new Map();
  for (const row of rows) {
    if (!row?.envelopeId || !row?.monthKey) continue;
    const list = byEnvelope.get(row.envelopeId);
    if (list) list.push(row);
    else byEnvelope.set(row.envelopeId, [row]);
  }
  for (const list of byEnvelope.values()) {
    list.sort((a, b) => (a.monthKey < b.monthKey ? 1 : a.monthKey > b.monthKey ? -1 : 0));
  }
  return byEnvelope;
}

export function resolveEnvelopeBudget(envelope, index, monthKey) {
  const rows = index.get(envelope.id) ?? [];
  const exact = rows.find((r) => r.monthKey === monthKey);
  if (exact) {
    return { amount: exact.amount, source: BUDGET_SOURCE.MONTH, fromMonthKey: monthKey };
  }
  // Already sorted newest first, so the first earlier row is the nearest one.
  const carried = rows.find((r) => r.monthKey < monthKey);
  if (carried) {
    return { amount: carried.amount, source: BUDGET_SOURCE.CARRIED, fromMonthKey: carried.monthKey };
  }
  return { amount: envelope.monthlyBudget, source: BUDGET_SOURCE.BASE, fromMonthKey: null };
}

// Returns envelopes with monthlyBudget REPLACED by the figure that applies in
// this month. Everything downstream (totals, ratios, isOver) then keeps
// working unchanged — the month dimension stops at this boundary.
//
// Note the asymmetry this creates, which callers must respect: state.envelopes
// holds the BASE figure, while a resolved envelope holds the month's figure.
// Anything showing or editing a budget for a specific month reads the resolved
// list; only the base itself is written back to envelopes.monthly_budget.
export function resolveEnvelopesForMonth(envelopes = [], rows = [], monthKey) {
  const index = indexBudgetRows(rows);
  return envelopes.map((envelope) => {
    const { amount, source, fromMonthKey } = resolveEnvelopeBudget(envelope, index, monthKey);
    return { ...envelope, monthlyBudget: amount, budgetSource: source, budgetFromMonthKey: fromMonthKey };
  });
}

// Writing a budget for month M changes every later month that was inheriting
// from before M, so editing a month that has already closed would rewrite
// exactly the history this table exists to protect. The UI keeps past months
// read-only; this is the predicate it uses.
export function isMonthEditable(monthKey, currentMonthKey) {
  return monthKey >= currentMonthKey;
}
