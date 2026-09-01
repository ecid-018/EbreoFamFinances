import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { splitIncomeByCurrency } from '../utils/accounts.js';

function sumBy(items, field) {
  return items.reduce((total, item) => total + item[field], 0);
}

export function useDayFinancials() {
  const { state, viewDay } = useApp();
  const { envelopes, transactions, income, accounts } = state;

  return useMemo(() => {
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
  }, [envelopes, transactions, income, accounts, viewDay]);
}
