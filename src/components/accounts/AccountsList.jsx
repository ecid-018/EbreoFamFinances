import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { AccountCard } from './AccountCard.jsx';

export function AccountsList() {
  const { state, openModal } = useApp();
  const { session } = useAuth();

  const myId = session?.user?.id;
  const mine = state.accounts.filter((a) => a.ownerId === myId);
  const theirs = state.accounts.filter((a) => a.ownerId !== myId);
  const otherOwnerId = theirs[0]?.ownerId;
  const otherOwnerName = state.profiles.find((p) => p.id === otherOwnerId)?.displayName ?? "Their";

  return (
    <div id="section-accounts">
      <div className="ios-group">
        <div className="ios-group__header">
          <span className="ios-group__title">Your Accounts</span>
        </div>
        <div className="account-deck">
          {mine.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
          <div className="account-card-wrap">
            <button
              type="button"
              className="account-card account-card--add"
              onClick={() => openModal('accountForm', { mode: 'add' })}
            >
              + Add Account
            </button>
          </div>
        </div>
      </div>

      {theirs.length > 0 && (
        <div className="ios-group">
          <div className="ios-group__header">
            <span className="ios-group__title">{otherOwnerName}&rsquo;s Accounts</span>
          </div>
          <div className="account-deck">
            {theirs.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
