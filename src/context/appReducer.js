import { seedData } from '../data/seedData.js';
import { loadPersistedData } from '../data/storage.js';
import { generateId } from '../utils/id.js';
import { addMonths, getCurrentMonth } from '../utils/date.js';

export function initState() {
  const persisted = loadPersistedData();
  const domain = persisted ?? seedData;
  return {
    envelopes: domain.envelopes ?? [],
    transactions: domain.transactions ?? [],
    income: domain.income ?? [],
    accounts: domain.accounts ?? [],
    goals: domain.goals ?? [],
    month: getCurrentMonth(),
  };
}

export function appReducer(state, action) {
  switch (action.type) {
    case 'envelope/add': {
      const { name, monthlyBudget } = action.payload;
      const envelope = { id: generateId('env'), name, monthlyBudget };
      return { ...state, envelopes: [...state.envelopes, envelope] };
    }

    case 'envelope/update': {
      const { id, name, monthlyBudget } = action.payload;
      return {
        ...state,
        envelopes: state.envelopes.map((env) =>
          env.id === id ? { ...env, name, monthlyBudget } : env
        ),
      };
    }

    case 'envelope/remove': {
      const { id } = action.payload;
      return {
        ...state,
        envelopes: state.envelopes.filter((env) => env.id !== id),
        transactions: state.transactions.map((t) =>
          t.categoryId === id ? { ...t, categoryId: null } : t
        ),
      };
    }

    case 'transaction/add': {
      const { date, amount, note, categoryId = null } = action.payload;
      const transaction = { id: generateId('txn'), date, amount, note, categoryId };
      return { ...state, transactions: [...state.transactions, transaction] };
    }

    case 'transaction/assignCategory': {
      const { id, categoryId } = action.payload;
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === id ? { ...t, categoryId } : t
        ),
      };
    }

    case 'income/add': {
      const { date, source, amount } = action.payload;
      const entry = { id: generateId('inc'), date, source, amount };
      return { ...state, income: [...state.income, entry] };
    }

    case 'income/remove': {
      const { id } = action.payload;
      return { ...state, income: state.income.filter((i) => i.id !== id) };
    }

    case 'account/add': {
      const { name, type, balance } = action.payload;
      const account = { id: generateId('acct'), name, type, balance };
      return { ...state, accounts: [...state.accounts, account] };
    }

    case 'account/remove': {
      const { id } = action.payload;
      return { ...state, accounts: state.accounts.filter((a) => a.id !== id) };
    }

    case 'goal/add': {
      const { name, target, saved = 0 } = action.payload;
      const goal = { id: generateId('goal'), name, target, saved };
      return { ...state, goals: [...state.goals, goal] };
    }

    case 'goal/remove': {
      const { id } = action.payload;
      return { ...state, goals: state.goals.filter((g) => g.id !== id) };
    }

    case 'goal/contribute': {
      const { id, amount } = action.payload;
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === id ? { ...g, saved: g.saved + amount } : g
        ),
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
