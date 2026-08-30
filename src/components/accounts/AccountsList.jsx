import { useApp } from '../../context/AppContext.jsx';
import { AccountRow } from './AccountRow.jsx';

export function AccountsList() {
  const { state, openModal } = useApp();

  return (
    <div className="ios-group" id="section-accounts">
      <div className="ios-group__header">
        <span className="ios-group__title">Accounts &amp; E-wallets</span>
      </div>
      <div className="ios-card">
        {state.accounts.map((account) => (
          <AccountRow key={account.id} account={account} />
        ))}
        <button
          type="button"
          className="ios-row-wrap list-row-plain"
          onClick={() => openModal('accountForm', { mode: 'add' })}
        >
          + Add Account
        </button>
      </div>
    </div>
  );
}
