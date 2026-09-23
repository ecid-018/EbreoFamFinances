import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useUsdToPhpRate } from './useUsdToPhpRate.js';
import { getMonthToAutoSnapshot } from '../utils/plan/snapshots.js';

// Records the month that just ended, the first time anyone opens the app in a
// new one. Balances are stored rather than derived, so a closed month cannot be
// reconstructed afterwards — if this does not run, that month is gone.
//
// Only the month that just ended is taken automatically. Older gaps are left
// for the owner to fill deliberately from Settings: writing them now would
// stamp today's balances with a historical month key and quietly invent a
// position the household never held.
export function useMonthSnapshot() {
  const { state, dispatch, loading } = useApp();
  const hasUsd = state.accounts.some((a) => a.currency === 'USD');
  const { rate } = useUsdToPhpRate(hasUsd);
  // Once per session. The RPC upserts, so a repeat would be harmless rather
  // than wrong, but there is no reason to send it.
  const attempted = useRef(false);

  useEffect(() => {
    if (loading || attempted.current) return;
    // Wait for the real data. Before it lands, monthSnapshots is [] and every
    // month would look unrecorded.
    if (!state.accounts.length) return;

    const monthKey = getMonthToAutoSnapshot(new Date(), state.monthSnapshots);
    if (!monthKey) return;

    attempted.current = true;
    dispatch({ type: 'snapshot/take', payload: { monthKey, usdPhpRate: rate } });
  }, [loading, state.accounts.length, state.monthSnapshots, rate, dispatch]);
}
