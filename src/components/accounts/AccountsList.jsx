import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUsdToPhpRate } from '../../hooks/useUsdToPhpRate.js';
import { getActiveAccounts } from '../../utils/accounts.js';
import { formatByCurrency } from '../../utils/currency.js';
import { AccountCard } from './AccountCard.jsx';
import { SortIcon, ChevronRightIcon, ChevronDownIcon } from '../shared/Icon.jsx';
import { BottomSheet } from '../../modals/BottomSheet.jsx';

const SORT_OPTIONS = [
  { field: 'name', label: 'Name' },
  { field: 'type', label: 'Type' },
  { field: 'balance', label: 'Cash Value' },
];

// "Cash Value" sorts by each card's displayed PHP-equivalent value (USD
// accounts converted at the live rate), not the raw stored number — sorting
// by the raw USD figure would put a USD account showing ₱151,000+ near the
// bottom of a "highest first" sort, which reads as broken.
function sortAccounts(accounts, field, direction, usdToPhpRate) {
  const sorted = [...accounts].sort((a, b) => {
    if (field === 'balance') {
      const aValue = a.currency === 'USD' && usdToPhpRate ? a.balance * usdToPhpRate : a.balance;
      const bValue = b.currency === 'USD' && usdToPhpRate ? b.balance * usdToPhpRate : b.balance;
      return aValue - bValue;
    }
    return a[field].localeCompare(b[field]);
  });
  return direction === 'desc' ? sorted.reverse() : sorted;
}

export function AccountsList() {
  const { state, dispatch, openModal } = useApp();
  const { session } = useAuth();
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [archivedOpen, setArchivedOpen] = useState(false);
  const hasUsdAccount = state.accounts.some((a) => a.currency === 'USD');
  const { rate: usdToPhpRate } = useUsdToPhpRate(hasUsdAccount);

  const myId = session?.user?.id;
  // Decks show active accounts only. Archived ones keep their balance in the
  // household totals, so they get their own section rather than vanishing.
  const active = getActiveAccounts(state.accounts);
  const archived = state.accounts.filter((a) => a.archivedAt != null);
  const mine = sortAccounts(
    active.filter((a) => a.ownerId === myId),
    sortField,
    sortDirection,
    usdToPhpRate
  );
  const theirs = sortAccounts(
    active.filter((a) => a.ownerId !== myId),
    sortField,
    sortDirection,
    usdToPhpRate
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

      {archived.length > 0 && (
        <div className="ios-group">
          <div className="ios-card">
            <button
              type="button"
              className="ios-row-wrap list-row"
              aria-expanded={archivedOpen}
              onClick={() => setArchivedOpen((v) => !v)}
            >
              <div className="list-row__main">
                <span className="list-row__title">Archived ({archived.length})</span>
                <span className="list-row__meta">Hidden from pickers — balances still count</span>
              </div>
              {archivedOpen ? (
                <ChevronDownIcon size={16} className="list-row__chevron" />
              ) : (
                <ChevronRightIcon size={16} className="list-row__chevron" />
              )}
            </button>
            {archivedOpen &&
              archived.map((account) => (
                <div key={account.id} className="ios-row-wrap list-row">
                  <div className="list-row__main">
                    <span className="list-row__title">{account.name}</span>
                    <span className="list-row__meta">
                      {formatByCurrency(account.balance, account.currency)}
                      {account.ownerId !== myId ? ' · not yours' : ''}
                    </span>
                  </div>
                  {account.ownerId === myId && (
                    <button
                      type="button"
                      className="settings-photo-btn"
                      onClick={() => dispatch({ type: 'account/unarchive', payload: { id: account.id } })}
                    >
                      Restore
                    </button>
                  )}
                </div>
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
