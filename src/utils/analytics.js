import { isDateInRange } from './date.js';

function sumBy(items, field) {
  return items.reduce((total, item) => total + item[field], 0);
}

export function computePeriodSummary({ envelopes, transactions, income, accounts, goals }, range, period) {
  const periodTransactions = transactions.filter((t) => isDateInRange(t.date, range));
  const periodIncome = income.filter((i) => isDateInRange(i.date, range));

  const totalIncome = sumBy(periodIncome, 'amount');
  const totalExpenses = sumBy(periodTransactions, 'amount');
  const net = totalIncome - totalExpenses;

  const includesEnvelopeTable = period === 'monthly' || period === 'annual';
  const envelopeBreakdown = includesEnvelopeTable
    ? envelopes.map((env) => {
        const spent = sumBy(
          periodTransactions.filter((t) => t.categoryId === env.id),
          'amount'
        );
        const budget = period === 'annual' ? env.monthlyBudget * 12 : env.monthlyBudget;
        return { name: env.name, group: env.group, spent, budget, isOver: spent > budget };
      })
    : null;

  return {
    totalIncome,
    totalExpenses,
    net,
    envelopeBreakdown,
    accounts,
    goals,
  };
}
