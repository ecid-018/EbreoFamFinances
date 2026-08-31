import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';
import { BankIcon, WalletIcon, CashIcon, ChevronRightIcon } from '../shared/Icon.jsx';

const TYPE_LABELS = { bank: 'Bank', ewallet: 'E-Wallet', cash: 'Cash' };
const TYPE_ICONS = { bank: BankIcon, ewallet: WalletIcon, cash: CashIcon };

export function AccountRow({ account }) {
  const { dispatch, openModal } = useApp();
  const TypeIcon = TYPE_ICONS[account.type] ?? BankIcon;
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <SwipeToDeleteRow
        className="ios-row-wrap"
        onDelete={() => setConfirmOpen(true)}
        onTap={() => openModal('accountForm', { mode: 'edit', account })}
      >
        <div className="list-row">
          <div className="list-row__main">
            <span className="list-row__title">{account.name}</span>
            <span className="tag">
              <TypeIcon size={13} />
              {TYPE_LABELS[account.type] ?? 'Account'}
            </span>
          </div>
          <span className="list-row__value">{formatPHP(account.balance)}</span>
          <ChevronRightIcon size={16} className="list-row__chevron" />
        </div>
      </SwipeToDeleteRow>
      {confirmOpen && (
        <ConfirmDialog
          title={`Delete "${account.name}"?`}
          message="Any transactions or income tagged to it will be untagged, not deleted."
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            dispatch({ type: 'account/remove', payload: { id: account.id } });
          }}
        />
      )}
    </>
  );
}
