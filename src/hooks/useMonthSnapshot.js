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
  // Which month this session recorded, so the rate can be filled in afterwards.
  const recorded = useRef(null);
  const ratePatched = useRef(false);

  useEffect(() => {
    if (loading || attempted.current) return;
    // Wait for the real data. Before it lands, monthSnapshots is [] and every
    // month would look unrecorded.
    if (!state.accounts.length) return;

    const monthKey = getMonthToAutoSnapshot(new Date(), state.monthSnapshots);
    if (!monthKey) return;

    attempted.current = true;
    recorded.current = monthKey;
    // Sent with whatever rate is in hand, which is often none: the rate comes
    // from a network fetch that has usually not resolved this early, and the
    // snapshot matters more than the rate. The effect below fills it in.
    dispatch({ type: 'snapshot/take', payload: { monthKey, usdPhpRate: rate } });
  }, [loading, state.accounts.length, state.monthSnapshots, rate, dispatch]);

  // The rate arrives after the snapshot, every time the cache is cold or more
  // than 12h old -- which is exactly the state on the first open of a new
  // month. The first real monthly snapshot went in with a null rate and a USD
  // balance the reports could not convert.
  //
  // So when it does arrive, send it. take_month_snapshot upserts and coalesces
  // the rate (`coalesce(excluded.usd_php_rate, month_snapshots.usd_php_rate)`),
  // so this fills the gap and can never blank a rate already stored.
  useEffect(() => {
    if (ratePatched.current || rate == null || !recorded.current) return;
    ratePatched.current = true;
    dispatch({ type: 'snapshot/take', payload: { monthKey: recorded.current, usdPhpRate: rate } });
  }, [rate, dispatch]);
}
