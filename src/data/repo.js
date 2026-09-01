// The only place that knows the database's snake_case column names — every
// read/write here translates to/from the app's existing camelCase shape so
// nothing above this layer (reducer, components) has to change.
import { supabase } from './supabaseClient.js';
import { toISODateString } from '../utils/date.js';

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

function mapEnvelope(row) {
  return { id: row.id, name: row.name, monthlyBudget: Number(row.monthly_budget), group: row.group_name };
}
function mapAccount(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balance: Number(row.balance),
    currency: row.currency ?? 'PHP',
    ownerId: row.owner_id,
  };
}
function mapTransaction(row) {
  return {
    id: row.id,
    date: row.date,
    amount: Number(row.amount),
    note: row.note ?? '',
    categoryId: row.category_id,
    accountId: row.account_id,
    createdBy: row.created_by,
  };
}
function mapIncome(row) {
  return {
    id: row.id,
    date: row.date,
    source: row.source,
    amount: Number(row.amount),
    accountId: row.account_id,
    budgetMonthKey: row.budget_month_key,
    createdBy: row.created_by,
  };
}
function mapGoal(row) {
  return { id: row.id, name: row.name, target: Number(row.target), saved: Number(row.saved) };
}
function mapLedgerEntry(row) {
  return { id: row.id, date: row.date, domain: row.domain, type: row.type, name: row.name, amount: Number(row.amount) };
}
function mapProfile(row) {
  return { id: row.id, displayName: row.display_name, avatarUrl: row.avatar_url ?? null };
}

export async function fetchAll() {
  const [envelopes, accounts, transactions, income, goals, ledger, profiles] = await Promise.all([
    supabase.from('envelopes').select('*').then(unwrap),
    supabase.from('accounts').select('*').then(unwrap),
    supabase.from('transactions').select('*').then(unwrap),
    supabase.from('income').select('*').then(unwrap),
    supabase.from('goals').select('*').then(unwrap),
    supabase.from('ledger').select('*').order('created_at', { ascending: true }).then(unwrap),
    supabase.from('profiles').select('*').then(unwrap),
  ]);

  return {
    envelopes: envelopes.map(mapEnvelope),
    accounts: accounts.map(mapAccount),
    transactions: transactions.map(mapTransaction),
    income: income.map(mapIncome),
    goals: goals.map(mapGoal),
    ledger: ledger.map(mapLedgerEntry),
    profiles: profiles.map(mapProfile),
  };
}

function insertLedgerEntry({ date, domain, type, name, amount, userId }) {
  return supabase
    .from('ledger')
    .insert({ date: date ?? toISODateString(), domain, type, name, amount, created_by: userId })
    .then(unwrap);
}

