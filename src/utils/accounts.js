// USD accounts are balance-tracking only — they're deliberately excluded from
// every "pay from" / "deposit into" picker so transaction/income/envelope math
// (all PHP-denominated) never silently blends in a dollar amount.
export function getSpendableAccounts(accounts) {
  return accounts.filter((a) => (a.currency ?? 'PHP') === 'PHP');
}
