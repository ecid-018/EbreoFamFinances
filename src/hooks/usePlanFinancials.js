import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { getCurrentMonth } from '../utils/date.js';
import { getActiveAccounts } from '../utils/accounts.js';
import { ACCOUNT_ROLES } from '../utils/plan/accountTypes.js';
import { buildGuardRails } from '../utils/plan/guardRails.js';
import { splitGoals, rollUpGoalGroups, getAccountReconciliation } from '../utils/plan/goals.js';
import { isPlanConfigured, resolveSplit, getSplitTotal, getSplitRemainder, isSplitBalanced } from '../utils/plan/settings.js';
import { simulateGoalWaterfall, getGoalPace, getAshoreCountdown, getMonthsLate } from '../utils/plan/simulate.js';

// Everything the Plan view shows, in one memo over state.
//
// READ-ONLY by design: it calls pure functions and never dispatches. The Plan
// view is an overview of decisions made elsewhere — goals are edited on the
// Goals tab, figures in Settings — so there is nothing here that could write.

const ROLE_LABEL = Object.fromEntries(ACCOUNT_ROLES.map((r) => [r.value, r.label]));

export function usePlanFinancials() {
  const { state } = useApp();
  const { accounts, goals, planSettings, transfers, paydays, paydayAllocations } = state;

  return useMemo(() => {
    // Read once, so every figure below describes the same moment.
    const today = new Date();
    const year = today.getFullYear();

    const configured = isPlanConfigured(planSettings);
    const split = resolveSplit(planSettings, goals);
    const { goals: openGoals, sinkingFunds, achieved } = splitGoals(goals);

    const simulation = simulateGoalWaterfall({
      goals,
      settings: planSettings,
      startMonth: getCurrentMonth(today),
    });
    const projectedByGoal = new Map(simulation.completions.map((c) => [c.goalId, c.monthKey]));

    // One row per goal_group, plus ungrouped goals on their own. A group's
    // pace and projection come from its goals; the group itself has neither a
    // single target date nor a single place in the priority order.
    const goalRows = rollUpGoalGroups(openGoals).map((row) => {
      const projectedMonthKey = row.isGroup
        ? row.goals.map((g) => projectedByGoal.get(g.id)).filter(Boolean).sort().pop() ?? null
        : projectedByGoal.get(row.goals[0].id) ?? null;
      return {
        ...row,
        pct: row.target > 0 ? Math.min(100, (row.saved / row.target) * 100) : 0,
        // A group has neither one target date nor one place in the priority
        // order, so it gets neither a pace nor a lateness.
        pace: row.isGroup ? null : getGoalPace(row.goals[0], { today }),
        projectedMonthKey,
        monthsLate: row.isGroup ? 0 : getMonthsLate(projectedMonthKey, row.goals[0].targetDate),
      };
    });

    const guardRails = buildGuardRails({
      accounts,
      planSettings,
      transfers,
      paydays,
      paydayAllocations,
      year,
    });

    const roles = getActiveAccounts(accounts)
      .filter((a) => a.role)
      .map((a) => ({ account: a, roleLabel: ROLE_LABEL[a.role] ?? a.role }))
      .sort((a, b) => a.roleLabel.localeCompare(b.roleLabel));

    return {
      configured,
      settings: planSettings,
      split,
      splitTotal: getSplitTotal(planSettings),
      splitRemainder: getSplitRemainder(planSettings),
      splitBalanced: isSplitBalanced(planSettings),
      ashore: getAshoreCountdown(planSettings?.targetAshoreYear, { today }),
      simulation,
      goalRows,
      sinkingFunds,
      achievedCount: achieved.length,
      guardRails,
      roles,
      reconciliation: getAccountReconciliation(accounts, goals).filter((r) => Math.abs(r.gap) >= 1),
    };
  }, [accounts, goals, planSettings, transfers, paydays, paydayAllocations]);
}