export const repo = {
  // ---- Envelopes (plain CRUD, no balance math) ----
  async addEnvelope(payload, userId) {
    await supabase
      .from('envelopes')
      .insert({
        id: payload.id,
        name: payload.name,
        monthly_budget: payload.monthlyBudget,
        group_name: payload.group || payload.name,
        created_by: userId,
      })
      .then(unwrap);
    await insertLedgerEntry({
      date: null,
      domain: 'Envelope',
      type: 'Created',
      name: payload.name,
      amount: payload.monthlyBudget,
      userId,
    });
  },

  async updateEnvelope(payload, existing, userId) {
    await supabase
      .from('envelopes')
      .update({
        name: payload.name,
        monthly_budget: payload.monthlyBudget,
        group_name: payload.group,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.id)
      .then(unwrap);

    if (!existing) return;
    if (existing.name !== payload.name || existing.monthlyBudget !== payload.monthlyBudget) {
      await insertLedgerEntry({
        date: null,
        domain: 'Envelope',
        type: 'Budget updated',
        name: payload.name,
        amount: payload.monthlyBudget,
        userId,
      });
    }
    if (payload.group && existing.group !== payload.group) {
      await insertLedgerEntry({
        date: null,
        domain: 'Envelope',
        type: 'Moved to group',
        name: payload.name,
        amount: payload.monthlyBudget,
        userId,
      });
    }
  },

  async removeEnvelope(id, existing, userId) {
    await supabase.from('envelopes').delete().eq('id', id).then(unwrap);
    if (existing) {
      await insertLedgerEntry({
        date: null,
        domain: 'Envelope',
        type: 'Removed',
        name: existing.name,
        amount: existing.monthlyBudget,
        userId,
      });
    }
  },

  // ---- Accounts (plain CRUD; owner-only write enforced by RLS) ----
  async addAccount(payload, userId) {
    await supabase
      .from('accounts')
      .insert({
        id: payload.id,
        name: payload.name,
        type: payload.type,
        balance: payload.balance,
        currency: payload.currency ?? 'PHP',
        owner_id: userId,
      })
      .then(unwrap);
    await insertLedgerEntry({ date: null, domain: 'Account', type: 'Account added', name: payload.name, amount: payload.balance, userId });
  },

  async updateAccount(payload, userId) {
    await supabase
      .from('accounts')
      .update({
        name: payload.name,
        type: payload.type,
        balance: payload.balance,
        currency: payload.currency ?? 'PHP',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.id)
      .then(unwrap);
    await insertLedgerEntry({ date: null, domain: 'Account', type: 'Balance updated', name: payload.name, amount: payload.balance, userId });
  },

  async removeAccount(id, existing, userId) {
    await supabase.from('accounts').delete().eq('id', id).then(unwrap);
    if (existing) {
      await insertLedgerEntry({ date: null, domain: 'Account', type: 'Account removed', name: existing.name, amount: existing.balance, userId });
    }
  },

  // ---- Goals (add/remove are plain CRUD; contribute touches balances) ----
  async addGoal(payload, userId) {
    await supabase
      .from('goals')
      .insert({ id: payload.id, name: payload.name, target: payload.target, saved: payload.saved ?? 0, created_by: userId })
      .then(unwrap);
    await insertLedgerEntry({ date: null, domain: 'Goal', type: 'Created', name: payload.name, amount: payload.target, userId });
  },

  async updateGoal(payload, userId) {
    await supabase
      .from('goals')
      .update({ name: payload.name, target: payload.target })
      .eq('id', payload.id)
      .then(unwrap);
    await insertLedgerEntry({ date: null, domain: 'Goal', type: 'Target updated', name: payload.name, amount: payload.target, userId });
  },

  async removeGoal(id, existing, userId) {
    await supabase.from('goals').delete().eq('id', id).then(unwrap);
    if (existing) {
      await insertLedgerEntry({ date: null, domain: 'Goal', type: 'Removed', name: existing.name, amount: existing.saved, userId });
    }
  },

  contributeToGoal(payload) {
    return supabase
      .rpc('contribute_to_goal', {
        p_goal_id: payload.id,
        p_amount: payload.amount,
        p_account_id: payload.accountId ?? null,
        p_via: payload.via ?? 'manual',
      })
      .then(unwrap);
  },

  // ---- Transactions (compound: balance + ledger, always atomic via RPC) ----
  addTransaction(payload) {
    return supabase
      .rpc('add_transaction', {
        p_id: payload.id,
        p_date: payload.date,
        p_amount: payload.amount,
        p_note: payload.note || null,
        p_category_id: payload.categoryId ?? null,
        p_account_id: payload.accountId ?? null,
      })
      .then(unwrap);
  },

  updateTransaction(payload) {
    return supabase
      .rpc('update_transaction', {
        p_id: payload.id,
        p_date: payload.date,
        p_amount: payload.amount,
        p_note: payload.note || null,
        p_category_id: payload.categoryId ?? null,
        p_account_id: payload.accountId ?? null,
      })
      .then(unwrap);
  },

  removeTransaction(id) {
    return supabase.rpc('remove_transaction', { p_id: id }).then(unwrap);
  },

  async assignTransactionCategory(payload, existing, envelope, userId) {
    await supabase
      .from('transactions')
      .update({ category_id: payload.categoryId, updated_at: new Date().toISOString() })
      .eq('id', payload.id)
      .then(unwrap);
    if (existing && envelope) {
      await insertLedgerEntry({
        date: existing.date,
        domain: 'Expense',
        type: 'Filed to envelope',
        name: `${existing.note || 'Expense'} → ${envelope.name}`,
        amount: existing.amount,
        userId,
      });
    }
  },

  // ---- Income (compound: balance + ledger, always atomic via RPC) ----
  addIncome(payload) {
    return supabase
      .rpc('add_income', {
        p_id: payload.id,
        p_date: payload.date,
        p_source: payload.source,
        p_amount: payload.amount,
        p_account_id: payload.accountId ?? null,
        p_budget_month_key: payload.budgetMonthKey,
      })
      .then(unwrap);
  },

  updateIncome(payload) {
    return supabase
      .rpc('update_income', {
        p_id: payload.id,
        p_date: payload.date,
        p_source: payload.source,
        p_amount: payload.amount,
        p_account_id: payload.accountId ?? null,
        p_budget_month_key: payload.budgetMonthKey,
      })
      .then(unwrap);
  },

  removeIncome(id) {
    return supabase.rpc('remove_income', { p_id: id }).then(unwrap);
  },

  // ---- Profile avatar ----
  // Fixed per-user path means re-uploading replaces the old file (no orphaned
  // files); the cache-busting ?v= query param is what makes a re-upload
  // actually show up instead of serving a stale cached image.
  //
  // Explicitly remove-then-upload rather than upload(..., {upsert: true}):
  // Supabase's upsert does an INSERT ... ON CONFLICT DO UPDATE under the
  // hood, which Postgres evaluates against the INSERT policy's WITH CHECK
  // even when the row already exists and the update path is the one that'll
  // actually run — so a same-path re-upload was failing RLS entirely.
  // Deleting first keeps every step a plain, independently-correct insert.
  async uploadAvatar(userId, file) {
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const path = `${userId}/photo.${ext}`;
    await supabase.storage.from('avatars').remove([path]);
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId).then(unwrap);
    return avatarUrl;
  },

  // ---- Transfers (compound: two account balances + two ledger rows, atomic via RPC) ----
  transferFunds(payload) {
    return supabase
      .rpc('transfer_funds', {
        p_from_account_id: payload.fromAccountId,
        p_to_account_id: payload.toAccountId,
        p_from_amount: payload.fromAmount,
        p_to_amount: payload.toAmount,
        p_note: payload.note || null,
      })
      .then(unwrap);
  },
};
