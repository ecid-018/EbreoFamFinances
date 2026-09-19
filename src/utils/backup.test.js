import { describe, it, expect } from 'vitest';
import { buildFullBackupJson } from './backup.js';

// The v1 backup silently omitted `transfers`, so anything restored from one
// was missing every transfer ever made. Guard every table explicitly.
const state = {
  envelopes: [{ id: 'e1', name: 'Groceries', monthlyBudget: 100, group: 'Needs' }],
  transactions: [{ id: 't1', date: '2026-09-01', amount: 10, note: 'x', categoryId: 'e1', accountId: 'a1' }],
  income: [{ id: 'i1', date: '2026-09-01', source: 'Pay', amount: 50, accountId: 'a1', budgetMonthKey: '2026-09' }],
  accounts: [{ id: 'a1', name: 'Bank', type: 'bank', balance: 40, currency: 'PHP', ownerId: 'u1' }],
  goals: [{ id: 'g1', name: 'Trip', target: 100, saved: 5 }],
  ledger: [{ id: 'l1', date: '2026-09-01', domain: 'Expense', type: 'Expense logged', name: 'x', amount: 10 }],
  transfers: [{ id: 'tr1', date: '2026-09-01', fromAccountId: 'a1', toAccountId: 'a2', fromAmount: 5, toAmount: 5, note: '' }],
  // Not part of a backup: transient UI state must never leak into the file.
  month: { year: 2026, monthIndex: 8 },
  profiles: [{ id: 'u1', displayName: 'Someone', avatarUrl: null }],
};

describe('buildFullBackupJson', () => {
  const parsed = JSON.parse(buildFullBackupJson(state));

  it('includes every data table, transfers included', () => {
    expect(parsed.transfers).toHaveLength(1);
    expect(parsed.transfers[0].id).toBe('tr1');
    for (const table of ['envelopes', 'transactions', 'income', 'accounts', 'goals', 'ledger']) {
      expect(parsed[table], table).toHaveLength(1);
    }
  });

  it('declares version 2 and a timestamp', () => {
    expect(parsed.version).toBe(2);
    expect(Number.isNaN(Date.parse(parsed.exportedAt))).toBe(false);
  });

  it('leaves UI state out of the file', () => {
    expect(parsed.month).toBeUndefined();
    expect(parsed.profiles).toBeUndefined();
  });
});
