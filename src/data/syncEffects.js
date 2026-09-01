// Maps each reducer action type to the Supabase call that persists it.
// `ctx.prevState` is the app state *before* this action's optimistic reducer
// update — used to look up "existing" records the same way appReducer.js
// does, so the ledger entries written here match what's already on screen.
import { repo } from './repo.js';

export const syncEffects = {
  'envelope/add': (payload, ctx) => repo.addEnvelope(payload, ctx.userId),
  'envelope/update': (payload, ctx) => {
    const existing = ctx.prevState.envelopes.find((env) => env.id === payload.id);
    return repo.updateEnvelope(payload, existing, ctx.userId);
  },
  'envelope/remove': (payload, ctx) => {
    const existing = ctx.prevState.envelopes.find((env) => env.id === payload.id);
    return repo.removeEnvelope(payload.id, existing, ctx.userId);
  },

  'account/add': (payload, ctx) => repo.addAccount(payload, ctx.userId),
  'account/update': (payload, ctx) => repo.updateAccount(payload, ctx.userId),
  'account/remove': (payload, ctx) => {
    const existing = ctx.prevState.accounts.find((a) => a.id === payload.id);
    return repo.removeAccount(payload.id, existing, ctx.userId);
  },

  'goal/add': (payload, ctx) => repo.addGoal(payload, ctx.userId),
  'goal/update': (payload, ctx) => repo.updateGoal(payload, ctx.userId),
  'goal/remove': (payload, ctx) => {
    const existing = ctx.prevState.goals.find((g) => g.id === payload.id);
    return repo.removeGoal(payload.id, existing, ctx.userId);
  },
  'goal/contribute': (payload) => repo.contributeToGoal(payload),

  'transaction/add': (payload) => repo.addTransaction(payload),
  'transaction/update': (payload) => repo.updateTransaction(payload),
  'transaction/remove': (payload) => repo.removeTransaction(payload.id),
  'transaction/assignCategory': (payload, ctx) => {
    const existing = ctx.prevState.transactions.find((t) => t.id === payload.id);
    const envelope = ctx.prevState.envelopes.find((env) => env.id === payload.categoryId);
    return repo.assignTransactionCategory(payload, existing, envelope, ctx.userId);
  },

  'income/add': (payload) => repo.addIncome(payload),
  'income/update': (payload) => repo.updateIncome(payload),
  'income/remove': (payload) => repo.removeIncome(payload.id),

  'transfer/add': (payload) => repo.addTransfer(payload),
  'transfer/update': (payload) => repo.updateTransfer(payload),
  'transfer/remove': (payload) => repo.removeTransfer(payload.id),
};

// Action types that create a new row and need a client-generated UUID
// injected before both the reducer and the sync effect see the action, so
// the optimistic local row and the database row share the same id.
export const ACTIONS_NEEDING_ID = new Set([
  'envelope/add',
  'transaction/add',
  'income/add',
  'account/add',
  'goal/add',
  'transfer/add',
]);
