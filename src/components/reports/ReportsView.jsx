import { useApp } from '../../context/AppContext.jsx';
import { useReports } from '../../hooks/useReports.js';
import { formatPHP, formatUSD } from '../../utils/currency.js';
import { formatMonthShort } from '../../utils/plan/reports.js';
import { formatProjectedMonth } from '../../utils/plan/simulate.js';
import { MonthColumns } from './MonthColumns.jsx';
import { MonthLine } from './MonthLine.jsx';

// Reports. Read-only throughout: it calls pure functions and never dispatches.
//
// Every chart carries a table of the same figures. That is the accessible path
// and the honest one — a chart is a shape, and the shape is not the number.

function Table({ head, rows }) {
  return (
    <div className="report-scroll">
      <table className="report-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])}>
              {row.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ children }) {
  return (
    <div className="ios-row-wrap list-row">
      <span className="list-row__meta">{children}</span>
    </div>
  );
}

export function ReportsView() {
  const { state } = useApp();
  const r = useReports();
  const latest = r.netWorth[r.netWorth.length - 1] ?? null;

  return (
    <div id="section-reports">
      <div className="ios-group">
        <div className="ios-group__header">
          <span className="ios-group__title">Net worth</span>
        </div>
        <div className="ios-card">
          {r.netWorth.length === 0 ? (
            <Empty>
              Nothing recorded yet. A snapshot is taken on the first open of each new month, and
              months before the first one cannot be reconstructed — account balances are stored,
              not worked out from transactions.
            </Empty>
          ) : (
            <>
              <div className="ios-row-wrap list-row">
                <div className="list-row__main">
                  <span className="report-hero">
                    {formatPHP(r.netWorthPlot.points[r.netWorthPlot.points.length - 1].value)}
                  </span>
                  <span className="list-row__meta">
                    as at {formatProjectedMonth(latest.monthKey)}
                    {r.netWorthChange
                      ? `, ${r.netWorthChange.delta >= 0 ? 'up' : 'down'} ${formatPHP(Math.abs(r.netWorthChange.delta))} since ${formatProjectedMonth(r.netWorthChange.from)}`
                      : ' — one month recorded so far, which is a position rather than a trend'}
                  </span>
                </div>
              </div>
              <MonthLine points={r.netWorthPlot.points} label="Net worth by month" />
              <div className="ios-row-wrap list-row">
                <span className="list-row__meta">
                  The scale starts at the lowest month, not zero, so the changes are visible.
                  {r.netWorthPlot.note ? ` ${r.netWorthPlot.note}` : ''}
                </span>
              </div>
              {/* The Total column is dropped on the pesos-only basis rather
                  than shown alongside: a combined total for some months and a
                  peso total for others, in one column, is the same mixing the
                  chart just stopped doing. */}
              <Table
                head={
                  r.netWorthPlot.basis === 'combined'
                    ? ['Month', 'Total', 'PHP', 'USD']
                    : ['Month', 'PHP', 'USD']
                }
                rows={r.netWorth
                  .slice()
                  .reverse()
                  .map((s) => [
                    formatProjectedMonth(s.monthKey),
                    ...(r.netWorthPlot.basis === 'combined' ? [formatPHP(s.value)] : []),
                    formatPHP(s.php),
                    s.usd > 0 ? `${formatUSD(s.usd)}${s.rate ? ` @ ${s.rate}` : ' (no rate)'}` : '—',
                  ])}
              />
            </>
          )}
        </div>
      </div>

      {r.netWorthByType.length > 0 && (
        <div className="ios-group">
          <div className="ios-group__header">
            <span className="ios-group__title">Where it sits</span>
          </div>
          <div className="ios-card">
            <div className="chart-multiples">
              {r.netWorthByType.map((s) => (
                <div key={s.key}>
                  <div className="chart-multiple__label">
                    <span>{s.label}</span>
                    <span className="chart-multiple__value">
                      {formatPHP(s.points[s.points.length - 1].value)}
                    </span>
                  </div>
                  <MonthLine points={s.points} label={`${s.label} by month`} compact />
                </div>
              ))}
            </div>
            <div className="ios-row-wrap list-row">
              <span className="list-row__meta">
                One chart each rather than one chart with four colours: this palette cannot
                separate four series legibly, so each carries its own label instead.
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="ios-group">
        <div className="ios-group__header">
          <span className="ios-group__title">Income by month</span>
        </div>
        <div className="ios-card">
          <MonthColumns points={r.incomeByMonth} label="Income by month" />
          {/* Only the kinds that actually turned up. A column of dashes for a
              kind of money this household has never received is noise, and on
              a phone it pushes the real figures off the edge. */}
          <Table
            head={['Month', 'Total', ...r.incomeKindsSeen.map((k) => k.label)]}
            rows={r.incomeByMonth
              .slice()
              .reverse()
              .filter((m) => m.value > 0)
              .map((m) => [
                formatMonthShort(m.monthKey),
                formatPHP(m.value),
                ...r.incomeKindsSeen.map((k) => {
                  const hit = m.byKind.find((b) => b.key === k.key);
                  return hit ? formatPHP(hit.value) : '—';
                }),
              ])}
          />
        </div>
      </div>

      <div className="ios-group">
        <div className="ios-group__header">
          <span className="ios-group__title">Spending by month</span>
        </div>
        <div className="ios-card">
          <MonthColumns points={r.expensesByMonth} label="Spending by month" />
        </div>
      </div>

      <div className="ios-group">
        <div className="ios-group__header">
          <span className="ios-group__title">
            Spending by group, {formatProjectedMonth(r.viewedMonthKey)}
          </span>
        </div>
        <div className="ios-card">
          {r.expensesByGroup.length === 0 ? (
            <Empty>Nothing spent in this month yet. Use the month stepper above to look at another.</Empty>
          ) : (
            <Table
              head={['Group', 'Spent']}
              rows={r.expensesByGroup.map((g) => [g.label, formatPHP(g.value)])}
            />
          )}
        </div>
      </div>

      {r.planProgress.length > 0 && (
        <div className="ios-group">
          <div className="ios-group__header">
            <span className="ios-group__title">Plan progress</span>
          </div>
          <div className="ios-card">
            <div className="chart-multiples">
              {r.planProgress.map((s) => (
                <div key={s.key}>
                  <div className="chart-multiple__label">
                    <span>{s.label}</span>
                    <span className="chart-multiple__value">
                      {formatPHP(s.points[s.points.length - 1].value)}
                    </span>
                  </div>
                  <MonthLine points={s.points} label={`${s.label} by month`} compact />
                </div>
              ))}
            </div>
            {/* Said plainly rather than drawn badly. */}
            <div className="ios-row-wrap list-row">
              <span className="list-row__meta">
                Per-goal history is not here because it is not in the data: a snapshot records one
                figure for every goal together, so “this goal over time” cannot be reconstructed.
                The Goals tab has where each one stands today.
              </span>
            </div>
          </div>
        </div>
      )}

      {state.monthSnapshots.length === 0 && (
        <div className="ios-group">
          <div className="ios-card">
            <Empty>
              Income and spending reach back as far as your records; net worth starts from the
              first snapshot. Budget history goes back further than balance history, and always
              will.
            </Empty>
          </div>
        </div>
      )}
    </div>
  );
}
