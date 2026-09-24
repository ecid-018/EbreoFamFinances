import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { getDayLabel } from '../../utils/date.js';
import { formatProjectedMonth } from '../../utils/plan/simulate.js';
import { ChevronRightIcon } from '../shared/Icon.jsx';

const PACE_LABEL = {
  ahead: (months) => `${months} mo ahead`,
  behind: (months) => `${months} mo behind`,
  'on-track': () => 'On track',
};

function PaceBadge({ pace }) {
  if (!pace) return null;
  return (
    <span className={`plan-badge plan-badge--${pace.status}`}>{PACE_LABEL[pace.status](pace.monthsOff)}</span>
  );
}

function GoalProgressRow({ row }) {
  return (
    <div className="stack-row">
      <div className="stack-row__top">
        <span className="stack-row__name">
          {row.label}
          {row.isGroup && <span className="list-row__meta">{row.goals.length} accounts</span>}
        </span>
        <span className="list-row__value">
          {formatPHP(row.saved)} / {formatPHP(row.target)}
        </span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar__fill" style={{ width: `${row.pct}%` }} />
      </div>
      <div className="plan-row__footer">
        <PaceBadge pace={row.pace} />
        {row.goals[0]?.targetDate && !row.isGroup && (
          <span className="list-row__meta">Wanted by {getDayLabel(row.goals[0].targetDate)}</span>
        )}
        <span className={`list-row__meta ${row.monthsLate > 0 ? 'plan-meta--late' : ''}`.trim()}>
          {row.projectedMonthKey
            ? `Funded ${formatProjectedMonth(row.projectedMonthKey)}${
                row.monthsLate > 0 ? ` — ${row.monthsLate} mo later than wanted` : ''
              }`
            : 'Not funded at this rate'}
        </span>
      </div>
    </div>
  );
}

export function PlanGoalsSection({ goalRows, sinkingFunds }) {
  const { setActiveTab } = useApp();

  return (
    <>
      <div className="ios-group">
        <div className="ios-group__header">
          <span className="ios-group__title">Goals in priority order</span>
        </div>
        <div className="ios-card">
          {goalRows.length === 0 ? (
            <div className="ios-row-wrap list-row">
              <span className="list-row__meta">Every goal is funded.</span>
            </div>
          ) : (
            goalRows.map((row) => <GoalProgressRow key={row.label} row={row} />)
          )}
          {/* Editing lives on the Goals tab. Repeating it here would be two
              places to change a priority, which is one too many. */}
          <button type="button" className="ios-row-wrap list-row" onClick={() => setActiveTab('goals')}>
            <div className="list-row__main">
              <span className="list-row__title">Edit goals</span>
              <span className="list-row__meta">Priorities, targets and dates</span>
            </div>
            <ChevronRightIcon size={16} className="list-row__chevron" />
          </button>
        </div>
      </div>

      {sinkingFunds.length > 0 && (
        <div className="ios-group">
          <div className="ios-group__header">
            <span className="ios-group__title">Sinking funds</span>
          </div>
          <div className="ios-card">
            {sinkingFunds.map((goal) => (
              <div className="stack-row" key={goal.id}>
                <div className="stack-row__top">
                  <span className="stack-row__name">{goal.name}</span>
                  <span className="list-row__value">
                    {formatPHP(goal.saved)} / {formatPHP(goal.target)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar__fill"
                    style={{ width: `${goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="ios-row-wrap list-row">
              <span className="list-row__meta">
                These go up and down as bills fall due, so they are left out of the goal waterfall and
                of the projections above.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
