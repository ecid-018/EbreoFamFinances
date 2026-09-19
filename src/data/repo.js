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
    archivedAt: row.archived_at ?? null,
    countsTowardFloor: row.counts_toward_floor ?? false,
    role: row.role ?? null,
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
  return {
    id: row.id,
    name: row.name,
    target: Number(row.target),
    saved: Number(row.saved),
    priority: row.priority ?? null,
    targetDate: row.target_date ?? null,
    heldInAccountId: row.held_in_account_id ?? null,
    isSinkingFund: row.is_sinking_fund ?? false,
    goalGroup: row.goal_group ?? null,
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at ?? null,
  };
}
function mapLedgerEntry(row) {
  return { id: row.id, date: row.date, domain: row.domain, type: row.type, name: row.name, amount: Number(row.amount) };
}
function mapTransfer(row) {
  return {
    id: row.id,
    date: row.date,
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id,
    fromAmount: Number(row.from_amount),
    toAmount: Number(row.to_amount),
    note: row.note ?? '',
    createdBy: row.created_by,
  };
}
function mapPlanSettings(row) {
  if (!row) return null;
  const n = (v) => (v == null ? null : Number(v));
  return {
    payHousehold: n(row.pay_household),
    payHub: n(row.pay_hub),
    splitVacationReserve: n(row.split_vacation_reserve),
    splitInsurance: n(row.split_insurance),
    splitGoals: n(row.split_goals),
    splitTrips: n(row.split_trips),
    splitRetirement: n(row.split_retirement),
    splitTrading: n(row.split_trading),
    bankFloorTarget: n(row.bank_floor_target),
    vacationReserveTarget: n(row.vacation_reserve_target),
    tradingCapAnnual: n(row.trading_cap_annual),
    tripsAnnual: n(row.trips_annual),
    insuranceAnnual: n(row.insurance_annual),
    windfallGoalsPct: row.windfall_goals_pct ?? null,
    presignoffActive: row.presignoff_active ?? false,
    presignoffVacationAmount: n(row.presignoff_vacation_amount),
    householdAccountId: row.household_account_id ?? null,
    hubAccountId: row.hub_account_id ?? null,
    tradingAccountId: row.trading_account_id ?? null,
    retirementAccountId: row.retirement_account_id ?? null,
    vacationGoalId: row.vacation_goal_id ?? null,
    insuranceGoalId: row.insurance_goal_id ?? null,
    tripsGoalId: row.trips_goal_id ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function mapProfile(row) {
  return { id: row.id, displayName: row.display_name, avatarUrl: row.avatar_url ?? null };
}

// plan_settings is fetched tolerantly: if the table is not there yet, the
// app must still load. Every other table has existed since the first release,
// but this one arrives with a migration the household applies by hand, and
// a missing table should degrade the Plan section rather than break the
// whole app on startup.
function fetchPlanSettings() {
  return supabase
    .from('plan_settings')
    .select('*')
    .then(({ data, error }) => {
      if (error) {
        console.warn('plan_settings unavailable (migration not applied yet?):', error.message);
        return null;
      }
      return mapPlanSettings(data?.[0] ?? null);
    });
}

export async function fetchAll() {
  const [envelopes, accounts, transactions, income, goals, ledger, profiles, transfers, planSettings] =
    await Promise.all([
    supabase.from('envelopes').select('*').then(unwrap),
    supabase.from('accounts').select('*').then(unwrap),
    supabase.from('transactions').select('*').then(unwrap),
    supabase.from('income').select('*').then(unwrap),
    supabase.from('goals').select('*').then(unwrap),
    supabase.from('ledger').select('*').order('created_at', { ascending: true }).then(unwrap),
    supabase.from('profiles').select('*').then(unwrap),
    supabase.from('transfers').select('*').then(unwrap),
    fetchPlanSettings(),
  ]);

  return {
    envelopes: envelopes.map(mapEnvelope),
    accounts: accounts.map(mapAccount),
    transactions: transactions.map(mapTransaction),
    income: income.map(mapIncome),
    goals: goals.map(mapGoal),
    ledger: ledger.map(mapLedgerEntry),
    profiles: profiles.map(mapProfile),
    transfers: transfers.map(mapTransfer),
    planSettings,
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
        counts_toward_floor: payload.countsTowardFloor ?? false,
        role: payload.role ?? null,
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
        counts_toward_floor: payload.countsTowardFloor ?? false,
        role: payload.role ?? null,
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

  // Archiving is the fallback when an account can't be deleted: transfers
  // reference it with a NOT NULL foreign key and no ON DELETE action, so a
  // delete would fail outright. Plain CRUD — no balance math, so no RPC.
  async archiveAccount(id, existing, userId) {
    const now = new Date().toISOString();
    await supabase
      .from('accounts')
      .update({ archived_at: now, updated_at: now })
      .eq('id', id)
      .then(unwrap);
    if (existing) {
      await insertLedgerEntry({ date: null, domain: 'Account', type: 'Account archived', name: existing.name, amount: existing.balance, userId });
    }
  },

  async unarchiveAccount(id, existing, userId) {
    await supabase
      .from('accounts')
      .update({ archived_at: null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .then(unwrap);
    if (existing) {
      await insertLedgerEntry({ date: null, domain: 'Account', type: 'Account restored', name: existing.name, amount: existing.balance, userId });
    }
  },

  // ---- Goals (add/remove are plain CRUD; contribute touches balances) ----
  async addGoal(payload, userId) {
    await supabase
      .from('goals')
      .insert({
        id: payload.id,
        name: payload.name,
        target: payload.target,
        saved: payload.saved ?? 0,
        priority: payload.priority ?? null,
        target_date: payload.targetDate || null,
        held_in_account_id: payload.heldInAccountId || null,
        is_sinking_fund: payload.isSinkingFund ?? false,
        goal_group: payload.goalGroup || null,
        created_by: userId,
      })
      .then(unwrap);
    await insertLedgerEntry({ date: null, domain: 'Goal', type: 'Created', name: payload.name, amount: payload.target, userId });
  },

  async updateGoal(payload, userId) {
    await supabase
      .from('goals')
      .update({
        name: payload.name,
        target: payload.target,
        priority: payload.priority ?? null,
        target_date: payload.targetDate || null,
        held_in_account_id: payload.heldInAccountId || null,
        is_sinking_fund: payload.isSinkingFund ?? false,
        goal_group: payload.goalGroup || null,
        updated_at: new Date().toISOString(),
      })
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

  // Spending a sinking fund. Deliberately does NOT move an account balance:
  // the expense or transfer that spent the money already did.
  withdrawFromGoal(payload) {
    return supabase
      .rpc('withdraw_from_goal', {
        p_goal_id: payload.id,
        p_amount: payload.amount,
        p_note: payload.note || null,
      })
      .then(unwrap);
  },

  async archiveGoal(id, existing, userId) {
    await supabase
      .from('goals')
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .then(unwrap);
    if (existing) {
      await insertLedgerEntry({ date: null, domain: 'Goal', type: 'Goal archived', name: existing.name, amount: existing.saved, userId });
    }
  },

  async unarchiveGoal(id, existing, userId) {
    await supabase
      .from('goals')
      .update({ archived_at: null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .then(unwrap);
    if (existing) {
      await insertLedgerEntry({ date: null, domain: 'Goal', type: 'Goal restored', name: existing.name, amount: existing.saved, userId });
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

  // ---- Plan settings (a single shared row; update only, never insert) ----
  async updatePlanSettings(payload, userId) {
    await supabase
      .from('plan_settings')
      .update({
        pay_household: payload.payHousehold,
        pay_hub: payload.payHub,
        split_vacation_reserve: payload.splitVacationReserve,
        split_insurance: payload.splitInsurance,
        split_goals: payload.splitGoals,
        split_trips: payload.splitTrips,
        split_retirement: payload.splitRetirement,
        split_trading: payload.splitTrading,
        bank_floor_target: payload.bankFloorTarget,
        vacation_reserve_target: payload.vacationReserveTarget,
        trading_cap_annual: payload.tradingCapAnnual,
        trips_annual: payload.tripsAnnual,
        insurance_annual: payload.insuranceAnnual,
        windfall_goals_pct: payload.windfallGoalsPct,
        presignoff_active: payload.presignoffActive ?? false,
        presignoff_vacation_amount: payload.presignoffVacationAmount,
        household_account_id: payload.householdAccountId || null,
        hub_account_id: payload.hubAccountId || null,
        trading_account_id: payload.tradingAccountId || null,
        retirement_account_id: payload.retirementAccountId || null,
        vacation_goal_id: payload.vacationGoalId || null,
        insurance_goal_id: payload.insuranceGoalId || null,
        trips_goal_id: payload.tripsGoalId || null,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', true)
      .then(unwrap);
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
  addTransfer(payload) {
    return supabase
      .rpc('add_transfer', {
        p_id: payload.id,
        p_date: payload.date,
        p_from_account_id: payload.fromAccountId,
        p_to_account_id: payload.toAccountId,
        p_from_amount: payload.fromAmount,
        p_to_amount: payload.toAmount,
        p_note: payload.note || null,
      })
      .then(unwrap);
  },

  updateTransfer(payload) {
    return supabase
      .rpc('update_transfer', {
        p_id: payload.id,
        p_date: payload.date,
        p_from_account_id: payload.fromAccountId,
        p_to_account_id: payload.toAccountId,
        p_from_amount: payload.fromAmount,
        p_to_amount: payload.toAmount,
        p_note: payload.note || null,
      })
      .then(unwrap);
  },

  removeTransfer(id) {
    return supabase.rpc('remove_transfer', { p_id: id }).then(unwrap);
  },
};
