import { useApp } from '../../context/AppContext.jsx';
import { usePlanFinancials } from '../../hooks/usePlanFinancials.js';
import { formatPHP } from '../../utils/currency.js';
import { formatProjectedMonth } from '../../utils/plan/simulate.js';
import { ChevronRightIcon } from '../shared/Icon.jsx';
import { PlanGoalsSection } from './PlanGoalsSection.jsx';
import { PlanGuardRailsSection } from './PlanGuardRailsSection.jsx';
import { PlanAccountsSection } from './PlanAccountsSection.jsx';

// The Plan view. Read-only: every figure here is derived, and the two places
// that can change any of it — the Goals tab and Settings — are linked to
// rather than reproduced.

function ashoreLine(ashore) {
  if (ashore.isHere) return `Ashore in ${ashore.targetYear} — that is now`;
  const years = ashore.years > 0 ? `${ashore.years} yr` : '';
  const months = ashore.months > 0 ? `${ashore.months} mo` : '';
  return `Ashore in ${ashore.targetYear} — ${[years, months].filter(Boolean).join(' ')} away`;
}

function SetUpPrompt() {
  const { openModal } = useApp();
  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Plan</span>
      </div>
      <div className="ios-card">
        <button type="button" className="ios-row-wrap list-row" onClick={() => openModal('settings')}>
          <div className="list-row__main">
            <span className="list-row__title">Your plan isn&rsquo;t set up yet</span>
            <span className="list-row__meta">
              Enter your pay, how it splits and your targets in Settings, and this screen fills in.
            </span>
          </div>
          <ChevronRightIcon size={16} className="list-row__chevron" />
        </button>
      </div>
    </div>
  );
}

export function PlanView() {
  const { openModal } = useApp();
  const plan = usePlanFinancials();

  // Without pay and a split there is nothing true to say, and a screen of
  // zeroes would read as decisions the household never made.
  if (!plan.configured) return <SetUpPrompt />;

  const { simulation, split, ashore } = plan;

  return (
    <div id="section-plan">
      <div className="ios-group">
        <div className="ios-group__header">
          <span className="ios-group__title">Where the plan stands</span>
        </div>
        <div className="ios-card">
          {ashore && (
            <div className="ios-row-wrap list-row">
              <div className="list-row__main">
                <span className="list-row__title">{ashoreLine(ashore)}</span>
              </div>
            </div>
          )}

          <div className="ios-row-wrap list-row">
            <div className="list-row__main">
              <span className="list-row__title">{formatPHP(simulation.monthlyGoalMoney)} a month to goals</span>
              {split.presignoffApplied && (
                <span className="list-row__meta">
                  Includes {formatPHP(split.presignoffFreed)} held back from the vacation line until the
                  reserve is funded
                  {simulation.presignoffLapsesMonthKey
                    ? ` — that lapses ${formatProjectedMonth(simulation.presignoffLapsesMonthKey)}`
                    : ''}
                  .
                </span>
              )}
            </div>
          </div>

          <div className="ios-row-wrap list-row">
            <div className="list-row__main">
              <span className="list-row__title">
                {simulation.allFundedMonthKey
                  ? `Every goal funded by ${formatProjectedMonth(simulation.allFundedMonthKey)}`
                  : `${simulation.unfinished.length} goal${simulation.unfinished.length === 1 ? '' : 's'} not funded at this rate`}
              </span>
              <span className="list-row__meta">
                Projected by filling goals in priority order at today&rsquo;s figures. It moves whenever
                they do.
              </span>
            </div>
          </div>

          <button type="button" className="ios-row-wrap list-row" onClick={() => openModal('settings')}>
            <div className="list-row__main">
              <span className="list-row__title">
                {plan.splitBalanced
                  ? 'The split adds up to hub pay'
                  : plan.splitRemainder > 0
                    ? `${formatPHP(plan.splitRemainder)} of hub pay is unassigned`
                    : `${formatPHP(-plan.splitRemainder)} more is split than hub pay`}
              </span>
              <span className="list-row__meta">Pay, splits and targets</span>
            </div>
            <ChevronRightIcon size={16} className="list-row__chevron" />
          </button>
        </div>
      </div>

      <PlanGoalsSection goalRows={plan.goalRows} sinkingFunds={plan.sinkingFunds} />
      <PlanGuardRailsSection guardRails={plan.guardRails} />
      <PlanAccountsSection roles={plan.roles} reconciliation={plan.reconciliation} />
    </div>
  );
}
