import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { AccountCard } from './AccountCard.jsx';
import { SortIcon } from '../shared/Icon.jsx';
import { BottomSheet } from '../../modals/BottomSheet.jsx';

const SORT_OPTIONS = [
  { field: 'name', label: 'Name' },
  { field: 'type', label: 'Type' },
  { field: 'balance', label: 'Cash Value' },
];

function sortAccounts(accounts, field, direction) {
  const sorted = [...accounts].sort((a, b) => {
    if (field === 'balance') return a.balance - b.balance;
    return a[field].localeCompare(b[field]);
  });
  return direction === 'desc' ? sorted.reverse() : sorted;
}

export function AccountsList() {
  const { state, openModal } = useApp();
  const { session } = useAuth();
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const myId = session?.user?.id;
  const mine = sortAccounts(
    state.accounts.filter((a) => a.ownerId === myId),
    sortField,
    sortDirection
  );
  const theirs = sortAccounts(
    state.accounts.filter((a) => a.ownerId !== myId),
    sortField,
    sortDirection
  );
  const otherOwnerId = theirs[0]?.ownerId;
  const otherOwnerName = state.profiles.find((p) => p.id === otherOwnerId)?.displayName ?? "Their";

  function handleSortSelect(field) {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setSortSheetOpen(false);
  }

  return (
    <div id="section-accounts">
      <div className="ios-group">
        <div className="ios-group__header">
          <span className="ios-group__title">Your Accounts</span>
          <button type="button" className="ios-group__sort-btn" onClick={() => setSortSheetOpen(true)}>
            <SortIcon size={14} />
            Sort
          </button>
        </div>
        <div className="account-deck">
          {mine.map((account, index) => (
            <AccountCard key={account.id} account={account} index={index} />
          ))}
          <div className="account-card-add-wrap">
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
            {theirs.map((account, index) => (
              <AccountCard key={account.id} account={account} index={index} />
            ))}
          </div>
        </div>
      )}

      {sortSheetOpen && (
        <BottomSheet title="Sort Accounts" onClose={() => setSortSheetOpen(false)}>
          <div className="sort-sheet">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.field}
                type="button"
                className="sort-sheet__option"
                onClick={() => handleSortSelect(opt.field)}
              >
                <span>{opt.label}</span>
                {sortField === opt.field && (
                  <span className="sort-sheet__direction">{sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending'}</span>
                )}
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
