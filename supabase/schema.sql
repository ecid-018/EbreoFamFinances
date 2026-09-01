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
  type text not null check (type in ('bank','ewallet','cash')),
  balance numeric(12,2) not null default 0,
  currency text not null default 'PHP' check (currency in ('PHP','USD')),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  updated_at timestamptz not null default now()
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target numeric(12,2) not null,
  saved numeric(12,2) not null default 0,
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

create index on transactions (category_id);
create index on transactions (account_id);
create index on transactions (date);
create index on income (account_id);
create index on income (budget_month_key);
create index on accounts (owner_id);
create index on ledger (date);
create index on transfers (from_account_id);
create index on transfers (to_account_id);

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

-- Lock down + explicitly grant execute only to signed-in users (Postgres
-- makes new functions PUBLIC-executable by default — tighten that here).
revoke all on function add_transaction(uuid, date, numeric, text, uuid, uuid) from public;
revoke all on function update_transaction(uuid, date, numeric, text, uuid, uuid) from public;
revoke all on function remove_transaction(uuid) from public;
revoke all on function add_income(uuid, date, text, numeric, uuid, text) from public;
revoke all on function update_income(uuid, date, text, numeric, uuid, text) from public;
revoke all on function remove_income(uuid) from public;
revoke all on function contribute_to_goal(uuid, numeric, uuid, text) from public;

grant execute on function add_transaction(uuid, date, numeric, text, uuid, uuid) to authenticated;
grant execute on function update_transaction(uuid, date, numeric, text, uuid, uuid) to authenticated;
grant execute on function remove_transaction(uuid) to authenticated;
grant execute on function add_income(uuid, date, text, numeric, uuid, text) to authenticated;
grant execute on function update_income(uuid, date, text, numeric, uuid, text) to authenticated;
grant execute on function remove_income(uuid) to authenticated;
grant execute on function contribute_to_goal(uuid, numeric, uuid, text) to authenticated;

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
-- 1. Authentication → Providers → Email → set "Minimum password length" to 6.
-- 2. Authentication → Users → Add user → create Daddy Cid and Mommy Chelle
--    with their real emails and their PIN as the password.
-- 3. Run this once per user (in SQL Editor), filling in the real UUID from
--    step 2 and the display name:
--      insert into profiles (id, display_name) values ('<uuid>', 'Daddy Cid');
--      insert into profiles (id, display_name) values ('<uuid>', 'Mommy Chelle');
