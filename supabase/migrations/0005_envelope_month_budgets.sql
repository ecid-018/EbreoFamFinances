-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- The SQL editor looks identical in staging and production; the badge is the
-- only tell. Staging first, then production -- and only after a backup
-- (Dashboard -> Database -> Backups).
-- ============================================================================
-- 0005_envelope_month_budgets.sql
-- Phase 4 — Month-scoped envelope budgets.
--
-- Until now there was exactly one budget figure per envelope, shared by every
-- month: derive.js filtered transactions by month but summed monthly_budget
-- flat. Changing a budget therefore rewrote history — last month's spending
-- would start being measured against this month's plan.
--
-- This table is SPARSE and envelopes.monthly_budget is left alone. A month
-- only gets rows when its budget differs from what came before; resolution is
--
--     the row for the viewed month
--       -> else the most recent row for an EARLIER month
--       -> else envelopes.monthly_budget
--
-- so every month already recorded keeps resolving to the column that holds its
-- figures today, with no backfill and no data migration. See
-- src/utils/plan/monthBudgets.js for the resolver and its tests.
--
-- month_key is 'YYYY-MM' rather than a date: budgets belong to a month, not a
-- day, and a text key sorts chronologically under plain string comparison,
-- which is what the resolver relies on.
--
-- Additive: new table only. Nothing renamed, dropped or retyped.

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

-- The resolver looks up "rows for this envelope at or before month X, newest
-- first", which this index serves directly.
create index on envelope_budgets (envelope_id, month_key desc);

alter table envelope_budgets enable row level security;

-- Same shape as every other table here: readable by any signed-in household
-- member, insertable only as yourself, updatable and deletable by either.
-- Nothing is granted to anon.
create policy "envelope_budgets_select" on envelope_budgets for select to authenticated using (true);
create policy "envelope_budgets_insert" on envelope_budgets for insert to authenticated with check (created_by = auth.uid());
create policy "envelope_budgets_update" on envelope_budgets for update to authenticated using (true) with check (true);
create policy "envelope_budgets_delete" on envelope_budgets for delete to authenticated using (true);
