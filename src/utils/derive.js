// Pure budget math. Every figure the app shows for a month or a day is
// computed here from plain state; the hooks in src/hooks are thin useMemo
// wrappers around these two functions. Keeping this free of React and of
// hidden clock reads (`today` is a parameter) is what makes it unit-testable
// and is the safety net for later changes to how budgets are resolved.
import { filterByMonth, getDaysLeftInMonth, isSameMonth } from './date.js';
import { groupByOrder } from './group.js';
import { splitIncomeByCurrency } from './accounts.js';
import { RECEIVABLE_TYPE } from './plan/accountTypes.js';

function sumBy(items, field) {
  return items.reduce((total, item) => total + item[field], 0);
}

export function deriveMonthFinancials(
  { envelopes, transactions, income, accounts, goals, month },
  { today = new Date() } = {}
) {
  const monthTransactions = filterByMonth(transactions, month.year, month.monthIndex);
  const monthIncomeEntries = filterByMonth(income, month.year, month.monthIndex, 'budgetMonthKey');

  const { phpTotal: totalIncome, usdTotal: monthUsdIncome } = splitIncomeByCurrency(monthIncomeEntries, accounts);
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

  // Deliberately not month-scoped: an uncategorised expense from any month
  // still needs filing, and the Home "needs attention" card counts them all.
  const uncategorizedTransactions = transactions.filter((t) => t.categoryId == null);

  const daysLeft = getDaysLeftInMonth(month.year, month.monthIndex, today);
  const isCurrentMonth = isSameMonth(month, { year: today.getFullYear(), monthIndex: today.getMonth() });
  const isPastMonth = !isCurrentMonth && new Date(month.year, month.monthIndex + 1, 0) < today;
  const tightestEnvelope = envelopeStats[0] ?? null;
  const overBudgetEnvelopes = envelopeStats.filter((env) => env.isOver);

  // A receivable is money owed TO the household, not money it holds, so it is
  // excluded from the balance totals and reported on its own. Archived
  // accounts still count — hiding a card must not make its money disappear.
  const heldAccounts = accounts.filter((a) => a.type !== RECEIVABLE_TYPE);
  const totalPhpAccountBalance = sumBy(
    heldAccounts.filter((a) => (a.currency ?? 'PHP') === 'PHP'),
    'balance'
  );
  const totalUsdAccountBalance = sumBy(
    heldAccounts.filter((a) => a.currency === 'USD'),
    'balance'
  );
  const totalReceivable = sumBy(
    accounts.filter((a) => a.type === RECEIVABLE_TYPE && (a.currency ?? 'PHP') === 'PHP'),
    'balance'
  );
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
    monthUsdIncome,
    totalPhpAccountBalance,
    totalUsdAccountBalance,
    totalReceivable,
    goalsProgressPct,
    savingsFundedThisMonth,
  };
}

export function deriveDayFinancials({ envelopes, transactions, income, accounts }, viewDay) {
  const dayTransactions = transactions.filter((t) => t.date === viewDay);
  const dayIncomeEntries = income.filter((i) => i.date === viewDay);

  const { phpTotal: dayIncome, usdTotal: dayUsdIncome } = splitIncomeByCurrency(dayIncomeEntries, accounts);
  const daySpent = sumBy(dayTransactions, 'amount');
  const dayNet = dayIncome - daySpent;

  const envelopeSpending = envelopes
    .map((env) => ({
      ...env,
      spent: sumBy(
        dayTransactions.filter((t) => t.categoryId === env.id),
        'amount'
      ),
    }))
    .filter((env) => env.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  const activity = [
    ...dayTransactions.map((t) => ({
      kind: 'expense',
      id: t.id,
      note: t.note,
      amount: t.amount,
      envelope: envelopes.find((env) => env.id === t.categoryId) ?? null,
      account: accounts.find((a) => a.id === t.accountId) ?? null,
    })),
    ...dayIncomeEntries.map((i) => ({
      kind: 'income',
      id: i.id,
      note: i.source,
      amount: i.amount,
      account: accounts.find((a) => a.id === i.accountId) ?? null,
    })),
  ];

  return {
    dayIncome,
    dayUsdIncome,
    daySpent,
    dayNet,
    dayTransactions,
    dayIncomeEntries,
    envelopeSpending,
    activity,
  };
}
