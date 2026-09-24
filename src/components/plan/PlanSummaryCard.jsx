import { useApp } from '../../context/AppContext.jsx';
import { usePlanFinancials } from '../../hooks/usePlanFinancials.js';
import { formatPHP } from '../../utils/currency.js';
import { formatProjectedMonth } from '../../utils/plan/simulate.js';
import { ChevronRightIcon, WarningIcon } from '../shared/Icon.jsx';

// The compact Plan summary for the overview column (>= 1024px). It sits
// beside every tab, so it says only what is worth interrupting another screen
// for: the money going to goals, when they finish, and any breached rail.
export function PlanSummaryCard() {
  const { setActiveTab } = useApp();
  const plan = usePlanFinancials();

  if (!plan.configured) return null;

  const breached = plan.guardRails.filter((rail) => rail.isBreached);

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Plan</span>
      </div>
      <div className="ios-card">
        <button type="button" className="ios-row-wrap list-row" onClick={() => setActiveTab('plan')}>
          <div className="list-row__main">
            <span className="list-row__title">{formatPHP(plan.simulation.monthlyGoalMoney)} a month to goals</span>
            <span className="list-row__meta">
              {plan.simulation.allFundedMonthKey
                ? `All funded by ${formatProjectedMonth(plan.simulation.allFundedMonthKey)}`
                : `${plan.simulation.unfinished.length} not funded at this rate`}
            </span>
          </div>
          <ChevronRightIcon size={16} className="list-row__chevron" />
        </button>
        {breached.map((rail) => (
          <button
            type="button"
            className="ios-row-wrap alert-row"
            key={rail.key}
            onClick={() => setActiveTab('plan')}
          >
            <WarningIcon size={20} className="alert-row__icon" />
            <div className="list-row__main">
              <span className="list-row__title">
                {rail.label} {rail.direction === 'min' ? 'below target' : 'over the cap'}
              </span>
              <span className="list-row__meta">
                {formatPHP(rail.current)} of {formatPHP(rail.target)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
