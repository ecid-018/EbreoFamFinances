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
function mapEnvelopeBudget(row) {
  return {
    id: row.id,
    envelopeId: row.envelope_id,
    monthKey: row.month_key,
    amount: Number(row.amount),
  };
}
function mapMonthMode(row) {
  return { monthKey: row.month_key, mode: row.mode };
}
function mapPayday(row) {
  return {
    id: row.id,
    date: row.date,
    budgetMonthKey: row.budget_month_key,
    total: Number(row.total),
    kind: row.kind,
  };
}
function mapPaydayAllocation(row) {
  return {
    id: row.id,
    paydayId: row.payday_id,
    kind: row.kind,
    incomeId: row.income_id,
    transferId: row.transfer_id,
    goalId: row.goal_id,
    amount: Number(row.amount),
    label: row.label,
  };
}
function mapBill(row) {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    period: row.period,
    dueDay: row.due_day ?? null,
    nextDue: row.next_due ?? null,
    accountId: row.account_id ?? null,
    envelopeId: row.envelope_id ?? null,
    goalId: row.goal_id ?? null,
    isActive: row.is_active ?? true,
    // Defaults match 0014's column defaults, so a row fetched before the
    // migration lands reads as the bill it already was.
    kind: row.kind ?? 'bill',
    remindDays: row.remind_days ?? [7, 1, 0],
    notes: row.notes ?? '',
  };
}
function mapChecklist(row) {
  return {
    id: row.id,
    incomeId: row.income_id,
    incomeKind: row.income_kind,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? null,
  };
}
function mapChecklistItem(row) {
  return {
    id: row.id,
    checklistId: row.checklist_id,
    fromAccountId: row.from_account_id ?? null,
    toAccountId: row.to_account_id ?? null,
    goalId: row.goal_id ?? null,
    amount: Number(row.amount),
    reason: row.reason,
    status: row.status,
    skipReason: row.skip_reason ?? null,
    transferId: row.transfer_id ?? null,
  };
}
function mapSplitLineSource(row) {
  return { lineKey: row.line_key, accountId: row.account_id };
}
function mapMonthSnapshot(row) {
  return {
    monthKey: row.month_key,
    takenOn: row.taken_on,
    totalPhp: Number(row.total_php),
    totalUsd: Number(row.total_usd),
    usdPhpRate: row.usd_php_rate == null ? null : Number(row.usd_php_rate),
    bankTotal: Number(row.bank_total ?? 0),
    cooperativeTotal: Number(row.cooperative_total ?? 0),
    ewalletTotal: Number(row.ewallet_total ?? 0),
    cashTotal: Number(row.cash_total ?? 0),
    receivableTotal: Number(row.receivable_total ?? 0),
    goalsSavedTotal: Number(row.goals_saved_total ?? 0),
  };
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
    billId: row.bill_id ?? null,
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
    // undefined, not null, when the 0011 column is not there yet: the write
    // path below uses its presence to decide whether to send the column at
    // all. A deploy can land before the migration is applied, and an update
    // naming a column that does not exist fails the WHOLE save.
    targetAshoreYear: 'target_ashore_year' in row ? (row.target_ashore_year ?? null) : undefined,
    // Same tolerance as target_ashore_year, for the same reason: undefined
    // means the 0015 column is not there yet, so the write omits it.
    carGoalId: 'car_goal_id' in row ? (row.car_goal_id ?? null) : undefined,
    tradingTaxAccountId: 'trading_tax_account_id' in row ? (row.trading_tax_account_id ?? null) : undefined,
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

// Month-scoped budgets (0005). Tolerated as missing for the same reason
// fetchPlanSettings is: a deploy can land before the migration is applied.
// With no rows every envelope resolves to its base figure, which is exactly
// how the app behaved before this phase — so a missing table is degraded, not
// broken.
function fetchEnvelopeBudgets() {
  return supabase
    .from('envelope_budgets')
    .select('*')
    .then(({ data, error }) => {
      if (error) {
        console.warn('envelope_budgets unavailable (migration not applied yet?):', error.message);
        return [];
      }
      return (data ?? []).map(mapEnvelopeBudget);
    });
}

// Tolerated as missing for the same reason plan_settings and envelope_budgets
// are: a deploy can land before the migration is applied. With no rows every
// month is a sea month, which is exactly the pre-phase behaviour.
// Tolerated as missing, like every table added since 0004: a deploy can land
// before the migration is applied. With no snapshots the recorder simply has
// nothing to show and nothing to compare against.
function fetchMonthSnapshots() {
  return supabase
    .from('month_snapshots')
    .select('*')
    .then(({ data, error }) => {
      if (error) {
        console.warn('month_snapshots unavailable (migration not applied yet?):', error.message);
        return [];
      }
      return (data ?? []).map(mapMonthSnapshot);
    });
}

// Bills (0012). Tolerated as missing for the same reason every table since
// 0004 is: Vercel deploys on push and the migration is applied by hand
// afterwards, so a deploy can land first. With no table there are simply no
// bills, which is exactly how the app behaved before this phase.
function fetchBills() {
  return supabase
    .from('bills')
    .select('*')
    .then(({ data, error }) => {
      if (error) {
        console.warn('bills unavailable (migration not applied yet?):', error.message);
        return [];
      }
      return (data ?? []).map(mapBill);
    });
}

// Transfer checklists (0015). Tolerated as missing like every table added
// since 0004: with none, no checklist card appears and the app is exactly as
// it was before this phase.
function fetchChecklists() {
  return Promise.all([
    supabase.from('transfer_checklists').select('*'),
    supabase.from('transfer_checklist_items').select('*'),
  ]).then(([lists, items]) => {
    if (lists.error || items.error) {
      console.warn('transfer_checklists unavailable (migration not applied yet?):',
        (lists.error ?? items.error).message);
      return { checklists: [], checklistItems: [] };
    }
    return {
      checklists: (lists.data ?? []).map(mapChecklist),
      checklistItems: (items.data ?? []).map(mapChecklistItem),
    };
  });
}

function fetchSplitLineSources() {
  return supabase
    .from('split_line_sources')
    .select('*')
    .then(({ data, error }) => {
      if (error) {
        console.warn('split_line_sources unavailable (migration not applied yet?):', error.message);
        return [];
      }
      return (data ?? []).map(mapSplitLineSource);
    });
}

function fetchMonthModes() {
  return supabase
    .from('month_modes')
    .select('*')
    .then(({ data, error }) => {
      if (error) {
        console.warn('month_modes unavailable (migration not applied yet?):', error.message);
        return [];
      }
      return (data ?? []).map(mapMonthMode);
    });
}

// Tolerated as missing, like every table added since 0004: a deploy can land
// before the migration is applied, and with no paydays the zero-based check
// subtracts nothing, which is exactly the pre-phase behaviour.
function fetchPaydayData() {
  return Promise.all([
    supabase.from('paydays').select('*').then(({ data, error }) => (error ? null : data ?? [])),
    supabase.from('payday_allocations').select('*').then(({ data, error }) => (error ? null : data ?? [])),
  ]).then(([paydays, allocations]) => {
    if (paydays === null || allocations === null) {
      console.warn('paydays unavailable (migration not applied yet?)');
      return { paydays: [], paydayAllocations: [] };
    }
    return {
      paydays: paydays.map(mapPayday),
      paydayAllocations: allocations.map(mapPaydayAllocation),
    };
  });
}

export async function fetchAll() {
  const [envelopes, accounts, transactions, income, goals, ledger, profiles, transfers, planSettings, envelopeBudgets, monthModes, paydayData, splitLineSources, monthSnapshots, bills, checklistData] =
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
    fetchEnvelopeBudgets(),
    fetchMonthModes(),
    fetchPaydayData(),
    fetchSplitLineSources(),
    fetchMonthSnapshots(),
    fetchBills(),
    fetchChecklists(),
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
    envelopeBudgets,
    monthModes,
    ...paydayData,
    splitLineSources,
    monthSnapshots,
    bills,
    ...checklistData,
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

  // Sets one envelope's budget for one month. Upserts on (envelope_id,
  // month_key) so editing the same month twice replaces the row rather than
  // accumulating duplicates — the unique constraint makes that atomic.
  //
  // envelopes.monthly_budget is deliberately NOT touched: it stays the base
  // that months without a row of their own resolve to.
  async setEnvelopeMonthBudget(payload, userId) {
    await supabase
      .from('envelope_budgets')
      .upsert(
        {
          envelope_id: payload.envelopeId,
          month_key: payload.monthKey,
          amount: payload.amount,
          created_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'envelope_id,month_key' }
      )
      .then(unwrap);

    await insertLedgerEntry({
      date: null,
      domain: 'Envelope',
      type: 'Budget set for month',
      // The month belongs in the entry: without it the log cannot tell a
      // September change from an October one.
      name: `${payload.name} (${payload.monthKey})`,
      amount: payload.amount,
      userId,
    });
  },

  // Tags one month as sea or vacation. Upserts on the primary key so flipping
  // the same month twice replaces the row rather than failing.
  // One call, one transaction. Every income row, transfer and goal
  // contribution the payday implies is written by apply_payday calling the
  // same functions the rest of the app calls — there is no second copy of the
  // balance math here, and a failure anywhere rolls the whole payday back.
  // Records what the household holds right now under the given month. Every
  // figure is computed inside the RPC from current balances, so a snapshot can
  // never disagree with the database; only the USD display rate is passed in,
  // because the database has no way to know it.
  // ---- Bills ----
  // Plain CRUD: creating or editing a bill moves no money. Paying one does,
  // and that goes through the RPC below.
  async addBill(payload, userId) {
    await supabase
      .from('bills')
      .insert({
        id: payload.id,
        name: payload.name,
        amount: payload.amount,
        period: payload.period,
        due_day: payload.dueDay ?? null,
        next_due: payload.nextDue ?? null,
        account_id: payload.accountId || null,
        envelope_id: payload.envelopeId || null,
        goal_id: payload.goalId || null,
        is_active: payload.isActive ?? true,
        // Sent only once 0014 has landed. An update naming a column that does
        // not exist fails the WHOLE statement, so a deploy arriving before the
        // migration must not break saving a plain bill.
        ...(payload.kind === undefined ? {} : { kind: payload.kind }),
        ...(payload.notes === undefined ? {} : { notes: payload.notes }),
        created_by: userId,
      })
      .then(unwrap);
    await insertLedgerEntry({
      date: null,
      domain: 'Bill',
      type: 'Bill added',
      name: payload.name,
      amount: payload.amount,
      userId,
    });
  },

  async updateBill(payload, userId) {
    await supabase
      .from('bills')
      .update({
        name: payload.name,
        amount: payload.amount,
        period: payload.period,
        due_day: payload.dueDay ?? null,
        next_due: payload.nextDue ?? null,
        account_id: payload.accountId || null,
        envelope_id: payload.envelopeId || null,
        goal_id: payload.goalId || null,
        is_active: payload.isActive ?? true,
        // Sent only once 0014 has landed. An update naming a column that does
        // not exist fails the WHOLE statement, so a deploy arriving before the
        // migration must not break saving a plain bill.
        ...(payload.kind === undefined ? {} : { kind: payload.kind }),
        ...(payload.notes === undefined ? {} : { notes: payload.notes }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.id)
      .then(unwrap);
    await insertLedgerEntry({
      date: null,
      domain: 'Bill',
      type: 'Bill updated',
      name: payload.name,
      amount: payload.amount,
      userId,
    });
  },

  async removeBill(payload, existing, userId) {
    await supabase.from('bills').delete().eq('id', payload.id).then(unwrap);
    if (existing) {
      await insertLedgerEntry({
        date: null,
        domain: 'Bill',
        type: 'Bill removed',
        name: existing.name,
        amount: existing.amount,
        userId,
      });
    }
  },

  // The expense, the bill's next due date and the sinking fund all move
  // together or not at all. The client does not do any of the three itself.
  async payBill(payload) {
    await supabase
      .rpc('pay_bill', {
        p_bill_id: payload.billId,
        p_transaction_id: payload.transactionId,
        p_date: payload.date,
        p_amount: payload.amount,
        p_note: payload.note ?? '',
        p_envelope_id: payload.categoryId || null,
        p_account_id: payload.accountId || null,
      })
      .then(unwrap);
  },

  // Marks an expected payment received or a task done. The date arithmetic
  // lives in SQL so that paying a bill, receiving money and finishing a job
  // all move a date the same way.
  async completeScheduleItem(payload) {
    await supabase.rpc('complete_schedule_item', { p_bill_id: payload.id }).then(unwrap);
  },

  // ---- Transfer checklists ----
  // NOTHING HERE MOVES MONEY. A checklist records what the plan suggested and
  // what happened to each suggestion; the transfers themselves are made by the
  // household through the existing transfer RPC.
  async createChecklist(payload, userId) {
    await supabase
      .from('transfer_checklists')
      .insert({ id: payload.id, income_id: payload.incomeId, income_kind: payload.incomeKind, created_by: userId })
      .then(unwrap);
    if (payload.items?.length) {
      await supabase
        .from('transfer_checklist_items')
        .insert(
          payload.items.map((i) => ({
            checklist_id: payload.id,
            from_account_id: i.fromAccountId,
            to_account_id: i.toAccountId,
            goal_id: i.goalId,
            amount: i.amount,
            reason: i.reason,
          }))
        )
        .then(unwrap);
    }
  },

  async updateChecklistItem(payload) {
    await supabase
      .from('transfer_checklist_items')
      .update({ status: payload.status, skip_reason: payload.skipReason ?? null, transfer_id: payload.transferId ?? null })
      .eq('id', payload.id)
      .then(unwrap);
  },

  async closeChecklist(payload) {
    await supabase
      .from('transfer_checklists')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', payload.id)
      .then(unwrap);
  },

  async takeMonthSnapshot(payload) {
    await supabase
      .rpc('take_month_snapshot', { p_month_key: payload.monthKey, p_usd_php_rate: payload.usdPhpRate ?? null })
      .then(unwrap);
  },

  async applyPayday(payload) {
    await supabase.rpc('apply_payday', { p_payday: payload }).then(unwrap);
  },

  async setMonthMode(payload, userId) {
    await supabase
      .from('month_modes')
      .upsert(
        {
          month_key: payload.monthKey,
          mode: payload.mode,
          created_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'month_key' }
      )
      .then(unwrap);

    await insertLedgerEntry({
      date: null,
      domain: 'Month',
      type: 'Mode set',
      name: `${payload.monthKey} — ${payload.mode}`,
      amount: 0,
      userId,
    });
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
        // Sent only once the column exists, so that saving pay, splits and
        // targets keeps working in the window between deploy and migration.
        // Null still round-trips once it does, so a year can be cleared.
        ...(payload.targetAshoreYear === undefined ? {} : { target_ashore_year: payload.targetAshoreYear }),
        ...(payload.carGoalId === undefined ? {} : { car_goal_id: payload.carGoalId || null }),
        ...(payload.tradingTaxAccountId === undefined
          ? {}
          : { trading_tax_account_id: payload.tradingTaxAccountId || null }),
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
