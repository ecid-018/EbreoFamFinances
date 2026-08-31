import { seedData } from '../data/seedData.js';
import { loadPersistedData } from '../data/storage.js';
import { generateId } from '../utils/id.js';
import { addMonths, getCurrentMonth, toISODateString, getMonthKeyFromDateStr } from '../utils/date.js';

export function initState() {
  const persisted = loadPersistedData();
  const domain = persisted ?? seedData;
  return {
    envelopes: domain.envelopes ?? [],
    transactions: domain.transactions ?? [],
    // Backfill for income recorded before accountId/budgetMonthKey existed — without this,
    // existing users' persisted income would be missing budgetMonthKey and crash any code
    // that filters on it. Defaulting to the entry's own received month preserves exactly
    // today's behavior for anything recorded before this feature shipped.
    income: (domain.income ?? []).map((entry) => ({
      ...entry,
      accountId: entry.accountId ?? null,
      budgetMonthKey: entry.budgetMonthKey ?? getMonthKeyFromDateStr(entry.date),
    })),
    accounts: domain.accounts ?? [],
    goals: domain.goals ?? [],
    ledger: domain.ledger ?? [],
    month: getCurrentMonth(),
  };
}

function logEntry(ledger, { domain, type, name, amount, date }) {
  const entry = {
    id: generateId('ledger'),
    date: date ?? toISODateString(),
    domain,
    type,
    name,
    amount,
  };
  return [...ledger, entry];
}

function adjustAccountBalance(accounts, accountId, delta) {
  return accounts.map((a) => (a.id === accountId ? { ...a, balance: a.balance + delta } : a));
}

const GOAL_CONTRIBUTE_LABELS = {
  manual: 'Funded',
  account: 'Funded from account',
  savingsEnvelope: 'Funded via Savings envelope',
  income: 'Funded via new income',
};

