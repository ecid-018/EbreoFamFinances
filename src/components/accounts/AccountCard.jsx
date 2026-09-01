import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUsdToPhpRate } from '../../hooks/useUsdToPhpRate.js';
import { formatPHPPrecise, formatUSD } from '../../utils/currency.js';
import { getCardStyle } from '../../utils/cardStyle.js';
import { getBrandfetchUrlForAccountName } from '../../utils/brandfetch.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';
import { Avatar } from '../shared/Avatar.jsx';
import { ChipIcon, ContactlessIcon } from '../shared/Icon.jsx';

const TYPE_LABELS = { bank: 'Bank', ewallet: 'E-Wallet', cash: 'Cash' };
const PEEK_HEIGHT = 64;

// Cards stack via position: sticky (not a static negative-margin overlap) so
// the deck is actually scrollable — scrolling brings each card to the front
// in turn, and whichever one is on top is the one swipe-to-delete/tap-to-edit
// act on. The name+balance render in the always-visible peek zone so every
// account's balance is readable without scrolling to bring it to the front.
export function AccountCard({ account, index }) {
  const { state, dispatch, openModal } = useApp();
  const { session } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [brandfetchFailed, setBrandfetchFailed] = useState(false);

  const isOwner = account.ownerId === session?.user?.id;
  const ownerProfile = state.profiles.find((p) => p.id === account.ownerId);
  const style = getCardStyle(account);
  const brandfetchUrl = style.logo ? null : getBrandfetchUrlForAccountName(account.name);
  const isUsd = account.currency === 'USD';
  const { rate } = useUsdToPhpRate(isUsd);

  const wrapStyle = {
    top: `calc(var(--navbar-bar-height) + var(--safe-top) + 12px + ${index * PEEK_HEIGHT}px)`,
    zIndex: index + 1,
  };

  // For USD accounts, the card leads with the live PHP-converted value (so
  // every card's headline number is comparable at a glance) and shows the
  // real USD balance as a smaller secondary line. If the rate isn't
  // available, fall back to the raw USD amount rather than guessing a value.
  let primaryValue;
  let secondaryValue = null;
  if (isUsd && rate) {
    primaryValue = formatPHPPrecise(account.balance * rate);
    secondaryValue = formatUSD(account.balance);
  } else if (isUsd) {
    primaryValue = formatUSD(account.balance);
  } else {
    primaryValue = formatPHPPrecise(account.balance);
  }

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
        <div className="account-card__name-col">
          {style.logo ? (
            <img src={style.logo} alt="" className="account-card__logo" />
          ) : brandfetchUrl && !brandfetchFailed ? (
            <img
              src={brandfetchUrl}
              alt=""
              loading="lazy"
              className="account-card__logo account-card__logo--badge"
              onError={() => setBrandfetchFailed(true)}
            />
          ) : null}
          <span className="account-card__name">{account.name}</span>
          {isUsd && <span className="account-card__tag">USD</span>}
        </div>
        <div className="account-card__balance-col">
          <span className="account-card__balance">{primaryValue}</span>
          {secondaryValue && <span className="account-card__balance-secondary">{secondaryValue}</span>}
        </div>
      </div>

      <div className="account-card__bottom">
        <ChipIcon size={26} />
        <ContactlessIcon size={18} />
        <span className="account-card__type" style={style.tagColor ? { color: style.tagColor } : undefined}>
          {TYPE_LABELS[account.type] ?? 'Account'}
        </span>
        <Avatar profile={ownerProfile} size={24} className="account-card__avatar" />
      </div>
    </div>
  );

  if (!isOwner) {
    return (
      <div className="account-card-wrap" style={wrapStyle}>
        {cardBody}
      </div>
    );
  }

  return (
    <div className="account-card-wrap" style={wrapStyle}>
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
