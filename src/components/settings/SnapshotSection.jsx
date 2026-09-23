import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useUsdToPhpRate } from '../../hooks/useUsdToPhpRate.js';
import { getCurrentMonth, getMonthKey } from '../../utils/date.js';
import {
  getLatestSnapshot,
  formatMonthKey,
  getMonthsNeedingSnapshot,
  getEarliestActivityMonth,
} from '../../utils/plan/snapshots.js';

export function SnapshotSection() {
  const { state, dispatch, refetchAll } = useApp();
  const hasUsd = state.accounts.some((a) => a.currency === 'USD');
  const { rate } = useUsdToPhpRate(hasUsd);
  const [busy, setBusy] = useState(false);

  const latest = getLatestSnapshot(state.monthSnapshots);
  // Bounded by when the household's records actually start, so this never
  // claims a year of lost months on an app that is two months old.
  const earliest = getEarliestActivityMonth(state);
  const missing = getMonthsNeedingSnapshot(new Date(), state.monthSnapshots, earliest);
  const current = getCurrentMonth();
  const currentKey = getMonthKey(current.year, current.monthIndex);

  async function takeSnapshot(monthKey) {
    setBusy(true);
    await dispatch({ type: 'snapshot/take', payload: { monthKey, usdPhpRate: rate } });
    await refetchAll();
    setBusy(false);
  }

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Net worth snapshots</span>
      </div>

      <div className="ios-card">
        <button
          type="button"
          className="ios-row-wrap list-row-plain"
          disabled={busy}
          onClick={() => takeSnapshot(currentKey)}
        >
          <span className="list-row__title">{busy ? 'Recording…' : 'Snapshot now'}</span>
          <span className="list-row__subtitle">
            Records what every account holds right now, filed under {formatMonthKey(currentKey)}.
          </span>
        </button>
      </div>

      <div className="ios-card">
        <div className="ios-row-wrap">
          <span className="list-row__title">Last recorded</span>
          <span className="list-row__subtitle">
            {latest ? `${formatMonthKey(latest.monthKey)}, taken ${latest.takenOn}` : 'No snapshots yet'}
          </span>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="ios-card">
          <div className="ios-row-wrap">
            <span className="list-row__title">{missing.length} earlier month{missing.length === 1 ? '' : 's'} unrecorded</span>
            <span className="list-row__subtitle">
              {/* Deliberately not offered as a button. Recording them now would
                  file today's balances under a past month and invent a position
                  the household never held. */}
              These cannot be filled in accurately: balances are stored as they are today, not
              worked out from history, so a past month can only be recorded while it is still the
              present. They are listed so the gap is visible, not to be backfilled.
            </span>
          </div>
        </div>
      )}

      <p className="prefill-note" style={{ padding: '0 16px' }}>
        The month that just ended is recorded automatically the first time either of you opens the
        app in a new month.
      </p>
    </div>
  );
}