export function appReducer(state, action) {
  switch (action.type) {
    case 'envelope/add': {
      const { name, monthlyBudget, group } = action.payload;
      const envelope = { id: generateId('env'), name, monthlyBudget, group: group || name };
      return {
        ...state,
        envelopes: [...state.envelopes, envelope],
        ledger: logEntry(state.ledger, {
          domain: 'Envelope',
          type: 'Created',
          name: envelope.name,
          amount: envelope.monthlyBudget,
        }),
      };
    }

    case 'envelope/update': {
      const { id, name, monthlyBudget, group } = action.payload;
      const existing = state.envelopes.find((env) => env.id === id);
      if (!existing) return state;

      let ledger = state.ledger;
      if (existing.name !== name || existing.monthlyBudget !== monthlyBudget) {
        ledger = logEntry(ledger, { domain: 'Envelope', type: 'Budget updated', name, amount: monthlyBudget });
      }
      if (group && existing.group !== group) {
        ledger = logEntry(ledger, { domain: 'Envelope', type: 'Moved to group', name, amount: monthlyBudget });
      }

      return {
        ...state,
        envelopes: state.envelopes.map((env) =>
          env.id === id ? { ...env, name, monthlyBudget, group: group ?? env.group } : env
        ),
        ledger,
      };
    }

    case 'envelope/remove': {
      const { id } = action.payload;
      const existing = state.envelopes.find((env) => env.id === id);
      return {
        ...state,
        envelopes: state.envelopes.filter((env) => env.id !== id),
        transactions: state.transactions.map((t) =>
          t.categoryId === id ? { ...t, categoryId: null } : t
        ),
        ledger: existing
          ? logEntry(state.ledger, {
              domain: 'Envelope',
              type: 'Removed',
              name: existing.name,
              amount: existing.monthlyBudget,
            })
          : state.ledger,
      };
    }

    case 'transaction/add': {
      const { date, amount, note, categoryId = null, accountId = null } = action.payload;
      const transaction = { id: generateId('txn'), date, amount, note, categoryId, accountId };
      const envelope = categoryId ? state.envelopes.find((env) => env.id === categoryId) : null;
      const account = accountId ? state.accounts.find((a) => a.id === accountId) : null;

      const labelParts = [envelope?.name, account?.name].filter(Boolean);
      const expenseName =
        labelParts.length > 0 ? `${note || 'Expense'} (${labelParts.join(' · ')})` : note || 'Expense';

      let ledger = logEntry(state.ledger, {
        domain: 'Expense',
        type: 'Expense logged',
        name: expenseName,
        amount,
        date,
      });
      if (account) {
        ledger = logEntry(ledger, {
          domain: 'Account',
          type: 'Deducted for expense',
          name: account.name,
          amount,
          date,
        });
      }

      return {
        ...state,
        transactions: [...state.transactions, transaction],
        accounts: account ? adjustAccountBalance(state.accounts, accountId, -amount) : state.accounts,
        ledger,
      };
    }

    case 'transaction/update': {
      const { id, date, amount, note, categoryId = null, accountId = null } = action.payload;
      const existing = state.transactions.find((t) => t.id === id);
      if (!existing) return state;

      const oldAccount = existing.accountId ? state.accounts.find((a) => a.id === existing.accountId) : null;
      const newAccount = accountId ? state.accounts.find((a) => a.id === accountId) : null;

      let accounts = state.accounts;
      let ledger = logEntry(state.ledger, {
        domain: 'Expense',
        type: 'Expense updated',
        name: note || 'Expense',
        amount,
        date,
      });

      if (oldAccount) {
        accounts = adjustAccountBalance(accounts, oldAccount.id, existing.amount);
        ledger = logEntry(ledger, {
          domain: 'Account',
          type: 'Refunded (expense updated)',
          name: oldAccount.name,
          amount: existing.amount,
          date,
        });
      }
      if (newAccount) {
        accounts = adjustAccountBalance(accounts, newAccount.id, -amount);
        ledger = logEntry(ledger, {
          domain: 'Account',
          type: 'Deducted for expense update',
          name: newAccount.name,
          amount,
          date,
        });
      }

      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === id ? { ...t, date, amount, note, categoryId, accountId } : t
        ),
        accounts,
        ledger,
      };
    }

    case 'transaction/remove': {
      const { id } = action.payload;
      const existing = state.transactions.find((t) => t.id === id);
      if (!existing) return state;

      const account = existing.accountId ? state.accounts.find((a) => a.id === existing.accountId) : null;

      let ledger = logEntry(state.ledger, {
        domain: 'Expense',
        type: 'Expense removed',
        name: existing.note || 'Expense',
        amount: existing.amount,
        date: existing.date,
      });
      if (account) {
        ledger = logEntry(ledger, {
          domain: 'Account',
          type: 'Refunded (expense removed)',
          name: account.name,
          amount: existing.amount,
          date: existing.date,
        });
      }

      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== id),
        accounts: account
          ? adjustAccountBalance(state.accounts, existing.accountId, existing.amount)
          : state.accounts,
        ledger,
      };
    }

    case 'transaction/assignCategory': {
      const { id, categoryId } = action.payload;
      const existing = state.transactions.find((t) => t.id === id);
      const envelope = state.envelopes.find((env) => env.id === categoryId);
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === id ? { ...t, categoryId } : t
        ),
        ledger:
          existing && envelope
            ? logEntry(state.ledger, {
                domain: 'Expense',
                type: 'Filed to envelope',
                name: `${existing.note || 'Expense'} → ${envelope.name}`,
                amount: existing.amount,
                date: existing.date,
              })
            : state.ledger,
      };
    }

    case 'income/add': {
      const { date, source, amount, accountId = null, budgetMonthKey } = action.payload;
      const entry = { id: generateId('inc'), date, source, amount, accountId, budgetMonthKey };
      const account = accountId ? state.accounts.find((a) => a.id === accountId) : null;

      let ledger = logEntry(state.ledger, {
        domain: 'Income',
        type: 'Income received',
        name: source,
        amount,
        date,
      });
      if (account) {
        ledger = logEntry(ledger, {
          domain: 'Account',
          type: 'Credited from income',
          name: account.name,
          amount,
          date,
        });
      }

      return {
        ...state,
        income: [...state.income, entry],
        accounts: account ? adjustAccountBalance(state.accounts, accountId, amount) : state.accounts,
        ledger,
      };
    }

    case 'income/update': {
      const { id, date, source, amount, accountId = null, budgetMonthKey } = action.payload;
      const existing = state.income.find((i) => i.id === id);
      if (!existing) return state;

      const oldAccount = existing.accountId ? state.accounts.find((a) => a.id === existing.accountId) : null;
      const newAccount = accountId ? state.accounts.find((a) => a.id === accountId) : null;

      let accounts = state.accounts;
      let ledger = logEntry(state.ledger, {
        domain: 'Income',
        type: 'Income updated',
        name: source,
        amount,
        date,
      });

      if (oldAccount) {
        accounts = adjustAccountBalance(accounts, oldAccount.id, -existing.amount);
        ledger = logEntry(ledger, {
          domain: 'Account',
          type: 'Reversed (income updated)',
          name: oldAccount.name,
          amount: existing.amount,
          date,
        });
      }
      if (newAccount) {
        accounts = adjustAccountBalance(accounts, newAccount.id, amount);
        ledger = logEntry(ledger, {
          domain: 'Account',
          type: 'Credited from income',
          name: newAccount.name,
          amount,
          date,
        });
      }

      return {
        ...state,
        income: state.income.map((i) =>
          i.id === id ? { ...i, date, source, amount, accountId, budgetMonthKey } : i
        ),
        accounts,
        ledger,
      };
    }

    case 'income/remove': {
      const { id } = action.payload;
      const existing = state.income.find((i) => i.id === id);
      if (!existing) return state;

      const account = existing.accountId ? state.accounts.find((a) => a.id === existing.accountId) : null;

      let ledger = logEntry(state.ledger, {
        domain: 'Income',
        type: 'Income removed',
        name: existing.source,
        amount: existing.amount,
        date: existing.date,
      });
      if (account) {
        ledger = logEntry(ledger, {
          domain: 'Account',
          type: 'Reversed (income removed)',
          name: account.name,
          amount: existing.amount,
          date: existing.date,
        });
      }

      return {
        ...state,
        income: state.income.filter((i) => i.id !== id),
        accounts: account
          ? adjustAccountBalance(state.accounts, existing.accountId, -existing.amount)
          : state.accounts,
        ledger,
      };
    }

    case 'account/add': {
      const { name, type, balance } = action.payload;
      const account = { id: generateId('acct'), name, type, balance };
      return {
        ...state,
        accounts: [...state.accounts, account],
        ledger: logEntry(state.ledger, {
          domain: 'Account',
          type: 'Account added',
          name,
          amount: balance,
        }),
      };
    }

    case 'account/update': {
      const { id, name, type, balance } = action.payload;
      return {
        ...state,
        accounts: state.accounts.map((a) => (a.id === id ? { ...a, name, type, balance } : a)),
        ledger: logEntry(state.ledger, {
          domain: 'Account',
          type: 'Balance updated',
          name,
          amount: balance,
        }),
      };
    }

    case 'account/remove': {
      const { id } = action.payload;
      const existing = state.accounts.find((a) => a.id === id);
      return {
        ...state,
        accounts: state.accounts.filter((a) => a.id !== id),
        transactions: state.transactions.map((t) =>
          t.accountId === id ? { ...t, accountId: null } : t
        ),
        income: state.income.map((i) => (i.accountId === id ? { ...i, accountId: null } : i)),
        ledger: existing
          ? logEntry(state.ledger, {
              domain: 'Account',
              type: 'Account removed',
              name: existing.name,
              amount: existing.balance,
            })
          : state.ledger,
      };
    }

    case 'goal/add': {
      const { name, target, saved = 0 } = action.payload;
      const goal = { id: generateId('goal'), name, target, saved };
      return {
        ...state,
        goals: [...state.goals, goal],
        ledger: logEntry(state.ledger, {
          domain: 'Goal',
          type: 'Created',
          name,
          amount: target,
        }),
      };
    }

    case 'goal/remove': {
      const { id } = action.payload;
      const existing = state.goals.find((g) => g.id === id);
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== id),
        ledger: existing
          ? logEntry(state.ledger, {
              domain: 'Goal',
              type: 'Removed',
              name: existing.name,
              amount: existing.saved,
            })
          : state.ledger,
      };
    }

    case 'goal/contribute': {
      const { id, amount, accountId = null, via = 'manual' } = action.payload;
      const existing = state.goals.find((g) => g.id === id);
      if (!existing) return state;

      const account = via === 'account' && accountId ? state.accounts.find((a) => a.id === accountId) : null;

      let ledger = logEntry(state.ledger, {
        domain: 'Goal',
        type: GOAL_CONTRIBUTE_LABELS[via] ?? 'Funded',
        name: existing.name,
        amount,
      });
      if (account) {
        ledger = logEntry(ledger, {
          domain: 'Account',
          type: 'Deducted for goal contribution',
          name: account.name,
          amount,
        });
      }

      return {
        ...state,
        goals: state.goals.map((g) => (g.id === id ? { ...g, saved: g.saved + amount } : g)),
        accounts: account ? adjustAccountBalance(state.accounts, accountId, -amount) : state.accounts,
        ledger,
      };
    }

    case 'month/next':
      return { ...state, month: addMonths(state.month, 1) };

    case 'month/prev':
      return { ...state, month: addMonths(state.month, -1) };

    default:
      return state;
  }
}
