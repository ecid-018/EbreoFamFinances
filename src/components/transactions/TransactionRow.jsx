import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';
import { Avatar } from '../shared/Avatar.jsx';
import { ChevronRightIcon } from '../shared/Icon.jsx';

export function TransactionRow({ transaction }) {
  const { state, dispatch, openModal } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const envelope = state.envelopes.find((env) => env.id === transaction.categoryId);
  const account = state.accounts.find((a) => a.id === transaction.accountId);
  const loggedBy = state.profiles.find((p) => p.id === transaction.createdBy);
  const date = new Date(`${transaction.date}T00:00:00`).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });
  const metaParts = [date, envelope?.name, account?.name].filter(Boolean);

  return (
    <>
      <SwipeToDeleteRow
        className="ios-row-wrap"
        onDelete={() => setConfirmOpen(true)}
        onTap={() => openModal('addExpense', { mode: 'edit', transaction })}
      >
        <div className="list-row">
          <Avatar profile={loggedBy} size={28} />
          <div className="list-row__main">
            <span className="list-row__title">{transaction.note || 'Expense'}</span>
            <span className="list-row__meta">{metaParts.join(' · ')}</span>
          </div>
          <span className="list-row__value">{formatPHP(transaction.amount)}</span>
          <ChevronRightIcon size={16} className="list-row__chevron" />
        </div>
      </SwipeToDeleteRow>
      {confirmOpen && (
        <ConfirmDialog
          title="Delete this expense?"
          message={account ? `${formatPHP(transaction.amount)} will be refunded to ${account.name}.` : undefined}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            dispatch({ type: 'transaction/remove', payload: { id: transaction.id } });
          }}
        />
      )}
    </>
  );
}
