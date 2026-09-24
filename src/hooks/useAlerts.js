import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useDerivedFinancials } from './useDerivedFinancials.js';
import { buildGuardRails } from '../utils/plan/guardRails.js';
import { buildAlerts, filterDismissed } from '../utils/plan/alerts.js';

// The deterministic alerts, for the month being viewed. Pure functions only —
// no AI, no network, and nothing here writes. Phase 10's third principle is
// that the app works fully without the AI layer; this is the part that has to
// keep working when it is off or unreachable.
export function useAlerts() {
  const { state, dismissedAlerts } = useApp();
  const { envelopeStats, isCurrentMonth, monthMode } = useDerivedFinancials();
  const {
    accounts, goals, planSettings, transactions, transfers, income,
    paydays, paydayAllocations, month,
  } = state;

  return useMemo(() => {
    const today = new Date();
    const guardRails = buildGuardRails({
      accounts,
      planSettings,
      transfers,
      paydays,
      paydayAllocations,
      year: today.getFullYear(),
    });
    const alerts = buildAlerts(
      {
        envelopeStats, month, isCurrentMonth, monthMode, guardRails,
        accounts, goals, planSettings, transactions, transfers, income,
        paydays, paydayAllocations,
      },
      { today }
    );
    return filterDismissed(alerts, dismissedAlerts);
  }, [
    envelopeStats, month, isCurrentMonth, monthMode, accounts, goals, planSettings,
    transactions, transfers, income, paydays, paydayAllocations, dismissedAlerts,
  ]);
}
