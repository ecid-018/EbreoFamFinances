import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { deriveDayFinancials } from '../utils/derive.js';

// Thin wrapper: see src/utils/derive.js.
export function useDayFinancials() {
  const { state, viewDay } = useApp();
  const { envelopes, transactions, income, accounts } = state;

  return useMemo(
    () => deriveDayFinancials({ envelopes, transactions, income, accounts }, viewDay),
    [envelopes, transactions, income, accounts, viewDay]
  );
}
