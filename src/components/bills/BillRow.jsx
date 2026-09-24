import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { getDayLabel } from '../../utils/date.js';
import {
  getDaysUntilDue,
  getPeriodLabel,
  getKind,
  getKindMeta,
  isOverdueIncoming,
  SCHEDULE_KINDS,
} from '../../utils/plan/bills.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';

// How the due date reads. "In 9 days" is easier to act on than a date, but the
// date itself still matters for anything further out.
function dueLabel(item) {
  // An ended item is not overdue — it stopped. Reading it as a debt would be
  // wrong every time.
  if (!item.isActive) return 'Ended';
  if (!item.nextDue) return 'No date set';
  const days = getDaysUntilDue(item);
  // An expected payment that is late has not necessarily failed to arrive —
  // nobody may have ticked it off yet. The wording says what is actually known.
  if (days < 0 && getKind(item) === SCHEDULE_KINDS.INCOMING) {
    return `Not logged, ${-days} day${days === -1 ? '' : 's'} on`;
  }
  if (days < 0) return `Overdue by ${-days} day${days === -1 ? '' : 's'}`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 14) return `Due in ${days} days`;
  return `Due ${getDayLabel(item.nextDue)}`;
}

export function BillRow({ bill, showAction = true }) {
  const { dispatch, openModal } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const kind = getKind(bill);
  const meta = getKindMeta(kind);
  const days = getDaysUntilDue(bill);
  const late = bill.isActive && days != null && days < 0;
  // A late expected payment is a nudge, not a breach: the money may well have
  // arrived and simply not been ticked off.
  const urgent = late && (kind !== SCHEDULE_KINDS.INCOMING || isOverdueIncoming(bill));
  const soon = bill.isActive && days != null && days >= 0 && days <= 7;

  function handleAction(e) {
    // The row itself opens the edit form; acting on it is a different intent
    // and must not also trigger that.
    e.stopPropagation();
    if (kind === SCHEDULE_KINDS.BILL) return openModal('addExpense', { bill });
    if (kind === SCHEDULE_KINDS.INCOMING) return openModal('incomeForm', { mode: 'add', scheduleItem: bill });
    dispatch({ type: 'bill/complete', payload: { id: bill.id } });
  }

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
            {bill.amount > 0 && <span className="stack-row__amount">{formatPHP(bill.amount)}</span>}
          </div>
          <div className="plan-row__footer">
            <span className={`plan-badge ${urgent ? 'plan-badge--bad' : soon || late ? 'plan-badge--behind' : ''}`.trim()}>
              {dueLabel(bill)}
            </span>
            <span className="list-row__meta">{getPeriodLabel(bill.period)}</span>
            {bill.notes && <span className="list-row__meta">{bill.notes}</span>}
            {showAction && bill.isActive && (
              <button type="button" className="bill-row__pay" onClick={handleAction}>
                {meta.action}
              </button>
            )}
          </div>
        </div>
      </SwipeToDeleteRow>
      {confirmOpen && (
        <ConfirmDialog
          title={`Delete "${bill.name}"?`}
          message="Anything already logged against it is kept; it just stops pointing at a schedule item. To stop reminders without losing the record, edit it and turn off 'Still active' instead."
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
