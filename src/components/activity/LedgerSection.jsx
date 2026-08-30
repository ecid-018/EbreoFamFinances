import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { getMonthKeyFromDateStr, getMonthKey } from '../../utils/date.js';
import { buildLedgerCsv, downloadCsv } from '../../utils/csv.js';
import { LedgerRow } from './LedgerRow.jsx';

export function LedgerSection() {
  const { state } = useApp();
  const [showExportText, setShowExportText] = useState(false);

  const sortedLedger = useMemo(
    () => [...state.ledger].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [state.ledger]
  );

  const thisMonthKey = getMonthKey(state.month.year, state.month.monthIndex);
  const thisMonthCount = state.ledger.filter((e) => getMonthKeyFromDateStr(e.date) === thisMonthKey).length;

  const csv = useMemo(() => buildLedgerCsv(sortedLedger), [sortedLedger]);

  function handleExport() {
    downloadCsv('ebreo-family-finances-ledger.csv', csv);
    setShowExportText(true);
  }

  return (
    <div className="ios-group" id="section-ledger">
      <div className="ios-group__header">
        <span className="ios-group__title">Ledger &amp; Reports</span>
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
        <button type="button" className="ios-row-wrap list-row-plain" onClick={handleExport}>
          Export Full Ledger as CSV
        </button>
      </div>

      {showExportText && (
        <div className="ios-card ledger-fallback">
          <p className="list-row__meta ledger-fallback__hint">
            If the download didn't start, copy the text below instead.
          </p>
          <textarea className="ledger-fallback__text" readOnly value={csv} onFocus={(e) => e.target.select()} />
        </div>
      )}

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
