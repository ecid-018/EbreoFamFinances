// Expenses and goal contributions stay PHP-only — USD accounts are excluded
// from those pickers so envelope-budget math never silently blends in a
// dollar amount. (Income is the one exception: it can target a USD account
// directly — see splitIncomeByCurrency below for how its totals stay correct.)
export function getSpendableAccounts(accounts) {
  return accounts.filter((a) => (a.currency ?? 'PHP') === 'PHP');
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
