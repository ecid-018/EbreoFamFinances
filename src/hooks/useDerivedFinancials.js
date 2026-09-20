import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { deriveMonthFinancials } from '../utils/derive.js';

// Thin wrapper: all the math lives in src/utils/derive.js so it can be
// unit-tested without React. envelopeBudgets joins the inputs so every
// consumer sees the budget for the month being viewed, not a single global one.
export function useDerivedFinancials() {
  const { state } = useApp();
  const { envelopes, transactions, income, accounts, goals, month, envelopeBudgets, monthModes, planSettings } = state;

  return useMemo(
    () => deriveMonthFinancials({ envelopes, transactions, income, accounts, goals, month, envelopeBudgets, monthModes, planSettings }),
    [envelopes, transactions, income, accounts, goals, month, envelopeBudgets, monthModes, planSettings]
  );
}
