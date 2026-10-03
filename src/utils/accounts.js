import { NON_SPENDABLE_TYPES } from './plan/accountTypes.js';

// Expenses and goal contributions stay PHP-only — USD accounts are excluded
// from those pickers so envelope-budget math never silently blends in a
// dollar amount. (Income is the one exception: it can target a USD account
// directly — see splitIncomeByCurrency below for how its totals stay correct.)
//
// Both this and getOwnAccounts also scope to the logged-in user's own
// accounts — both households members having a "Maya" and a "BPI Savings"
// was genuinely confusing when either person's accounts showed up in these
// pickers. Transfer Money is the deliberate exception (see
// TransferMoneyModal.jsx), since crossing that boundary is its whole point.
// Archived accounts stay in state (their balance still counts toward the
// household totals, and historical entries still point at them) but they are
// out of every picker and out of the account decks. `archivedAt` is absent on
// rows created before the column existed, so test for null-ish rather than
// requiring the property.
export function getActiveAccounts(accounts) {
  return accounts.filter((a) => a.archivedAt == null);
}

export function getSpendableAccounts(accounts, userId) {
  return getActiveAccounts(accounts).filter(
    (a) =>
      (a.currency ?? 'PHP') === 'PHP' &&
      a.ownerId === userId &&
      // A co-op balance can only be spent through the co-op, and a receivable
      // is owed to the household rather than held by it — neither can pay for
      // groceries, so they stay out of expense and goal-funding pickers.
      !NON_SPENDABLE_TYPES.includes(a.type)
  );
}

export function getOwnAccounts(accounts, userId) {
  return getActiveAccounts(accounts).filter((a) => a.ownerId === userId);
}

// When editing a pre-existing transaction/income entry that's linked to an
// account outside the normal filtered list (e.g. historical data imported
// before this per-user scoping existed), that account still needs to appear
// as an option — otherwise the <select> silently shows a different account
// than what's actually saved, which reads as "it changed the account" even
// though submitting without touching the field wouldn't actually.
export function withCurrentAccount(filteredAccounts, allAccounts, currentAccountId) {
  if (!currentAccountId || filteredAccounts.some((a) => a.id === currentAccountId)) {
    return filteredAccounts;
  }
  const current = allAccounts.find((a) => a.id === currentAccountId);
  return current ? [...filteredAccounts, current] : filteredAccounts;
}

// Income can be deposited into a USD account, so every PHP-denominated income
// total (Safe-to-Spend, the "IN" stat, exports) needs to exclude those entries
// rather than silently summing dollars as pesos. An entry with no linked
// account (or one that no longer exists) defaults to PHP, matching how the
// rest of the app already treats unlinked income.
export function splitIncomeByCurrency(incomeEntries, accounts) {
  return incomeEntries.reduce(
    (totals, entry) => {
      const account = accounts.find((a) => a.id === entry.accountId);
      const isUsd = account?.currency === 'USD';
      return isUsd
        ? { ...totals, usdTotal: totals.usdTotal + entry.amount }
        : { ...totals, phpTotal: totals.phpTotal + entry.amount };
    },
    { phpTotal: 0, usdTotal: 0 }
  );
}

// Two accounts can share a name: this household has a "BPI Savings" each. Where
// that happens the owner is the only thing telling them apart, so the name
// carries it; where it does not, adding an owner would be noise on every row.
//
// The Payday and Transfer screens each solved this on their own, and every
// other picker did not -- so choosing between two identically named accounts
// was guesswork in seven places.
export function getAccountLabel(account, accounts = [], profiles = []) {
  if (!account) return 'an account';
  const sameName = accounts.filter((a) => a.name === account.name);
  if (sameName.length < 2) return account.name;
  const owner = profiles.find((p) => p.id === account.ownerId);
  return owner ? `${account.name} (${owner.displayName})` : account.name;
}

// The same, by id, for screens that hold an id rather than the row.
export function getAccountLabelById(id, accounts = [], profiles = []) {
  return getAccountLabel(accounts.find((a) => a.id === id) ?? null, accounts, profiles);
}
