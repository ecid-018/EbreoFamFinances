import { useApp } from '../../context/AppContext.jsx';
import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { WarningIcon, ChevronRightIcon } from '../shared/Icon.jsx';

export function NeedsAttentionCard() {
  const { setActiveTab } = useApp();
  const { overBudgetEnvelopes, uncategorizedTransactions } = useDerivedFinancials();

  if (overBudgetEnvelopes.length === 0 && uncategorizedTransactions.length === 0) return null;

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Needs Attention</span>
      </div>
      <div className="ios-card">
        {overBudgetEnvelopes.length > 0 && (
          <button
            type="button"
            className="ios-row-wrap alert-row"
            onClick={() => setActiveTab('budget')}
          >
            <WarningIcon size={20} className="alert-row__icon" />
            <div className="list-row__main">
              <span className="list-row__title">
                {overBudgetEnvelopes.length} envelope{overBudgetEnvelopes.length === 1 ? '' : 's'} over budget
              </span>
              <span className="list-row__meta">
                {overBudgetEnvelopes.map((env) => env.name).join(', ')}
              </span>
            </div>
            <ChevronRightIcon size={16} className="list-row__chevron" />
          </button>
        )}
        {uncategorizedTransactions.length > 0 && (
          <button
            type="button"
            className="ios-row-wrap alert-row"
            onClick={() => setActiveTab('activity')}
          >
            <WarningIcon size={20} className="alert-row__icon" />
            <div className="list-row__main">
              <span className="list-row__title">
                {uncategorizedTransactions.length} transaction{uncategorizedTransactions.length === 1 ? '' : 's'} need
                a category
              </span>
            </div>
            <ChevronRightIcon size={16} className="list-row__chevron" />
          </button>
        )}
      </div>
    </div>
  );
}
