import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatByCurrency } from '../../utils/currency.js';
import { getCardStyle } from '../../utils/cardStyle.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';
import { Avatar } from '../shared/Avatar.jsx';
import { ChipIcon, ContactlessIcon } from '../shared/Icon.jsx';

const TYPE_LABELS = { bank: 'Bank', ewallet: 'E-Wallet', cash: 'Cash' };

export function AccountCard({ account }) {
  const { state, dispatch, openModal } = useApp();
  const { session } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isOwner = account.ownerId === session?.user?.id;
  const ownerProfile = state.profiles.find((p) => p.id === account.ownerId);
  const style = getCardStyle(account);

  const cardBody = (
    <div
      className="account-card"
      style={{
        background: `linear-gradient(135deg, ${style.gradient[0]}, ${style.gradient[1]})`,
        color: style.textColor,
      }}
    >
      {style.accent === 'diagonal' && <div className="account-card__accent account-card__accent--diagonal" />}
      {style.accent === 'dots' && <div className="account-card__accent account-card__accent--dots" />}
      {style.accent === 'stripe' && <div className="account-card__accent account-card__accent--stripe" />}

      <div className="account-card__top">
        <ChipIcon size={26} />
        <ContactlessIcon size={18} />
        <Avatar profile={ownerProfile} size={24} className="account-card__avatar" />
      </div>

      <div className="account-card__bottom">
        <div className="account-card__name-row">
          <span className="account-card__name">{account.name}</span>
          {account.currency === 'USD' && <span className="account-card__tag">USD</span>}
        </div>
        <span className="account-card__balance">{formatByCurrency(account.balance, account.currency)}</span>
        <span className="account-card__type" style={style.tagColor ? { color: style.tagColor } : undefined}>
          {TYPE_LABELS[account.type] ?? 'Account'}
        </span>
      </div>
    </div>
  );

  if (!isOwner) {
    return <div className="account-card-wrap">{cardBody}</div>;
  }

  return (
    <div className="account-card-wrap">
      <SwipeToDeleteRow
        className="account-card-swipe"
        onDelete={() => setConfirmOpen(true)}
        onTap={() => openModal('accountForm', { mode: 'edit', account })}
      >
        {cardBody}
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
    </div>
  );
}
