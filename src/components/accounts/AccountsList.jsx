import { useApp } from '../../context/AppContext.jsx';
import { AccountRow } from './AccountRow.jsx';

export function AccountsList() {
  const { state, openModal } = useApp();

  return (
    <section className="section" id="section-accounts">
      <div className="section__header">
        <h2 className="section__title">Accounts &amp; e-wallets</h2>
      </div>
      <div className="list">
        {state.accounts.map((account) => (
          <AccountRow key={account.id} account={account} />
        ))}
      </div>
      <button
        type="button"
        className="btn btn-secondary section__add"
        onClick={() => openModal('addAccount')}
      >
        + Add account
      </button>
    </section>
  );
}
