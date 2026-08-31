import { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { getMonthKeyFromDateStr, getMonthKey } from '../../utils/date.js';
import { LedgerRow } from './LedgerRow.jsx';

export function LedgerSection() {
  const { state } = useApp();

  const sortedLedger = useMemo(
    () => [...state.ledger].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [state.ledger]
  );

  const thisMonthKey = getMonthKey(state.month.year, state.month.monthIndex);
  const thisMonthCount = state.ledger.filter((e) => getMonthKeyFromDateStr(e.date) === thisMonthKey).length;

  return (
    <div className="ios-group" id="section-ledger">
      <div className="ios-group__header">
        <span className="ios-group__title">Ledger</span>
      </div>
      <div className="ios-card stats-card">
        <div className="stats__col">
          <div className="stats__label">Total Entries</div>
          <div className="stats__value">{state.ledger.length}</div>
        </div>
        <div className="stats__col">
          <div className="stats__label">This Month</div>
          <div className="stats__value">{thisMonthCount}</div>
        </div>
      </div>

      <div className="ios-card">
        {sortedLedger.length === 0 ? (
          <div className="ios-row-wrap list-row">
            <span className="list-row__meta">No activity logged yet.</span>
          </div>
        ) : (
          sortedLedger.map((entry) => <LedgerRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}
