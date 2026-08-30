import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { BankIcon, WalletIcon } from '../shared/Icon.jsx';

export function AccountRow({ account }) {
  const { dispatch } = useApp();
  const isEwallet = account.type === 'ewallet';

  return (
    <SwipeToDeleteRow
      className="ios-row-wrap"
      onDelete={() => dispatch({ type: 'account/remove', payload: { id: account.id } })}
    >
      <div className="list-row">
        <div className="list-row__main">
          <span className="list-row__title">{account.name}</span>
          <span className="tag">
            {isEwallet ? <WalletIcon size={13} /> : <BankIcon size={13} />}
            {isEwallet ? 'E-Wallet' : 'Bank'}
          </span>
        </div>
        <span className="list-row__value">{formatPHP(account.balance)}</span>
      </div>
    </SwipeToDeleteRow>
  );
}
