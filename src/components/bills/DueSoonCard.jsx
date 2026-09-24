import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { getDueSoon } from '../../utils/plan/bills.js';
import { ChevronRightIcon } from '../shared/Icon.jsx';

// The next two weeks of bills. On Home for phones, and in the overview column
// from 1024px, where it sits beside every tab.
export function DueSoonCard({ withinDays = 14 }) {
  const { state, setActiveTab, openModal } = useApp();
  const due = getDueSoon(state.bills, new Date(), withinDays);

  if (due.length === 0) return null;

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Due soon</span>
        <button type="button" className="ios-group__sort-btn" onClick={() => setActiveTab('bills')}>
          All bills
          <ChevronRightIcon size={14} />
        </button>
      </div>
      <div className="ios-card">
        {due.map((bill) => (
          <button
            key={bill.id}
            type="button"
            className="ios-row-wrap list-row"
            onClick={() => openModal('addExpense', { bill })}
          >
            <div className="list-row__main">
              <span className="list-row__title">{bill.name}</span>
              <span className={`list-row__meta ${bill.daysUntilDue < 0 ? 'plan-meta--late' : ''}`.trim()}>
                {bill.daysUntilDue < 0
                  ? `Overdue by ${-bill.daysUntilDue} day${bill.daysUntilDue === -1 ? '' : 's'}`
                  : bill.daysUntilDue === 0
                    ? 'Due today'
                    : `In ${bill.daysUntilDue} day${bill.daysUntilDue === 1 ? '' : 's'}`}
              </span>
            </div>
            <span className="list-row__value">{formatPHP(bill.amount)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
