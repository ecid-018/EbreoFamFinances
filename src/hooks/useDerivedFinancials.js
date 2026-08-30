import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { filterByMonth, getDaysLeftInMonth, isSameMonth, getCurrentMonth } from '../utils/date.js';

function sumBy(items, field) {
  return items.reduce((total, item) => total + item[field], 0);
}

export function useDerivedFinancials() {
  const { state } = useApp();
  const { envelopes, transactions, income, month, tithesSetAside, tithesAllocations } = state;

  return useMemo(() => {
    const monthTransactions = filterByMonth(transactions, month.year, month.monthIndex);
    const monthIncomeEntries = filterByMonth(income, month.year, month.monthIndex);

    const totalIncome = sumBy(monthIncomeEntries, 'amount');
    const totalSpent = sumBy(monthTransactions, 'amount');
    const totalBudget = sumBy(envelopes, 'monthlyBudget');
    const unassigned = totalIncome - totalBudget - tithesSetAside;
    const safeToSpend = totalIncome - totalSpent;

    const tithesAllocated = sumBy(tithesAllocations, 'amount');
    const tithesUnallocated = tithesSetAside - tithesAllocated;

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

    const uncategorizedTransactions = transactions.filter((t) => t.categoryId == null);

    const daysLeft = getDaysLeftInMonth(month.year, month.monthIndex);
    const isCurrentMonth = isSameMonth(month, getCurrentMonth());
    const isPastMonth = !isCurrentMonth && new Date(month.year, month.monthIndex + 1, 0) < new Date();
    const tightestEnvelope = envelopeStats[0] ?? null;

    return {
      totalIncome,
      totalSpent,
      totalBudget,
      unassigned,
      safeToSpend,
      envelopeStats,
      uncategorizedTransactions,
      daysLeft,
      isCurrentMonth,
      isPastMonth,
      tightestEnvelope,
      monthIncomeEntries,
      tithesAllocated,
      tithesUnallocated,
    };
  }, [envelopes, transactions, income, month, tithesSetAside, tithesAllocations]);
}
