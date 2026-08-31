import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { filterByMonth, getDaysLeftInMonth, isSameMonth, getCurrentMonth } from '../utils/date.js';
import { groupByOrder } from '../utils/group.js';

function sumBy(items, field) {
  return items.reduce((total, item) => total + item[field], 0);
}

export function useDerivedFinancials() {
  const { state } = useApp();
  const { envelopes, transactions, income, accounts, goals, month } = state;

  return useMemo(() => {
    const monthTransactions = filterByMonth(transactions, month.year, month.monthIndex);
    const monthIncomeEntries = filterByMonth(income, month.year, month.monthIndex, 'budgetMonthKey');

    const totalIncome = sumBy(monthIncomeEntries, 'amount');
    const totalSpent = sumBy(monthTransactions, 'amount');
    const totalBudget = sumBy(envelopes, 'monthlyBudget');
    const unassigned = totalIncome - totalBudget;
    const safeToSpend = totalIncome - totalSpent;

    const envelopeStats = envelopes
      .map((env) => {
        const spent = sumBy(
          monthTransactions.filter((t) => t.categoryId === env.id),
          'amount'
        );
        const ratio = env.monthlyBudget > 0 ? spent / env.monthlyBudget : spent > 0 ? Infinity : 0;
        return { ...env, spent, ratio, isOver: spent > env.monthlyBudget };
      })
      .sort((a, b) => b.ratio - a.ratio);

    const envelopeStatsByHighestSpend = [...envelopeStats].sort((a, b) => b.spent - a.spent);

    const envelopeGroups = groupByOrder(envelopeStats, (env) => env.group).map(({ group, items }) => ({
      group,
      items,
      spent: sumBy(items, 'spent'),
      budget: sumBy(items, 'monthlyBudget'),
      isOver: sumBy(items, 'spent') > sumBy(items, 'monthlyBudget'),
    }));

    const uncategorizedTransactions = transactions.filter((t) => t.categoryId == null);

    const daysLeft = getDaysLeftInMonth(month.year, month.monthIndex);
    const isCurrentMonth = isSameMonth(month, getCurrentMonth());
    const isPastMonth = !isCurrentMonth && new Date(month.year, month.monthIndex + 1, 0) < new Date();
    const tightestEnvelope = envelopeStats[0] ?? null;
    const overBudgetEnvelopes = envelopeStats.filter((env) => env.isOver);

    const totalAccountBalance = sumBy(accounts, 'balance');
    const totalGoalsSaved = sumBy(goals, 'saved');
    const totalGoalsTarget = sumBy(goals, 'target');
    const goalsProgressPct = totalGoalsTarget > 0 ? (totalGoalsSaved / totalGoalsTarget) * 100 : 0;
    const savingsFundedThisMonth = sumBy(
      envelopeStats.filter((env) => env.group === 'Savings'),
      'spent'
    );

    return {
      totalIncome,
      totalSpent,
      totalBudget,
      unassigned,
      safeToSpend,
      envelopeStats,
      envelopeStatsByHighestSpend,
      envelopeGroups,
      uncategorizedTransactions,
      daysLeft,
      isCurrentMonth,
      isPastMonth,
      tightestEnvelope,
      overBudgetEnvelopes,
      monthIncomeEntries,
      totalAccountBalance,
      goalsProgressPct,
      savingsFundedThisMonth,
    };
  }, [envelopes, transactions, income, accounts, goals, month]);
}
