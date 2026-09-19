// Pure helpers over the single plan_settings row.
//
// Every figure is optional and starts empty, so nothing here may assume a
// number is present. The rule throughout: an unset figure means "not decided
// yet" and must read as such, never as zero — showing ₱0 as though it were a
// decision is worse than showing nothing.

export const SPLIT_FIELDS = [
  { key: 'splitVacationReserve', label: 'Vacation reserve' },
  { key: 'splitInsurance', label: 'Insurance' },
  { key: 'splitGoals', label: 'Goals' },
  { key: 'splitTrips', label: 'Trips' },
  { key: 'splitRetirement', label: 'Retirement' },
  { key: 'splitTrading', label: 'Trading' },
];

function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function getSplitTotal(settings) {
  if (!settings) return 0;
  return SPLIT_FIELDS.reduce((total, f) => total + num(settings[f.key]), 0);
}

// How much of the hub amount is still unassigned. Null when there is no hub
// figure to measure against — "left to assign" is meaningless without one.
export function getSplitRemainder(settings) {
  if (!settings || settings.payHub == null) return null;
  return settings.payHub - getSplitTotal(settings);
}

export function isSplitBalanced(settings) {
  const remainder = getSplitRemainder(settings);
  if (remainder == null) return null;
  // Tolerate float dust from the numeric(12,2) round trip.
  return Math.abs(remainder) < 0.005;
}

// The minimum needed before any Plan feature can say something true. Without
// these, a Plan screen would be inventing numbers.
export function isPlanConfigured(settings) {
  if (!settings) return false;
  return settings.payHub != null && getSplitTotal(settings) > 0;
}

// The vacation line for a payday, once the pre-sign-off rule is applied.
//
// While the vacation reserve is below target, the vacation split is held at a
// fixed lower amount and the difference is added to goals. When the reserve
// reaches its target the rule lapses on its own — no one has to remember to
// switch it off.
export function resolveSplit(settings, goals) {
  const base = {
    vacation: num(settings?.splitVacationReserve),
    insurance: num(settings?.splitInsurance),
    goals: num(settings?.splitGoals),
    trips: num(settings?.splitTrips),
    retirement: num(settings?.splitRetirement),
    trading: num(settings?.splitTrading),
  };
  if (!settings?.presignoffActive || settings.presignoffVacationAmount == null) {
    return { ...base, presignoffApplied: false };
  }

  const vacationGoal = goals?.find((g) => g.id === settings.vacationGoalId) ?? null;
  const target = settings.vacationReserveTarget;
  // No goal or no target means the rule has nothing to measure, so it stays off
  // rather than silently reducing the vacation line forever.
  if (!vacationGoal || target == null || target <= 0) {
    return { ...base, presignoffApplied: false };
  }
  if (vacationGoal.saved >= target) {
    return { ...base, presignoffApplied: false };
  }

  const held = num(settings.presignoffVacationAmount);
  const freed = base.vacation - held;
  return {
    ...base,
    vacation: held,
    goals: base.goals + freed,
    presignoffApplied: true,
    presignoffFreed: freed,
  };
}
