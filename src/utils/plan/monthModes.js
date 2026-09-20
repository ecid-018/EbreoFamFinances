// Whether a month is a paid month at sea or a month at home on vacation.
//
// The distinction is not about what the budgets ARE — 0005 made those
// month-scoped, so a vacation month simply has its own budget rows. It is about
// what they are measured AGAINST. A paid month is funded by income; a vacation
// month has none, and is funded from the vacation reserve the paid months built.
// Comparing a vacation month's budgets against its (zero) income would report
// every month at home as catastrophically over budget.

export const MONTH_MODES = { SEA: 'sea', VACATION: 'vacation' };

// A month with no row is a paid month. That default is what every month
// resolved to before this table existed, so an empty table changes nothing.
export function getMonthMode(monthModes = [], monthKey) {
  return monthModes.find((row) => row.monthKey === monthKey)?.mode ?? MONTH_MODES.SEA;
}

export function isVacationMonth(monthModes = [], monthKey) {
  return getMonthMode(monthModes, monthKey) === MONTH_MODES.VACATION;
}

// What this month has to allocate. At sea that is the income actually received.
// On vacation it is what the vacation reserve holds — read from the goal that
// plan_settings points at, so the household names it once in Settings rather
// than this module guessing at a name.
//
// Returns income when the mode is sea, when no vacation goal is configured, or
// when that goal no longer exists: an unconfigured plan should degrade to the
// behaviour from before this phase, not to zero.
export function getAvailableToAllocate({ mode, totalIncome, goals = [], planSettings }) {
  if (mode !== MONTH_MODES.VACATION) return { amount: totalIncome, source: 'income' };

  const goalId = planSettings?.vacationGoalId;
  if (!goalId) return { amount: totalIncome, source: 'income', unconfigured: true };

  const goal = goals.find((g) => g.id === goalId);
  if (!goal) return { amount: totalIncome, source: 'income', unconfigured: true };

  return { amount: goal.saved, source: 'vacationReserve', goalName: goal.name };
}
