import { seedData } from '../data/seedData.js';
import { loadPersistedData } from '../data/storage.js';
import { generateId } from '../utils/id.js';
import { addMonths, getCurrentMonth, toISODateString } from '../utils/date.js';

export function initState() {
  const persisted = loadPersistedData();
  const domain = persisted ?? seedData;
  return {
    envelopes: domain.envelopes ?? [],
    transactions: domain.transactions ?? [],
    income: domain.income ?? [],
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
      const { date, amount, note, categoryId = null } = action.payload;
      const transaction = { id: generateId('txn'), date, amount, note, categoryId };
      const envelope = categoryId ? state.envelopes.find((env) => env.id === categoryId) : null;
      return {
        ...state,
        transactions: [...state.transactions, transaction],
        ledger: logEntry(state.ledger, {
          domain: 'Expense',
          type: 'Expense logged',
          name: envelope ? `${note || 'Expense'} (${envelope.name})` : note || 'Expense',
          amount,
          date,
        }),
      };
    }

    case 'transaction/remove': {
      const { id } = action.payload;
      const existing = state.transactions.find((t) => t.id === id);
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== id),
        ledger: existing
          ? logEntry(state.ledger, {
              domain: 'Expense',
              type: 'Expense removed',
              name: existing.note || 'Expense',
              amount: existing.amount,
              date: existing.date,
            })
          : state.ledger,
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
      const { date, source, amount } = action.payload;
      const entry = { id: generateId('inc'), date, source, amount };
      return {
        ...state,
        income: [...state.income, entry],
        ledger: logEntry(state.ledger, {
          domain: 'Income',
          type: 'Income received',
          name: source,
          amount,
          date,
        }),
      };
    }

    case 'income/update': {
      const { id, date, source, amount } = action.payload;
      return {
        ...state,
        income: state.income.map((i) => (i.id === id ? { ...i, date, source, amount } : i)),
        ledger: logEntry(state.ledger, {
          domain: 'Income',
          type: 'Income updated',
          name: source,
          amount,
          date,
        }),
      };
    }

    case 'income/remove': {
      const { id } = action.payload;
      const existing = state.income.find((i) => i.id === id);
      return {
        ...state,
        income: state.income.filter((i) => i.id !== id),
        ledger: existing
          ? logEntry(state.ledger, {
              domain: 'Income',
              type: 'Income removed',
              name: existing.source,
              amount: existing.amount,
              date: existing.date,
            })
          : state.ledger,
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
      const { id, amount } = action.payload;
      const existing = state.goals.find((g) => g.id === id);
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === id ? { ...g, saved: g.saved + amount } : g
        ),
        ledger: existing
          ? logEntry(state.ledger, { domain: 'Goal', type: 'Funded', name: existing.name, amount })
          : state.ledger,
      };
    }

    case 'goal/contributeViaSavings': {
      const { id, amount } = action.payload;
      const existing = state.goals.find((g) => g.id === id);
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === id ? { ...g, saved: g.saved + amount } : g
        ),
        ledger: existing
          ? logEntry(state.ledger, {
              domain: 'Goal',
              type: 'Funded via Savings envelope',
              name: existing.name,
              amount,
            })
          : state.ledger,
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
