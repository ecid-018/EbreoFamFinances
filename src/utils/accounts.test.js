import { describe, it, expect } from 'vitest';
import {
  getActiveAccounts,
  getSpendableAccounts,
  getOwnAccounts,
  withCurrentAccount,
  splitIncomeByCurrency,
} from './accounts.js';

const ME = 'user-me';
const THEM = 'user-them';

const accounts = [
  { id: 'php-mine', name: 'Bank', type: 'bank', balance: 1, currency: 'PHP', ownerId: ME, archivedAt: null },
  { id: 'usd-mine', name: 'Dollars', type: 'cash', balance: 1, currency: 'USD', ownerId: ME, archivedAt: null },
  { id: 'php-theirs', name: 'Their Bank', type: 'bank', balance: 1, currency: 'PHP', ownerId: THEM, archivedAt: null },
  { id: 'archived-mine', name: 'Old Wallet', type: 'ewallet', balance: 1, currency: 'PHP', ownerId: ME, archivedAt: '2026-09-01T00:00:00Z' },
  { id: 'legacy-no-flag', name: 'Legacy', type: 'bank', balance: 1, currency: 'PHP', ownerId: ME },
];

describe('getActiveAccounts', () => {
  it('drops archived accounts and keeps rows that predate the flag', () => {
    expect(getActiveAccounts(accounts).map((a) => a.id)).toEqual([
      'php-mine',
      'usd-mine',
      'php-theirs',
      'legacy-no-flag',
    ]);
  });
});

describe('getSpendableAccounts', () => {
  it('keeps only my active PHP accounts', () => {
    expect(getSpendableAccounts(accounts, ME).map((a) => a.id)).toEqual(['php-mine', 'legacy-no-flag']);
  });
});

describe('getOwnAccounts', () => {
  it('keeps my active accounts in any currency', () => {
    expect(getOwnAccounts(accounts, ME).map((a) => a.id)).toEqual(['php-mine', 'usd-mine', 'legacy-no-flag']);
  });
});

describe('withCurrentAccount', () => {
  it('re-injects an archived account when editing an entry linked to it', () => {
    const filtered = getSpendableAccounts(accounts, ME);
    const result = withCurrentAccount(filtered, accounts, 'archived-mine');
    expect(result.map((a) => a.id)).toEqual(['php-mine', 'legacy-no-flag', 'archived-mine']);
  });

  it('leaves the list alone when the current account is already present or unset', () => {
    const filtered = getSpendableAccounts(accounts, ME);
    expect(withCurrentAccount(filtered, accounts, 'php-mine')).toBe(filtered);
    expect(withCurrentAccount(filtered, accounts, null)).toBe(filtered);
    expect(withCurrentAccount(filtered, accounts, 'does-not-exist')).toBe(filtered);
  });
});

describe('splitIncomeByCurrency', () => {
  it('routes amounts by the linked account currency, defaulting to PHP', () => {
    const income = [
      { id: 'a', amount: 100, accountId: 'php-mine' },
      { id: 'b', amount: 40, accountId: 'usd-mine' },
      { id: 'c', amount: 7, accountId: null },
      { id: 'd', amount: 3, accountId: 'gone' },
    ];
    expect(splitIncomeByCurrency(income, accounts)).toEqual({ phpTotal: 110, usdTotal: 40 });
  });
});
