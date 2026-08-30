import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';

export function AccountRow({ account }) {
  const { dispatch } = useApp();

  return (
    <div className="list-row">
      <div className="list-row__main">
        <span className="list-row__title">{account.name}</span>
        <span className={`tag ${account.type === 'ewallet' ? 'tag--ewallet' : ''}`.trim()}>
          {account.type === 'ewallet' ? 'E-Wallet' : 'Bank'}
        </span>
      </div>
      <div className="list-row__end">
        <span className="list-row__amount">{formatPHP(account.balance)}</span>
        <button
          type="button"
          className="btn-icon btn-icon--danger"
          aria-label={`Remove ${account.name}`}
          onClick={() => dispatch({ type: 'account/remove', payload: { id: account.id } })}
        >
          ×
        </button>
      </div>
    </div>
  );
}
