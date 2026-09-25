import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { getMonthKey } from '../utils/date.js';
import {
  getMonthWindow,
  getNetWorthSeries,
  getNetWorthByType,
  getNetWorthChange,
  getNetWorthPlot,
  getIncomeByMonth,
  INCOME_KIND_SERIES,
  getExpensesByMonth,
  getExpensesByGroup,
  getPlanProgressSeries,
  trimLeadingEmpty,
} from '../utils/plan/reports.js';

// Everything the Reports screen shows, in one memo over state. Read-only:
// pure functions in, figures out, nothing written.
export function useReports() {
  const { state } = useApp();
  const { snapshots, income, transactions, envelopes, month } = {
    snapshots: state.monthSnapshots,
    income: state.income,
    transactions: state.transactions,
    envelopes: state.envelopes,
    month: state.month,
  };

  return useMemo(() => {
    const months = getMonthWindow(new Date(), 12);
    const netWorth = getNetWorthSeries(snapshots);
    const netWorthPlot = getNetWorthPlot(netWorth);
    const viewedMonthKey = getMonthKey(month.year, month.monthIndex);

    const incomeByMonth = trimLeadingEmpty(getIncomeByMonth(income, months));

    return {
      months,
      netWorth,
      netWorthPlot,
      // The change has to be read off the same basis the chart plots, or the
      // caption and the line disagree.
      netWorthChange: getNetWorthChange(netWorthPlot.points),
      netWorthByType: getNetWorthByType(snapshots),
      planProgress: getPlanProgressSeries(snapshots),
      incomeByMonth,
      incomeKindsSeen: INCOME_KIND_SERIES.filter((k) =>
        incomeByMonth.some((m) => m.byKind.some((b) => b.key === k.key && b.value > 0))
      ),
      expensesByMonth: trimLeadingEmpty(getExpensesByMonth(transactions, months)),
      expensesByGroup: getExpensesByGroup(envelopes, transactions, viewedMonthKey),
      viewedMonthKey,
    };
  }, [snapshots, income, transactions, envelopes, month]);
}
