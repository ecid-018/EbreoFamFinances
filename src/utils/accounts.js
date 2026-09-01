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
export function getSpendableAccounts(accounts, userId) {
  return accounts.filter((a) => (a.currency ?? 'PHP') === 'PHP' && a.ownerId === userId);
}

export function getOwnAccounts(accounts, userId) {
  return accounts.filter((a) => a.ownerId === userId);
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
