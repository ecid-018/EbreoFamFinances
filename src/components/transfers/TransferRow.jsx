import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatByCurrency } from '../../utils/currency.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';
import { ChevronRightIcon } from '../shared/Icon.jsx';

export function TransferRow({ transfer }) {
  const { state, dispatch, openModal } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fromAccount = state.accounts.find((a) => a.id === transfer.fromAccountId);
  const toAccount = state.accounts.find((a) => a.id === transfer.toAccountId);
  const date = new Date(`${transfer.date}T00:00:00`).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });
  const routeLabel = `${fromAccount?.name ?? 'Account'} → ${toAccount?.name ?? 'Account'}`;

  return (
    <>
      <SwipeToDeleteRow
        className="ios-row-wrap"
        onDelete={() => setConfirmOpen(true)}
        onTap={() => openModal('transferMoney', { mode: 'edit', transfer })}
      >
        <div className="list-row">
          <div className="list-row__main">
            <span className="list-row__title">{transfer.note || routeLabel}</span>
            <span className="list-row__meta">{[date, routeLabel].join(' · ')}</span>
          </div>
          <span className="list-row__value">{formatByCurrency(transfer.fromAmount, fromAccount?.currency)}</span>
          <ChevronRightIcon size={16} className="list-row__chevron" />
        </div>
      </SwipeToDeleteRow>
      {confirmOpen && (
        <ConfirmDialog
          title="Delete this transfer?"
          message={
            fromAccount && toAccount
              ? `${formatByCurrency(transfer.fromAmount, fromAccount.currency)} will move back from ${toAccount.name} to ${fromAccount.name}.`
              : undefined
          }
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            dispatch({ type: 'transfer/remove', payload: { id: transfer.id } });
          }}
        />
      )}
    </>
  );
}
