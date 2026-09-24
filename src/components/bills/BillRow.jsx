import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { getDayLabel } from '../../utils/date.js';
import { getDaysUntilDue, getPeriodLabel } from '../../utils/plan/bills.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';

// How the due date reads. "In 9 days" is easier to act on than a date, but the
// date itself still matters for anything further out.
function dueLabel(bill) {
  // An ended bill is not overdue — it stopped. Its last due date is history,
  // and reading it as a debt would be wrong every time.
  if (!bill.isActive) return 'Ended';
  if (!bill.nextDue) return 'No date set';
  const days = getDaysUntilDue(bill);
  if (days < 0) return `Overdue by ${-days} day${days === -1 ? '' : 's'}`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 14) return `Due in ${days} days`;
  return `Due ${getDayLabel(bill.nextDue)}`;
}

export function BillRow({ bill, showPay = true }) {
  const { dispatch, openModal } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const days = getDaysUntilDue(bill);
  const urgent = bill.isActive && days != null && days < 0;
  const soon = bill.isActive && days != null && days >= 0 && days <= 7;

  return (
    <>
      <SwipeToDeleteRow
        className="ios-row-wrap"
        onDelete={() => setConfirmOpen(true)}
        onTap={() => openModal('billForm', { mode: 'edit', bill })}
      >
        <div className="stack-row">
          <div className="stack-row__top">
            <span className="stack-row__name">{bill.name}</span>
            <span className="stack-row__amount">{formatPHP(bill.amount)}</span>
          </div>
          <div className="plan-row__footer">
            <span
              className={`plan-badge ${urgent ? 'plan-badge--bad' : soon ? 'plan-badge--behind' : ''}`.trim()}
            >
              {dueLabel(bill)}
            </span>
            <span className="list-row__meta">{getPeriodLabel(bill.period)}</span>
            {showPay && bill.isActive && (
              <button
                type="button"
                className="bill-row__pay"
                onClick={(e) => {
                  // The row itself opens the edit form; paying is a different
                  // intent and must not also trigger it.
                  e.stopPropagation();
                  openModal('addExpense', { bill });
                }}
              >
                Pay
              </button>
            )}
          </div>
        </div>
      </SwipeToDeleteRow>
      {confirmOpen && (
        <ConfirmDialog
          title={`Delete "${bill.name}"?`}
          message="Expenses already logged against it are kept; they just stop pointing at a bill. To stop reminders without losing the record, edit it and turn off 'Still active' instead."
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            dispatch({ type: 'bill/remove', payload: { id: bill.id } });
          }}
        />
      )}
    </>
  );
}
