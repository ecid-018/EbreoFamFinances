import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { deriveMonthFinancials } from '../utils/derive.js';

// Thin wrapper: all the math lives in src/utils/derive.js so it can be
// unit-tested without React. Dependency list is unchanged.
export function useDerivedFinancials() {
  const { state } = useApp();
  const { envelopes, transactions, income, accounts, goals, month } = state;

  return useMemo(
    () => deriveMonthFinancials({ envelopes, transactions, income, accounts, goals, month }),
    [envelopes, transactions, income, accounts, goals, month]
  );
}
