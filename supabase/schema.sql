-- ============================================================================
-- STOP. FRESH, EMPTY PROJECTS ONLY.
-- This is the CURRENT snapshot of the whole schema. Running it against a
-- project that already has data fails on the first `create table`. To change
-- an existing project, use a numbered file in supabase/migrations/ instead.
-- Check the project badge in the top bar before you run anything.
-- ============================================================================
-- Ebreo Family Finances — Supabase schema, security policies, and atomic
-- compound-action functions.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- Safe to run once against a fresh project. Do this BEFORE creating the two
-- auth users, since the atomic functions below reference auth.uid().

-- =========================================================================
-- 1. TABLES
-- =========================================================================
-- `group` is a reserved SQL word, so the column is `group_name` (the app's
-- data layer maps this back to `group` — nothing else needs to know).
-- UUID primary keys (gen_random_uuid() is built into Postgres 13+, no
-- extension needed) replace the old app's client-generated string IDs.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table envelopes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  monthly_budget numeric(12,2) not null,
  group_name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('bank','ewallet','cash','cooperative','receivable')),
  balance numeric(12,2) not null default 0,
  currency text not null default 'PHP' check (currency in ('PHP','USD')),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Set instead of deleting when an account has transfers/transactions/income
  -- referencing it (transfers' FKs have no ON DELETE action, deliberately).
  -- NULL = active. See supabase/migrations/0001_account_archiving.sql.
  archived_at timestamptz,
  -- Which accounts make up the household's bank floor. Defaults false so the
  -- floor counts only what is explicitly tagged.
  counts_toward_floor boolean not null default false,
  -- Labelling used by the Plan phases. Nullable.
  role text check (role in ('household','daily','floor','hub','goals','trading','spare'))
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  amount numeric(12,2) not null,
  note text,
  category_id uuid references envelopes(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table income (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  source text not null,
  amount numeric(12,2) not null,
  account_id uuid references accounts(id) on delete set null,
  budget_month_key text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Classifies income logged through a payday (0007). Nullable: every row
  -- that predates paydays stays null and behaves exactly as it did.
  kind text check (kind in ('pay', 'windfall', 'signoff', 'trading_payout', 'other'))
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target numeric(12,2) not null,
  saved numeric(12,2) not null default 0,
  -- Plan fields (0003). All nullable/defaulted: a goal created before these
  -- existed behaves exactly as it always did.
  priority integer,                -- lower sorts first; null sorts last
  target_date date,
  held_in_account_id uuid references accounts(id) on delete set null,
  is_sinking_fund boolean not null default false,
  goal_group text,                 -- rollup label for one fund split across accounts
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ledger (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  domain text not null,
  type text not null,
  name text not null,
  amount numeric(12,2) not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table transfers (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  from_account_id uuid not null references accounts(id),
  to_account_id uuid not null references accounts(id),
  from_amount numeric(12,2) not null,
  to_amount numeric(12,2) not null,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Month-scoped envelope budgets (0005). SPARSE: a month only gets rows when
-- its budget differs from what came before. envelopes.monthly_budget is the
-- base and is never rewritten, so months recorded before this table existed
-- keep resolving to the figures they always had. Resolution order is: the row
-- for the viewed month -> else the newest row for an earlier month -> else
-- envelopes.monthly_budget. month_key is 'YYYY-MM' text, which sorts
-- chronologically under plain string comparison.
create table envelope_budgets (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references envelopes(id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  amount numeric(12,2) not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (envelope_id, month_key)
);

-- Sea or vacation, per month (0006). A month with no row is 'sea'. This does
-- NOT change what an envelope's budget IS -- 0005 made budgets month-scoped --
-- only what the zero-based check measures them against: income in a paid month,
-- the vacation reserve's saved amount in a month at home. The spec's
-- envelopes.vacation_budget column is deliberately not here; it would be a
-- second way of saying what envelope_budgets already says.
create table month_modes (
  month_key text primary key check (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  mode text not null check (mode in ('sea', 'vacation')),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- One shared row of household plan figures (0004). `id boolean primary key
-- default true check (id)` is a singleton guard: only one row can ever exist.
-- Every amount is nullable — null means "not decided yet", which must never
-- be shown or treated as zero. No real figures live in this repo; the
-- household enters them in Settings and they stay in the database.
create table plan_settings (
  id boolean primary key default true check (id),
  pay_household numeric(12,2),
  pay_hub numeric(12,2),
  split_vacation_reserve numeric(12,2),
  split_insurance numeric(12,2),
  split_goals numeric(12,2),
  split_trips numeric(12,2),
  split_retirement numeric(12,2),
  split_trading numeric(12,2),
  bank_floor_target numeric(12,2),
  vacation_reserve_target numeric(12,2),
  trading_cap_annual numeric(12,2),
  trips_annual numeric(12,2),
  insurance_annual numeric(12,2),
  windfall_goals_pct integer check (windfall_goals_pct between 0 and 100),
  presignoff_active boolean not null default false,
  presignoff_vacation_amount numeric(12,2),
  household_account_id uuid references accounts(id) on delete set null,
  hub_account_id uuid references accounts(id) on delete set null,
  trading_account_id uuid references accounts(id) on delete set null,
  retirement_account_id uuid references accounts(id) on delete set null,
  vacation_goal_id uuid references goals(id) on delete set null,
  insurance_goal_id uuid references goals(id) on delete set null,
  trips_goal_id uuid references goals(id) on delete set null,
  -- The year the household plans to be ashore for good (0011). Null means no
  -- date set, which the Plan view's countdown renders as nothing rather than
  -- as a year nobody chose.
  target_ashore_year integer
    check (target_ashore_year is null or target_ashore_year between 2000 and 2100),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into plan_settings (id) values (true) on conflict do nothing;

-- What the household was worth at the end of each closed month (0010).
-- Balances are STORED, not derived from transactions, so a month that has
-- ended cannot be reconstructed afterwards. Recorded automatically on the
-- first app open of a new month; every month missed is lost for good.
create table month_snapshots (
  month_key text primary key check (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  taken_on date not null,
  total_php numeric(14,2) not null,
  total_usd numeric(14,2) not null default 0,
  -- The display rate at the time, passed in by the app. The database has no
  -- way to know it: the rate is fetched client-side and cached for 12h, and
  -- there is no guarantee one was available at all.
  usd_php_rate numeric(10,4),
  bank_total numeric(14,2),
  cooperative_total numeric(14,2),
  ewallet_total numeric(14,2),
  cash_total numeric(14,2),
  receivable_total numeric(14,2),
  goals_saved_total numeric(14,2),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Bills and subscriptions (0012). A bill is a REMINDER PLUS A PREFILLED FORM:
-- nothing here pays anything on a schedule.
create table bills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(12,2) not null,
  period text not null check (period in ('monthly','quarterly','semiannual','annual')),
  -- Kept alongside next_due so a bill due on the 31st returns to the 31st
  -- after a month that has only 30 days, instead of drifting earlier for good.
  due_day integer check (due_day between 1 and 31),
  next_due date,
  account_id uuid references accounts(id) on delete set null,
  envelope_id uuid references envelopes(id) on delete set null,
  -- The sinking fund that pays it, if any.
  goal_id uuid references goals(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Which bill an expense paid, if any. Added by ALTER rather than declared
-- inside transactions because bills references goals, which is created after
-- transactions -- the FK can only be attached once both tables exist.
alter table transactions add column bill_id uuid references bills(id) on delete set null;

create index bills_next_due_idx on bills (next_due) where is_active;
create index transactions_bill_id_idx on transactions (bill_id);

-- Which account each split line is paid from (0008). SPARSE: a line with no
-- row is paid from plan_settings.hub_account_id, so an empty table behaves
-- exactly as before this existed. It exists because the allotment lands mostly
-- in the household account, and the goals it funds are held there too -- paying
-- them from the hub would ship money between the two BPI accounts and straight
-- back out again.
create table split_line_sources (
  line_key text primary key check (line_key in (
    'splitGoals', 'splitRetirement', 'splitTrading',
    'splitInsurance', 'splitTrips', 'splitVacationReserve'
  )),
  account_id uuid references accounts(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- A payday (0007): one event that fans out into income, transfers out of the
-- hub, and goal allocations that stay in it. `id` is client-generated, which
-- is what makes apply_payday idempotent on a retry.
create table paydays (
  id uuid primary key,
  date date not null,
  budget_month_key text not null check (budget_month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  total numeric(12,2) not null,
  -- 'signoff' is the leave pay received when a contract ends (0013).
  kind text not null default 'pay' check (kind in ('pay', 'windfall', 'signoff')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table payday_allocations (
  id uuid primary key default gen_random_uuid(),
  payday_id uuid not null references paydays(id) on delete cascade,
  kind text not null check (kind in ('income', 'transfer', 'goal')),
  -- All three are `on delete set null`: deleting the income or transfer later
  -- must not delete the record that a payday happened.
  income_id uuid references income(id) on delete set null,
  transfer_id uuid references transfers(id) on delete set null,
  goal_id uuid references goals(id) on delete set null,
  amount numeric(12,2) not null,
  label text
);

create index on transactions (category_id);
create index on transactions (account_id);
create index on transactions (date);
create index on income (account_id);
create index on income (budget_month_key);
create index on accounts (owner_id);
create index on ledger (date);
create index on transfers (from_account_id);
create index on transfers (to_account_id);
-- Serves the resolver's "rows for this envelope at or before month X,
-- newest first" lookup.
create index on envelope_budgets (envelope_id, month_key desc);
create index on payday_allocations (payday_id);
create index on paydays (budget_month_key);

-- =========================================================================
-- 2. ROW LEVEL SECURITY
-- =========================================================================
-- Every policy is scoped `to authenticated` — nothing is granted to `anon`,
-- so there is no public/anonymous access path to any table at all.

alter table profiles enable row level security;
alter table envelopes enable row level security;
alter table transactions enable row level security;
alter table income enable row level security;
alter table accounts enable row level security;
alter table goals enable row level security;
alter table ledger enable row level security;
alter table transfers enable row level security;
alter table envelope_budgets enable row level security;
alter table month_snapshots enable row level security;
alter table split_line_sources enable row level security;
alter table paydays enable row level security;
alter table payday_allocations enable row level security;
alter table month_modes enable row level security;
alter table plan_settings enable row level security;

create policy "profiles_select" on profiles for select to authenticated using (true);
create policy "profiles_update_own" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Shared tables: full read/write for either user. INSERT must attribute
-- truthfully to whoever is actually signed in (identity integrity), but
-- UPDATE/DELETE are NOT restricted by created_by — either user can edit or
-- delete either user's entries, matching "fully common" household data.

create policy "envelopes_select" on envelopes for select to authenticated using (true);
create policy "envelopes_insert" on envelopes for insert to authenticated with check (created_by = auth.uid());
create policy "envelopes_update" on envelopes for update to authenticated using (true) with check (true);
create policy "envelopes_delete" on envelopes for delete to authenticated using (true);

create policy "envelope_budgets_select" on envelope_budgets for select to authenticated using (true);
create policy "envelope_budgets_insert" on envelope_budgets for insert to authenticated with check (created_by = auth.uid());
create policy "envelope_budgets_update" on envelope_budgets for update to authenticated using (true) with check (true);
create policy "envelope_budgets_delete" on envelope_budgets for delete to authenticated using (true);

create policy "month_snapshots_select" on month_snapshots for select to authenticated using (true);
create policy "month_snapshots_insert" on month_snapshots for insert to authenticated with check (created_by = auth.uid());
create policy "month_snapshots_update" on month_snapshots for update to authenticated using (true) with check (true);
create policy "month_snapshots_delete" on month_snapshots for delete to authenticated using (true);

create policy "split_line_sources_select" on split_line_sources for select to authenticated using (true);
create policy "split_line_sources_insert" on split_line_sources for insert to authenticated with check (created_by = auth.uid());
create policy "split_line_sources_update" on split_line_sources for update to authenticated using (true) with check (true);
create policy "split_line_sources_delete" on split_line_sources for delete to authenticated using (true);

create policy "paydays_select" on paydays for select to authenticated using (true);
create policy "paydays_insert" on paydays for insert to authenticated with check (created_by = auth.uid());
create policy "paydays_update" on paydays for update to authenticated using (true) with check (true);
create policy "paydays_delete" on paydays for delete to authenticated using (true);

create policy "payday_allocations_select" on payday_allocations for select to authenticated using (true);
create policy "payday_allocations_insert" on payday_allocations for insert to authenticated with check (true);
create policy "payday_allocations_update" on payday_allocations for update to authenticated using (true) with check (true);
create policy "payday_allocations_delete" on payday_allocations for delete to authenticated using (true);

create policy "month_modes_select" on month_modes for select to authenticated using (true);
create policy "month_modes_insert" on month_modes for insert to authenticated with check (created_by = auth.uid());
create policy "month_modes_update" on month_modes for update to authenticated using (true) with check (true);
create policy "month_modes_delete" on month_modes for delete to authenticated using (true);

-- plan_settings is the single shared row; there is deliberately no insert or
-- delete policy, so RLS denies both and the singleton cannot be duplicated or
-- removed by the app.
create policy "plan_settings_select" on plan_settings for select to authenticated using (true);
create policy "plan_settings_update" on plan_settings for update to authenticated using (true) with check (true);

create policy "transactions_select" on transactions for select to authenticated using (true);
create policy "transactions_insert" on transactions for insert to authenticated with check (created_by = auth.uid());
create policy "transactions_update" on transactions for update to authenticated using (true) with check (true);
create policy "transactions_delete" on transactions for delete to authenticated using (true);

create policy "income_select" on income for select to authenticated using (true);
create policy "income_insert" on income for insert to authenticated with check (created_by = auth.uid());
create policy "income_update" on income for update to authenticated using (true) with check (true);
create policy "income_delete" on income for delete to authenticated using (true);

create policy "goals_select" on goals for select to authenticated using (true);
create policy "goals_insert" on goals for insert to authenticated with check (created_by = auth.uid());
create policy "goals_update" on goals for update to authenticated using (true) with check (true);
create policy "goals_delete" on goals for delete to authenticated using (true);

-- Ledger: select + insert only. No update/delete policy is defined at all,
-- so RLS denies both by default — the audit log is genuinely immutable at
-- the database level (a property the old localStorage array never had).
create policy "ledger_select" on ledger for select to authenticated using (true);
create policy "ledger_insert" on ledger for insert to authenticated with check (created_by = auth.uid());

create policy "transfers_select" on transfers for select to authenticated using (true);
create policy "transfers_insert" on transfers for insert to authenticated with check (created_by = auth.uid());
create policy "transfers_update" on transfers for update to authenticated using (true) with check (true);
create policy "transfers_delete" on transfers for delete to authenticated using (true);

-- Accounts: visible to both users, but only the owner can create/edit/delete
-- their own. (The atomic functions below intentionally bypass this via
-- SECURITY DEFINER for the one controlled case of balance adjustments —
-- see the comment above those functions.)
create policy "accounts_select" on accounts for select to authenticated using (true);
create policy "accounts_insert" on accounts for insert to authenticated with check (owner_id = auth.uid());
create policy "accounts_update" on accounts for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "accounts_delete" on accounts for delete to authenticated using (owner_id = auth.uid());

-- =========================================================================
-- 3. ATOMIC COMPOUND-ACTION FUNCTIONS
-- =========================================================================
-- These mirror the app's existing reducer logic, where e.g. logging an
-- expense atomically (a) inserts the transaction, (b) adjusts the linked
-- account's balance, and (c) writes 1-2 ledger rows — all as one operation.
--
-- Each is SECURITY DEFINER *deliberately*: an expense can be logged against
-- EITHER user's account (accounts are visible to both, and either user can
-- log a shared expense against any account), but the accounts_update RLS
-- policy above only allows the owner to UPDATE their own account directly.
-- These functions are the one controlled, intentional bypass of that
-- restriction — they still record who performed the action via created_by
-- = auth.uid(), which resolves correctly regardless of SECURITY DEFINER
-- since Supabase derives it from the caller's JWT for the whole request,
-- not from the function's execution role.
--
-- `set search_path = public` on each guards against search-path hijacking,
-- standard practice for SECURITY DEFINER functions.

create or replace function add_transaction(
  p_id uuid, p_date date, p_amount numeric, p_note text, p_category_id uuid, p_account_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_envelope_name text;
  v_account_name text;
  v_label_parts text[];
  v_expense_name text;
begin
  insert into transactions (id, date, amount, note, category_id, account_id, created_by)
  values (p_id, p_date, p_amount, p_note, p_category_id, p_account_id, auth.uid());

  if p_category_id is not null then
    select name into v_envelope_name from envelopes where id = p_category_id;
  end if;

  if p_account_id is not null then
    select name into v_account_name from accounts where id = p_account_id;
    update accounts set balance = balance - p_amount, updated_at = now() where id = p_account_id;
  end if;

  v_label_parts := array_remove(array[v_envelope_name, v_account_name], null);
  if array_length(v_label_parts, 1) > 0 then
    v_expense_name := coalesce(nullif(p_note, ''), 'Expense') || ' (' || array_to_string(v_label_parts, ' · ') || ')';
  else
    v_expense_name := coalesce(nullif(p_note, ''), 'Expense');
  end if;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (p_date, 'Expense', 'Expense logged', v_expense_name, p_amount, auth.uid());

  if p_account_id is not null then
    insert into ledger (date, domain, type, name, amount, created_by)
    values (p_date, 'Account', 'Deducted for expense', v_account_name, p_amount, auth.uid());
  end if;
end;
$$;

create or replace function update_transaction(
  p_id uuid, p_date date, p_amount numeric, p_note text, p_category_id uuid, p_account_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old_amount numeric;
  v_old_account_id uuid;
  v_old_account_name text;
  v_new_account_name text;
begin
  select amount, account_id into v_old_amount, v_old_account_id from transactions where id = p_id;
  if not found then return; end if;

  update transactions
  set date = p_date, amount = p_amount, note = p_note,
      category_id = p_category_id, account_id = p_account_id, updated_at = now()
  where id = p_id;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (p_date, 'Expense', 'Expense updated', coalesce(nullif(p_note, ''), 'Expense'), p_amount, auth.uid());

  if v_old_account_id is not null then
    select name into v_old_account_name from accounts where id = v_old_account_id;
    update accounts set balance = balance + v_old_amount, updated_at = now() where id = v_old_account_id;
    insert into ledger (date, domain, type, name, amount, created_by)
    values (p_date, 'Account', 'Refunded (expense updated)', v_old_account_name, v_old_amount, auth.uid());
  end if;

  if p_account_id is not null then
    select name into v_new_account_name from accounts where id = p_account_id;
    update accounts set balance = balance - p_amount, updated_at = now() where id = p_account_id;
    insert into ledger (date, domain, type, name, amount, created_by)
    values (p_date, 'Account', 'Deducted for expense update', v_new_account_name, p_amount, auth.uid());
  end if;
end;
$$;

create or replace function remove_transaction(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_date date; v_amount numeric; v_note text; v_account_id uuid; v_account_name text;
begin
  select date, amount, note, account_id into v_date, v_amount, v_note, v_account_id
  from transactions where id = p_id;
  if not found then return; end if;

  delete from transactions where id = p_id;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (v_date, 'Expense', 'Expense removed', coalesce(nullif(v_note, ''), 'Expense'), v_amount, auth.uid());

  if v_account_id is not null then
    select name into v_account_name from accounts where id = v_account_id;
    update accounts set balance = balance + v_amount, updated_at = now() where id = v_account_id;
    insert into ledger (date, domain, type, name, amount, created_by)
    values (v_date, 'Account', 'Refunded (expense removed)', v_account_name, v_amount, auth.uid());
  end if;
end;
$$;

create or replace function add_income(
  p_id uuid, p_date date, p_source text, p_amount numeric, p_account_id uuid, p_budget_month_key text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_account_name text;
begin
  insert into income (id, date, source, amount, account_id, budget_month_key, created_by)
  values (p_id, p_date, p_source, p_amount, p_account_id, p_budget_month_key, auth.uid());

  insert into ledger (date, domain, type, name, amount, created_by)
  values (p_date, 'Income', 'Income received', p_source, p_amount, auth.uid());

  if p_account_id is not null then
    select name into v_account_name from accounts where id = p_account_id;
    update accounts set balance = balance + p_amount, updated_at = now() where id = p_account_id;
    insert into ledger (date, domain, type, name, amount, created_by)
    values (p_date, 'Account', 'Credited from income', v_account_name, p_amount, auth.uid());
  end if;
end;
$$;

create or replace function update_income(
  p_id uuid, p_date date, p_source text, p_amount numeric, p_account_id uuid, p_budget_month_key text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old_amount numeric; v_old_account_id uuid; v_old_account_name text; v_new_account_name text;
begin
  select amount, account_id into v_old_amount, v_old_account_id from income where id = p_id;
  if not found then return; end if;

  update income
  set date = p_date, source = p_source, amount = p_amount,
      account_id = p_account_id, budget_month_key = p_budget_month_key, updated_at = now()
  where id = p_id;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (p_date, 'Income', 'Income updated', p_source, p_amount, auth.uid());

  if v_old_account_id is not null then
    select name into v_old_account_name from accounts where id = v_old_account_id;
    update accounts set balance = balance - v_old_amount, updated_at = now() where id = v_old_account_id;
    insert into ledger (date, domain, type, name, amount, created_by)
    values (p_date, 'Account', 'Reversed (income updated)', v_old_account_name, v_old_amount, auth.uid());
  end if;

  if p_account_id is not null then
    select name into v_new_account_name from accounts where id = p_account_id;
    update accounts set balance = balance + p_amount, updated_at = now() where id = p_account_id;
    insert into ledger (date, domain, type, name, amount, created_by)
    values (p_date, 'Account', 'Credited from income', v_new_account_name, p_amount, auth.uid());
  end if;
end;
$$;

create or replace function remove_income(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_date date; v_source text; v_amount numeric; v_account_id uuid; v_account_name text;
begin
  select date, source, amount, account_id into v_date, v_source, v_amount, v_account_id
  from income where id = p_id;
  if not found then return; end if;

  delete from income where id = p_id;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (v_date, 'Income', 'Income removed', v_source, v_amount, auth.uid());

  if v_account_id is not null then
    select name into v_account_name from accounts where id = v_account_id;
    update accounts set balance = balance - v_amount, updated_at = now() where id = v_account_id;
    insert into ledger (date, domain, type, name, amount, created_by)
    values (v_date, 'Account', 'Reversed (income removed)', v_account_name, v_amount, auth.uid());
  end if;
end;
$$;

create or replace function contribute_to_goal(
  p_goal_id uuid, p_amount numeric, p_account_id uuid, p_via text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_goal_name text;
  v_account_name text;
  v_label text;
begin
  select name into v_goal_name from goals where id = p_goal_id;
  if not found then return; end if;

  update goals set saved = saved + p_amount where id = p_goal_id;

  v_label := case p_via
    when 'account' then 'Funded from account'
    when 'savingsEnvelope' then 'Funded via Savings envelope'
    when 'income' then 'Funded via new income'
    when 'payday' then 'Funded on payday'
    else 'Funded'
  end;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (current_date, 'Goal', v_label, v_goal_name, p_amount, auth.uid());

  if p_via = 'account' and p_account_id is not null then
    select name into v_account_name from accounts where id = p_account_id;
    update accounts set balance = balance - p_amount, updated_at = now() where id = p_account_id;
    insert into ledger (date, domain, type, name, amount, created_by)
    values (current_date, 'Account', 'Deducted for goal contribution', v_account_name, p_amount, auth.uid());
  end if;
end;
$$;

-- Spending a sinking fund: `saved` goes down, but no account balance moves —
-- the expense or transfer that actually spent the money already did that.
create or replace function withdraw_from_goal(
  p_goal_id uuid, p_amount numeric, p_note text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_goal_name text;
  v_saved numeric;
begin
  select name, saved into v_goal_name, v_saved from goals where id = p_goal_id;
  if not found then raise exception 'Goal not found'; end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Withdrawal must be greater than zero';
  end if;
  if p_amount > v_saved then
    raise exception 'Cannot withdraw % from %: only % is saved', p_amount, v_goal_name, v_saved;
  end if;

  update goals set saved = saved - p_amount, updated_at = now() where id = p_goal_id;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (current_date, 'Goal', 'Withdrawn from goal',
          coalesce(nullif(p_note, ''), v_goal_name), p_amount, auth.uid());
end;
$$;

-- Lock down + explicitly grant execute only to signed-in users (Postgres
-- makes new functions PUBLIC-executable by default — tighten that here).
revoke all on function add_transaction(uuid, date, numeric, text, uuid, uuid) from public;
revoke all on function update_transaction(uuid, date, numeric, text, uuid, uuid) from public;
revoke all on function remove_transaction(uuid) from public;
revoke all on function add_income(uuid, date, text, numeric, uuid, text) from public;
revoke all on function update_income(uuid, date, text, numeric, uuid, text) from public;
revoke all on function remove_income(uuid) from public;
revoke all on function contribute_to_goal(uuid, numeric, uuid, text) from public;
revoke all on function withdraw_from_goal(uuid, numeric, text) from public;

grant execute on function add_transaction(uuid, date, numeric, text, uuid, uuid) to authenticated;
grant execute on function update_transaction(uuid, date, numeric, text, uuid, uuid) to authenticated;
grant execute on function remove_transaction(uuid) to authenticated;
grant execute on function add_income(uuid, date, text, numeric, uuid, text) to authenticated;
grant execute on function update_income(uuid, date, text, numeric, uuid, text) to authenticated;
grant execute on function remove_income(uuid) to authenticated;
grant execute on function contribute_to_goal(uuid, numeric, uuid, text) to authenticated;
grant execute on function withdraw_from_goal(uuid, numeric, text) to authenticated;

-- Moves money between any two accounts, either owner, either currency — the
-- one deliberate SECURITY DEFINER bypass that lets a transfer touch an
-- account you don't own (transferring TO the other person's account is the
-- whole point). Amounts are pre-converted client-side using whatever real
-- exchange rate the household actually got, so these functions stay
-- currency-agnostic and just move numbers. No overdraft check, matching
-- every other compound action in this file (expenses can already exceed a
-- balance today). A transfer is a first-class row (unlike the old
-- transfer_funds, which only wrote ledger lines) so it can be edited and
-- removed the same way transactions/income can.
create or replace function add_transfer(
  p_id uuid, p_date date, p_from_account_id uuid, p_to_account_id uuid,
  p_from_amount numeric, p_to_amount numeric, p_note text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_from_name text; v_to_name text;
begin
  select name into v_from_name from accounts where id = p_from_account_id;
  select name into v_to_name from accounts where id = p_to_account_id;
  if v_from_name is null or v_to_name is null then raise exception 'Invalid account'; end if;

  insert into transfers (id, date, from_account_id, to_account_id, from_amount, to_amount, note, created_by)
  values (p_id, p_date, p_from_account_id, p_to_account_id, p_from_amount, p_to_amount, p_note, auth.uid());

  update accounts set balance = balance - p_from_amount, updated_at = now() where id = p_from_account_id;
  update accounts set balance = balance + p_to_amount, updated_at = now() where id = p_to_account_id;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (p_date, 'Transfer', 'Transferred out', coalesce(nullif(p_note, ''), v_to_name), p_from_amount, auth.uid());
  insert into ledger (date, domain, type, name, amount, created_by)
  values (p_date, 'Transfer', 'Transferred in', coalesce(nullif(p_note, ''), v_from_name), p_to_amount, auth.uid());
end;
$$;

create or replace function update_transfer(
  p_id uuid, p_date date, p_from_account_id uuid, p_to_account_id uuid,
  p_from_amount numeric, p_to_amount numeric, p_note text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old_from_id uuid; v_old_to_id uuid; v_old_from_amt numeric; v_old_to_amt numeric;
  v_old_from_name text; v_old_to_name text; v_new_from_name text; v_new_to_name text;
begin
  select from_account_id, to_account_id, from_amount, to_amount
    into v_old_from_id, v_old_to_id, v_old_from_amt, v_old_to_amt
  from transfers where id = p_id;
  if not found then return; end if;

  -- Fully reverse the old movement, then fully apply the new one — simplest
  -- to prove correct, avoids delta-math edge cases when accounts change.
  select name into v_old_from_name from accounts where id = v_old_from_id;
  select name into v_old_to_name from accounts where id = v_old_to_id;
  update accounts set balance = balance + v_old_from_amt, updated_at = now() where id = v_old_from_id;
  update accounts set balance = balance - v_old_to_amt, updated_at = now() where id = v_old_to_id;
  insert into ledger (date, domain, type, name, amount, created_by)
  values (p_date, 'Transfer', 'Reversed (transfer updated)', v_old_to_name, v_old_from_amt, auth.uid());
  insert into ledger (date, domain, type, name, amount, created_by)
  values (p_date, 'Transfer', 'Reversed (transfer updated)', v_old_from_name, v_old_to_amt, auth.uid());

  select name into v_new_from_name from accounts where id = p_from_account_id;
  select name into v_new_to_name from accounts where id = p_to_account_id;
  update accounts set balance = balance - p_from_amount, updated_at = now() where id = p_from_account_id;
  update accounts set balance = balance + p_to_amount, updated_at = now() where id = p_to_account_id;
  insert into ledger (date, domain, type, name, amount, created_by)
  values (p_date, 'Transfer', 'Transferred out', coalesce(nullif(p_note, ''), v_new_to_name), p_from_amount, auth.uid());
  insert into ledger (date, domain, type, name, amount, created_by)
  values (p_date, 'Transfer', 'Transferred in', coalesce(nullif(p_note, ''), v_new_from_name), p_to_amount, auth.uid());

  update transfers
  set date = p_date, from_account_id = p_from_account_id, to_account_id = p_to_account_id,
      from_amount = p_from_amount, to_amount = p_to_amount, note = p_note, updated_at = now()
  where id = p_id;
end;
$$;

create or replace function remove_transfer(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_date date; v_from_id uuid; v_to_id uuid; v_from_amt numeric; v_to_amt numeric;
  v_from_name text; v_to_name text;
begin
  select date, from_account_id, to_account_id, from_amount, to_amount
    into v_date, v_from_id, v_to_id, v_from_amt, v_to_amt
  from transfers where id = p_id;
  if not found then return; end if;

  select name into v_from_name from accounts where id = v_from_id;
  select name into v_to_name from accounts where id = v_to_id;

  delete from transfers where id = p_id;

  update accounts set balance = balance + v_from_amt, updated_at = now() where id = v_from_id;
  update accounts set balance = balance - v_to_amt, updated_at = now() where id = v_to_id;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (v_date, 'Transfer', 'Transfer removed', v_to_name, v_from_amt, auth.uid());
  insert into ledger (date, domain, type, name, amount, created_by)
  values (v_date, 'Transfer', 'Transfer removed', v_from_name, v_to_amt, auth.uid());
end;
$$;

revoke all on function add_transfer(uuid, date, uuid, uuid, numeric, numeric, text) from public;
revoke all on function update_transfer(uuid, date, uuid, uuid, numeric, numeric, text) from public;
revoke all on function remove_transfer(uuid) from public;
grant execute on function add_transfer(uuid, date, uuid, uuid, numeric, numeric, text) to authenticated;
grant execute on function update_transfer(uuid, date, uuid, uuid, numeric, numeric, text) to authenticated;
grant execute on function remove_transfer(uuid) to authenticated;

-- =========================================================================
-- 4. STORAGE: profile picture avatars
-- =========================================================================
-- Public bucket (a deliberate, narrow exception to "nothing for anon" —
-- avatar photos are low-sensitivity compared to the rest of this app's data,
-- and a stable public URL is what lets profiles.avatar_url be cached as-is).
-- Anyone with the exact file URL can view a photo without signing in, but
-- the URL isn't discoverable or listed anywhere. Writes stay locked down:
-- each user may only upload/update the file under their own {uid}/ folder.

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "avatar_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Needed because the app removes-then-uploads on re-upload (see repo.js)
-- rather than relying on storage's upsert, which evaluates the INSERT
-- policy even when a row already exists and would otherwise be updated.
create policy "avatar_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================================
-- 5. NEXT STEPS (do these in the dashboard, not SQL)
-- =========================================================================
-- 1. Authentication → Providers → Email → set "Minimum password length" to 8.
--    (The app asks for 8-12 digits for any NEW pin; existing 6-digit pins keep
--    working until changed, so only raise this once both members have changed.)
-- 2. Authentication → Users → Add user → create Daddy Cid and Mommy Chelle
--    with their real emails and their PIN as the password.
-- 3. Run this once per user (in SQL Editor), filling in the real UUID from
--    step 2 and the display name:
--      insert into profiles (id, display_name) values ('<uuid>', 'Daddy Cid');
--      insert into profiles (id, display_name) values ('<uuid>', 'Mommy Chelle');

-- apply_payday balances EVERY source account, not just the hub. A payday that
-- takes more out of an account than arrived in it is rejected before anything
-- is written. The check is one aggregation over the payload: 0008 used a temp
-- table cleared with an unqualified DELETE, which Supabase refuses outright,
-- so no payday could run at all until 0009.
create or replace function apply_payday(p_payday jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_payday_id uuid := (p_payday ->> 'id')::uuid;
  v_date date := (p_payday ->> 'date')::date;
  v_month text := p_payday ->> 'budget_month_key';
  v_kind text := coalesce(p_payday ->> 'kind', 'pay');
  v_total numeric := 0;
  v_item jsonb;
  v_new_id uuid;
  v_bad_account uuid;
  v_bad_out numeric;
  v_bad_in numeric;
begin
  if v_payday_id is null then raise exception 'payday id is required'; end if;

  perform 1 from paydays where id = v_payday_id;
  if found then return; end if;

  select coalesce(sum((i ->> 'amount')::numeric), 0) into v_total
  from jsonb_array_elements(coalesce(p_payday -> 'incomes', '[]'::jsonb)) i;

  -- Every source account must cover what the payday takes out of it. Runs
  -- before anything is written, so a rejected payday leaves no partial trace.
  -- A goal allocation keeps the money where it is but is still spoken for, so
  -- it counts against the account funding it.
  select f.account_id, sum(f.outflow), sum(f.inflow)
    into v_bad_account, v_bad_out, v_bad_in
  from (
    select (i ->> 'account_id')::uuid as account_id,
           (i ->> 'amount')::numeric as inflow, 0::numeric as outflow
    from jsonb_array_elements(coalesce(p_payday -> 'incomes', '[]'::jsonb)) i
    union all
    select (t ->> 'from_account_id')::uuid, 0::numeric, (t ->> 'amount')::numeric
    from jsonb_array_elements(coalesce(p_payday -> 'transfers', '[]'::jsonb)) t
    union all
    select (g ->> 'source_account_id')::uuid, 0::numeric, (g ->> 'amount')::numeric
    from jsonb_array_elements(coalesce(p_payday -> 'goal_allocations', '[]'::jsonb)) g
  ) f
  where f.account_id is not null
  group by f.account_id
  having sum(f.outflow) > sum(f.inflow)
  limit 1;

  if v_bad_account is not null then
    raise exception 'Payday takes % out of % but only % arrived there',
      v_bad_out, coalesce((select name from accounts where id = v_bad_account), 'an account'), v_bad_in;
  end if;

  insert into paydays (id, date, budget_month_key, total, kind, created_by)
  values (v_payday_id, v_date, v_month, v_total, v_kind, auth.uid());

  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'incomes', '[]'::jsonb)) loop
    v_new_id := coalesce((v_item ->> 'id')::uuid, gen_random_uuid());
    perform add_income(v_new_id, v_date, v_item ->> 'source', (v_item ->> 'amount')::numeric,
                       (v_item ->> 'account_id')::uuid, v_month);
    update income set kind = v_kind where id = v_new_id;
    insert into payday_allocations (payday_id, kind, income_id, amount, label)
    values (v_payday_id, 'income', v_new_id, (v_item ->> 'amount')::numeric, v_item ->> 'source');
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'transfers', '[]'::jsonb)) loop
    v_new_id := coalesce((v_item ->> 'id')::uuid, gen_random_uuid());
    perform add_transfer(v_new_id, v_date, (v_item ->> 'from_account_id')::uuid,
                         (v_item ->> 'to_account_id')::uuid,
                         (v_item ->> 'amount')::numeric, (v_item ->> 'amount')::numeric, v_item ->> 'note');
    insert into payday_allocations (payday_id, kind, transfer_id, amount, label)
    values (v_payday_id, 'transfer', v_new_id, (v_item ->> 'amount')::numeric, v_item ->> 'note');
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'goal_allocations', '[]'::jsonb)) loop
    perform contribute_to_goal((v_item ->> 'goal_id')::uuid, (v_item ->> 'amount')::numeric, null, 'payday');
    insert into payday_allocations (payday_id, kind, goal_id, amount, label)
    values (v_payday_id, 'goal', (v_item ->> 'goal_id')::uuid, (v_item ->> 'amount')::numeric, v_item ->> 'label');
  end loop;
end;
$$;

revoke all on function apply_payday(jsonb) from public;
grant execute on function apply_payday(jsonb) to authenticated;

-- Records what the household holds right now, filed under the month given.
--
-- The totals are computed HERE rather than passed in, so a snapshot can never
-- disagree with the database it was taken from. Only the USD rate is a
-- parameter, because it is the one figure the database does not hold.
--
-- The three rules below mirror deriveMonthFinancials exactly (src/utils/
-- derive.js). They are repeated here because this is a different consumer of
-- the same accounts, not a second copy of balance math -- nothing in this
-- function moves money:
--   * a receivable is money owed TO the household, not money it holds, so it
--     is excluded from the balance totals and reported on its own;
--   * an account with a null currency is PHP;
--   * ARCHIVED ACCOUNTS STILL COUNT. Hiding a card must not make its money
--     vanish from the household's net worth.
--
-- Upserts, so the first open of a month by either household member wins and
-- the second is harmless, and so "Snapshot now" can be pressed twice.
create or replace function take_month_snapshot(p_month_key text, p_usd_php_rate numeric default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_month_key !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception 'month_key must look like YYYY-MM, got %', p_month_key;
  end if;

  insert into month_snapshots (
    month_key, taken_on, total_php, total_usd, usd_php_rate,
    bank_total, cooperative_total, ewallet_total, cash_total, receivable_total,
    goals_saved_total, created_by
  )
  select
    p_month_key,
    current_date,
    coalesce(sum(a.balance) filter (where a.type <> 'receivable' and coalesce(a.currency, 'PHP') = 'PHP'), 0),
    coalesce(sum(a.balance) filter (where a.type <> 'receivable' and a.currency = 'USD'), 0),
    p_usd_php_rate,
    -- Per-type totals are PHP only. Mixing currencies in one figure would be
    -- meaningless; the USD side is carried whole in total_usd above.
    coalesce(sum(a.balance) filter (where a.type = 'bank' and coalesce(a.currency, 'PHP') = 'PHP'), 0),
    coalesce(sum(a.balance) filter (where a.type = 'cooperative' and coalesce(a.currency, 'PHP') = 'PHP'), 0),
    coalesce(sum(a.balance) filter (where a.type = 'ewallet' and coalesce(a.currency, 'PHP') = 'PHP'), 0),
    coalesce(sum(a.balance) filter (where a.type = 'cash' and coalesce(a.currency, 'PHP') = 'PHP'), 0),
    coalesce(sum(a.balance) filter (where a.type = 'receivable' and coalesce(a.currency, 'PHP') = 'PHP'), 0),
    -- Every goal that is not archived, sinking funds included: this is money
    -- the household holds, not progress toward a headline figure, so the
    -- exclusions getGoalsProgressPct applies deliberately do not apply here.
    (select coalesce(sum(g.saved), 0) from goals g where g.archived_at is null),
    auth.uid()
  from accounts a
  on conflict (month_key) do update set
    taken_on = excluded.taken_on,
    total_php = excluded.total_php,
    total_usd = excluded.total_usd,
    usd_php_rate = coalesce(excluded.usd_php_rate, month_snapshots.usd_php_rate),
    bank_total = excluded.bank_total,
    cooperative_total = excluded.cooperative_total,
    ewallet_total = excluded.ewallet_total,
    cash_total = excluded.cash_total,
    receivable_total = excluded.receivable_total,
    goals_saved_total = excluded.goals_saved_total,
    created_by = excluded.created_by;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (current_date, 'Snapshot', 'Month recorded', p_month_key, 0, auth.uid());
end;
$$;

revoke all on function take_month_snapshot(text, numeric) from public;
grant execute on function take_month_snapshot(text, numeric) to authenticated;

alter table bills enable row level security;

create policy "bills_select" on bills for select to authenticated using (true);
create policy "bills_insert" on bills for insert to authenticated with check (created_by = auth.uid());
create policy "bills_update" on bills for update to authenticated using (true) with check (true);
create policy "bills_delete" on bills for delete to authenticated using (true);

-- Paying a bill is three things that must all happen or none of them: the
-- expense, the bill moving to its next due date, and the sinking fund going
-- down if one funds it. add_transaction is called rather than repeated.
create or replace function pay_bill(
  p_bill_id uuid,
  p_transaction_id uuid,
  p_date date,
  p_amount numeric,
  p_note text,
  p_envelope_id uuid,
  p_account_id uuid
) returns date
language plpgsql security definer set search_path = public as $$
declare
  v_bill bills%rowtype;
  v_next date;
  v_last_day integer;
begin
  select * into v_bill from bills where id = p_bill_id;
  if not found then raise exception 'Bill not found'; end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'A bill payment must be greater than zero';
  end if;

  perform add_transaction(p_transaction_id, p_date, p_amount, p_note, p_envelope_id, p_account_id);
  update transactions set bill_id = p_bill_id where id = p_transaction_id;

  -- Advance from the date it was DUE, not the date it was paid: paying late
  -- must not push every future due date later too.
  v_next := coalesce(v_bill.next_due, p_date) + case v_bill.period
    when 'monthly' then interval '1 month'
    when 'quarterly' then interval '3 months'
    when 'semiannual' then interval '6 months'
    when 'annual' then interval '12 months'
  end;

  if v_bill.due_day is not null then
    v_last_day := extract(day from (date_trunc('month', v_next) + interval '1 month - 1 day'))::integer;
    v_next := (date_trunc('month', v_next))::date + (least(v_bill.due_day, v_last_day) - 1);
  end if;

  update bills set next_due = v_next, updated_at = now() where id = p_bill_id;

  -- withdraw_from_goal refuses to take more than is saved, so a fund that is
  -- short fails the whole payment rather than going negative.
  if v_bill.goal_id is not null then
    perform withdraw_from_goal(v_bill.goal_id, p_amount, v_bill.name);
  end if;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (p_date, 'Bill', 'Bill paid', v_bill.name, p_amount, auth.uid());

  return v_next;
end;
$$;

revoke all on function pay_bill(uuid, uuid, date, numeric, text, uuid, uuid) from public;
grant execute on function pay_bill(uuid, uuid, date, numeric, text, uuid, uuid) to authenticated;
