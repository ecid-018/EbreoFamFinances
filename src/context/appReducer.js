import { generateId } from '../utils/id.js';
import { addMonths, toISODateString } from '../utils/date.js';

function logEntry(ledger, { domain, type, name, amount, date }) {
  const entry = {
    id: generateId(),
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
  payday: 'Funded on payday',
};

// Mirrors withdraw_from_goal: the goal's saved total drops, but no account
// balance moves — whatever actually spent the money already recorded that.
function applyGoalWithdrawal(state, { id, amount, note }) {
  const existing = state.goals.find((g) => g.id === id);
  if (!existing || amount > existing.saved) return state;
  return {
    ...state,
    goals: state.goals.map((g) => (g.id === id ? { ...g, saved: g.saved - amount } : g)),
    ledger: logEntry(state.ledger, {
      domain: 'Goal',
      type: 'Withdrawn from goal',
      name: note || existing.name,
      amount,
    }),
  };
}

export function appReducer(state, action) {
  switch (action.type) {
    case 'bootstrap/loaded': {
      return { ...state, ...action.payload };
    }

    case 'envelope/add': {
      const { id, name, monthlyBudget, group } = action.payload;
      const envelope = { id, name, monthlyBudget, group: group || name };
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

    case 'month/setMode': {
      const { monthKey, mode } = action.payload;
      const exists = state.monthModes.some((m) => m.monthKey === monthKey);
      return {
        ...state,
        monthModes: exists
          ? state.monthModes.map((m) => (m.monthKey === monthKey ? { ...m, mode } : m))
          : [...state.monthModes, { monthKey, mode }],
        ledger: logEntry(state.ledger, {
          domain: 'Month',
          type: 'Mode set',
          name: `${monthKey} — ${mode}`,
          amount: 0,
        }),
      };
    }

    case 'envelope/setMonthBudget': {
      const { envelopeId, monthKey, amount } = action.payload;
      const existing = state.envelopeBudgets.find(
        (b) => b.envelopeId === envelopeId && b.monthKey === monthKey
      );
      const envelope = state.envelopes.find((env) => env.id === envelopeId);
      return {
        ...state,
        // Mirrors the upsert: replace the row for this envelope+month if there
        // is one, otherwise append. envelopes[].monthlyBudget is left alone —
        // it is the base figure, not this month's.
        envelopeBudgets: existing
          ? state.envelopeBudgets.map((b) =>
              b.envelopeId === envelopeId && b.monthKey === monthKey ? { ...b, amount } : b
            )
          : [...state.envelopeBudgets, { id: action.payload.id, envelopeId, monthKey, amount }],
        ledger: logEntry(state.ledger, {
          domain: 'Envelope',
          type: 'Budget set for month',
          name: `${envelope?.name ?? 'Envelope'} (${monthKey})`,
          amount,
        }),
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
      const { id, date, amount, note, categoryId = null, accountId = null } = action.payload;
      const transaction = { id, date, amount, note, categoryId, accountId };
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
      const { id, date, source, amount, accountId = null, budgetMonthKey } = action.payload;
      const entry = { id, date, source, amount, accountId, budgetMonthKey };
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
      const { id, name, type, balance, currency, ownerId, countsTowardFloor, role } = action.payload;
      const account = {
        id,
        name,
        type,
        balance,
        currency: currency ?? 'PHP',
        ownerId,
        archivedAt: null,
        countsTowardFloor: countsTowardFloor ?? false,
        role: role ?? null,
      };
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
      const { id, name, type, balance, currency, countsTowardFloor, role } = action.payload;
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === id
            ? {
                ...a,
                name,
                type,
                balance,
                currency: currency ?? 'PHP',
                countsTowardFloor: countsTowardFloor ?? false,
                role: role ?? null,
              }
            : a
        ),
        ledger: logEntry(state.ledger, {
          domain: 'Account',
          type: 'Balance updated',
          name,
          amount: balance,
        }),
      };
    }

    // Archive/unarchive only flip a flag: the balance stays in the household
    // totals and every historical entry keeps pointing at the account. The
    // pickers and the account decks filter on it (see utils/accounts.js).
    case 'account/archive':
    case 'account/unarchive': {
      const { id } = action.payload;
      const existing = state.accounts.find((a) => a.id === id);
      if (!existing) return state;
      const isArchiving = action.type === 'account/archive';
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === id ? { ...a, archivedAt: isArchiving ? new Date().toISOString() : null } : a
        ),
        ledger: logEntry(state.ledger, {
          domain: 'Account',
          type: isArchiving ? 'Account archived' : 'Account restored',
          name: existing.name,
          amount: existing.balance,
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
      const {
        id, name, target, saved = 0,
        priority = null, targetDate = null, heldInAccountId = null,
        isSinkingFund = false, goalGroup = null,
      } = action.payload;
      const goal = {
        id, name, target, saved,
        priority, targetDate, heldInAccountId, isSinkingFund, goalGroup,
        archivedAt: null,
        createdAt: new Date().toISOString(),
      };
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

    case 'goal/update': {
      const {
        id, name, target,
        priority = null, targetDate = null, heldInAccountId = null,
        isSinkingFund = false, goalGroup = null,
      } = action.payload;
      const existing = state.goals.find((g) => g.id === id);
      if (!existing) return state;
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === id
            ? { ...g, name, target, priority, targetDate, heldInAccountId, isSinkingFund, goalGroup }
            : g
        ),
        ledger: logEntry(state.ledger, {
          domain: 'Goal',
          type: 'Target updated',
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

    case 'goal/withdraw':
      return applyGoalWithdrawal(state, action.payload);

    case 'goal/archive':
    case 'goal/unarchive': {
      const { id } = action.payload;
      const existing = state.goals.find((g) => g.id === id);
      if (!existing) return state;
      const isArchiving = action.type === 'goal/archive';
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === id ? { ...g, archivedAt: isArchiving ? new Date().toISOString() : null } : g
        ),
        ledger: logEntry(state.ledger, {
          domain: 'Goal',
          type: isArchiving ? 'Goal archived' : 'Goal restored',
          name: existing.name,
          amount: existing.saved,
        }),
      };
    }

    case 'transfer/add': {
      const { id, date, fromAccountId, toAccountId, fromAmount, toAmount, note } = action.payload;
      const fromAccount = state.accounts.find((a) => a.id === fromAccountId);
      const toAccount = state.accounts.find((a) => a.id === toAccountId);
      const transfer = { id, date, fromAccountId, toAccountId, fromAmount, toAmount, note };

      let accounts = adjustAccountBalance(state.accounts, fromAccountId, -fromAmount);
      accounts = adjustAccountBalance(accounts, toAccountId, toAmount);

      let ledger = logEntry(state.ledger, {
        domain: 'Transfer',
        type: 'Transferred out',
        name: note || toAccount?.name || 'Transfer',
        amount: fromAmount,
        date,
      });
      ledger = logEntry(ledger, {
        domain: 'Transfer',
        type: 'Transferred in',
        name: note || fromAccount?.name || 'Transfer',
        amount: toAmount,
        date,
      });

      return { ...state, accounts, ledger, transfers: [...state.transfers, transfer] };
    }

    case 'transfer/update': {
      const { id, date, fromAccountId, toAccountId, fromAmount, toAmount, note } = action.payload;
      const existing = state.transfers.find((t) => t.id === id);
      if (!existing) return state;

      const oldFromAccount = state.accounts.find((a) => a.id === existing.fromAccountId);
      const oldToAccount = state.accounts.find((a) => a.id === existing.toAccountId);
      const newFromAccount = state.accounts.find((a) => a.id === fromAccountId);
      const newToAccount = state.accounts.find((a) => a.id === toAccountId);

      // Fully reverse the old movement, then fully apply the new one —
      // mirrors update_transfer's RPC logic exactly.
      let accounts = adjustAccountBalance(state.accounts, existing.fromAccountId, existing.fromAmount);
      accounts = adjustAccountBalance(accounts, existing.toAccountId, -existing.toAmount);
      accounts = adjustAccountBalance(accounts, fromAccountId, -fromAmount);
      accounts = adjustAccountBalance(accounts, toAccountId, toAmount);

      let ledger = logEntry(state.ledger, {
        domain: 'Transfer',
        type: 'Reversed (transfer updated)',
        name: oldToAccount?.name || 'Transfer',
        amount: existing.fromAmount,
        date,
      });
      ledger = logEntry(ledger, {
        domain: 'Transfer',
        type: 'Reversed (transfer updated)',
        name: oldFromAccount?.name || 'Transfer',
        amount: existing.toAmount,
        date,
      });
      ledger = logEntry(ledger, {
        domain: 'Transfer',
        type: 'Transferred out',
        name: note || newToAccount?.name || 'Transfer',
        amount: fromAmount,
        date,
      });
      ledger = logEntry(ledger, {
        domain: 'Transfer',
        type: 'Transferred in',
        name: note || newFromAccount?.name || 'Transfer',
        amount: toAmount,
        date,
      });

      return {
        ...state,
        accounts,
        ledger,
        transfers: state.transfers.map((t) =>
          t.id === id ? { id, date, fromAccountId, toAccountId, fromAmount, toAmount, note } : t
        ),
      };
    }

    case 'transfer/remove': {
      const { id } = action.payload;
      const existing = state.transfers.find((t) => t.id === id);
      if (!existing) return state;

      const fromAccount = state.accounts.find((a) => a.id === existing.fromAccountId);
      const toAccount = state.accounts.find((a) => a.id === existing.toAccountId);

      let accounts = adjustAccountBalance(state.accounts, existing.fromAccountId, existing.fromAmount);
      accounts = adjustAccountBalance(accounts, existing.toAccountId, -existing.toAmount);

      let ledger = logEntry(state.ledger, {
        domain: 'Transfer',
        type: 'Transfer removed',
        name: toAccount?.name || 'Transfer',
        amount: existing.fromAmount,
        date: existing.date,
      });
      ledger = logEntry(ledger, {
        domain: 'Transfer',
        type: 'Transfer removed',
        name: fromAccount?.name || 'Transfer',
        amount: existing.toAmount,
        date: existing.date,
      });

      return {
        ...state,
        accounts,
        ledger,
        transfers: state.transfers.filter((t) => t.id !== id),
      };
    }

    // Bills are plain records: creating or editing one moves no money, so the
    // optimistic update is safe here in a way it would not be for paying one.
    // There is deliberately NO 'bill/pay' case — that goes through the RPC and
    // the screen waits for the refetch.
    case 'bill/add': {
      const {
        id, name, amount, period, dueDay = null, nextDue = null,
        accountId = null, envelopeId = null, goalId = null, isActive = true,
      } = action.payload;
      return {
        ...state,
        bills: [...state.bills, { id, name, amount, period, dueDay, nextDue, accountId, envelopeId, goalId, isActive }],
        ledger: logEntry(state.ledger, { domain: 'Bill', type: 'Bill added', name, amount }),
      };
    }

    case 'bill/update': {
      return {
        ...state,
        bills: state.bills.map((b) => (b.id === action.payload.id ? { ...b, ...action.payload } : b)),
        ledger: logEntry(state.ledger, {
          domain: 'Bill',
          type: 'Bill updated',
          name: action.payload.name,
          amount: action.payload.amount,
        }),
      };
    }

    case 'bill/remove': {
      const existing = state.bills.find((b) => b.id === action.payload.id);
      return {
        ...state,
        bills: state.bills.filter((b) => b.id !== action.payload.id),
        ledger: existing
          ? logEntry(state.ledger, { domain: 'Bill', type: 'Bill removed', name: existing.name, amount: existing.amount })
          : state.ledger,
      };
    }

    case 'planSettings/update':
      return { ...state, planSettings: { ...state.planSettings, ...action.payload } };

    case 'month/next':
      return { ...state, month: addMonths(state.month, 1) };

    case 'month/prev':
      return { ...state, month: addMonths(state.month, -1) };

    default:
      return state;
  }
}
