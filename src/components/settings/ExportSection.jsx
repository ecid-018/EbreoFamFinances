import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { SegmentedControl } from '../shared/SegmentedControl.jsx';
import { getPeriodRange, isDateInRange, getMonthName } from '../../utils/date.js';
import { buildLedgerCsv, downloadCsv } from '../../utils/csv.js';
import { computePeriodSummary } from '../../utils/analytics.js';
import { buildFullBackupJson, downloadBackup } from '../../utils/backup.js';

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

function getPeriodLabel(period, viewedMonth) {
  if (period === 'monthly') return `${getMonthName(viewedMonth.year, viewedMonth.monthIndex)} ${viewedMonth.year}`;
  if (period === 'annual') return `${viewedMonth.year}`;
  if (period === 'weekly') return 'This Week';
  return 'Today';
}

export function ExportSection() {
  const { state } = useApp();
  const financials = useDerivedFinancials();
  const [period, setPeriod] = useState('monthly');
  const [showExportText, setShowExportText] = useState(false);

  const range = useMemo(() => getPeriodRange(period, state.month), [period, state.month]);
  const periodLabel = getPeriodLabel(period, state.month);

  const csv = useMemo(
    () => buildLedgerCsv(state.ledger.filter((e) => isDateInRange(e.date, range))),
    [state.ledger, range]
  );

  function handleExportCsv() {
    downloadCsv(`ebreo-family-finances-${period}.csv`, csv);
    setShowExportText(true);
  }

  function handleExportBackup() {
    const json = buildFullBackupJson(state);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBackup(`ebreo-family-finances-backup-${stamp}.json`, json);
  }

  async function handleExportPdf() {
    let summary;
    if (period === 'monthly') {
      summary = {
        totalIncome: financials.totalIncome,
        totalExpenses: financials.totalSpent,
        net: financials.safeToSpend,
        safeToSpend: financials.safeToSpend,
        unassigned: financials.unassigned,
        envelopeBreakdown: financials.envelopeStats.map((env) => ({
          name: env.name,
          group: env.group,
          spent: env.spent,
          budget: env.monthlyBudget,
        })),
        goals: state.goals,
        accounts: state.accounts,
      };
    } else {
      summary = computePeriodSummary(state, range, period);
    }
    // Loaded on demand — jsPDF pulls in heavy dependencies not worth shipping
    // to every page load when most visits never export a PDF.
    const { generateAnalyticsPdf, downloadAnalyticsPdf } = await import('../../utils/pdf.js');
    const doc = generateAnalyticsPdf({ period, periodLabel, summary });
    downloadAnalyticsPdf(`ebreo-family-finances-${period}-analytics.pdf`, doc);
  }

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Export</span>
      </div>
      <div className="ios-card">
        <div className="ios-row-wrap appearance-row">
          <span className="list-row__title">Period</span>
          <SegmentedControl value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
        </div>
      </div>
      <div className="ios-card">
        <button type="button" className="ios-row-wrap list-row-plain" onClick={handleExportCsv}>
          Export {periodLabel} Ledger as CSV
        </button>
        <button type="button" className="ios-row-wrap list-row-plain" onClick={handleExportPdf}>
          Export {periodLabel} Analytics Summary PDF
        </button>
      </div>
      {showExportText && (
        <div className="ios-card ledger-fallback">
          <p className="list-row__meta ledger-fallback__hint">
            If the CSV download didn't start, copy the text below instead.
          </p>
          <textarea className="ledger-fallback__text" readOnly value={csv} onFocus={(e) => e.target.select()} />
        </div>
      )}

      <div className="ios-group__header">
        <span className="ios-group__title">Full Backup</span>
      </div>
      <div className="ios-card ledger-fallback">
        <p className="list-row__meta ledger-fallback__hint">
          A complete copy of everything — every envelope, transaction, income entry,
          account, goal, and ledger record — saved as one file, regardless of the period
          selected above. Keep this somewhere safe.
        </p>
        <button type="button" className="btn-block" onClick={handleExportBackup}>
          Export Full Backup (JSON)
        </button>
      </div>
    </div>
  );
}
