import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatByCurrency } from '../../utils/currency.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';
import { Avatar } from '../shared/Avatar.jsx';
import { BankIcon, WalletIcon, CashIcon, ChevronRightIcon } from '../shared/Icon.jsx';

const TYPE_LABELS = { bank: 'Bank', ewallet: 'E-Wallet', cash: 'Cash' };
const TYPE_ICONS = { bank: BankIcon, ewallet: WalletIcon, cash: CashIcon };

export function AccountRow({ account }) {
  const { state, dispatch, openModal } = useApp();
  const { session } = useAuth();
  const TypeIcon = TYPE_ICONS[account.type] ?? BankIcon;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isOwner = account.ownerId === session?.user?.id;
  const ownerProfile = state.profiles.find((p) => p.id === account.ownerId);
  const ownerLabel = isOwner ? 'You' : ownerProfile?.displayName ?? 'Shared';

  const rowContent = (
    <div className="list-row">
      <Avatar profile={ownerProfile ?? { displayName: ownerLabel }} size={28} />
      <div className="list-row__main">
        <span className="list-row__title">{account.name}</span>
        <span className="tag">
          <TypeIcon size={13} />
          {TYPE_LABELS[account.type] ?? 'Account'}
        </span>
        {account.currency === 'USD' && <span className="tag">USD</span>}
        <span className="tag">Owned by {ownerLabel}</span>
      </div>
      <span className="list-row__value">{formatByCurrency(account.balance, account.currency)}</span>
      {isOwner && <ChevronRightIcon size={16} className="list-row__chevron" />}
    </div>
  );

  if (!isOwner) {
    return <div className="ios-row-wrap">{rowContent}</div>;
  }

  return (
    <>
      <SwipeToDeleteRow
        className="ios-row-wrap"
        onDelete={() => setConfirmOpen(true)}
        onTap={() => openModal('accountForm', { mode: 'edit', account })}
      >
        {rowContent}
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
