import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useDerivedFinancials } from '../../hooks/useDerivedFinancials.js';
import { useAlerts } from '../../hooks/useAlerts.js';
import { SEVERITY } from '../../utils/plan/alerts.js';
import { WarningIcon, ChevronRightIcon } from '../shared/Icon.jsx';

// How many to show before collapsing the rest. A bad month can produce a lot
// of these, and a card that fills the screen stops being read.
const VISIBLE_LIMIT = 4;

function AlertRow({ alert, onOpen, onDismiss }) {
  return (
    <div className={`alert-item alert-item--${alert.severity}`}>
      <button type="button" className="alert-row alert-item__main" onClick={onOpen}>
        <WarningIcon size={20} className="alert-row__icon" />
        <div className="list-row__main">
          <span className="list-row__title alert-item__title">{alert.title}</span>
          <span className="list-row__meta">{alert.detail}</span>
        </div>
      </button>
      <button
        type="button"
        className="alert-item__dismiss"
        aria-label={`Dismiss: ${alert.title}`}
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}

export function NeedsAttentionCard() {
  const { setActiveTab, dismissAlert } = useApp();
  const { uncategorizedTransactions } = useDerivedFinancials();
  const alerts = useAlerts();
  const [showAll, setShowAll] = useState(false);

  if (alerts.length === 0 && uncategorizedTransactions.length === 0) return null;

  const visible = showAll ? alerts : alerts.slice(0, VISIBLE_LIMIT);
  const hidden = alerts.length - visible.length;
  const worst = alerts.some((a) => a.severity === SEVERITY.ALERT) ? 'alert' : 'warning';

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Needs Attention</span>
        {alerts.length > 0 && (
          <span className={`plan-badge plan-badge--${worst === 'alert' ? 'bad' : 'behind'}`}>
            {alerts.length}
          </span>
        )}
      </div>
      <div className="ios-card">
        {visible.map((alert) => (
          <AlertRow
            key={alert.id}
            alert={alert}
            onOpen={() => alert.tab && setActiveTab(alert.tab)}
            onDismiss={() => dismissAlert(alert.id)}
          />
        ))}

        {hidden > 0 && (
          <button type="button" className="ios-row-wrap list-row-plain" onClick={() => setShowAll(true)}>
            Show {hidden} more
          </button>
        )}

        {/* Not an alert: nothing is wrong, there is simply filing to do. It
            has no severity, is not dismissible, and outlives the month. */}
        {uncategorizedTransactions.length > 0 && (
          <button
            type="button"
            className="ios-row-wrap alert-row"
            onClick={() => setActiveTab('transactions')}
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
