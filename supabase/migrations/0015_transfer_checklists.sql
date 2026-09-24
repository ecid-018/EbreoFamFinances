-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- The SQL editor looks identical in staging and production; the badge is the
-- only tell. Staging first, then production -- and only after a backup
-- (Dashboard -> Database -> Backups).
-- ============================================================================
-- 0015_transfer_checklists.sql
-- 10d — when money arrives, say which transfers the plan calls for.
--
-- NOTHING HERE MOVES MONEY. A checklist is a list of suggestions with a
-- record of which ones were acted on. Each item is carried out by the
-- household through the existing transfer form and the existing RPC; this
-- table only remembers what was suggested and what happened to it.

create table transfer_checklists (
  id uuid primary key default gen_random_uuid(),
  -- The money that prompted it. `on delete cascade`: a checklist for income
  -- that no longer exists is about nothing.
  income_id uuid not null references income(id) on delete cascade,
  -- What the app decided this money was, which is what picked the routing.
  income_kind text not null check (income_kind in (
    'allotment', 'remittance', 'leave_pay', 'instalment', 'trading_payout', 'windfall', 'other'
  )),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  -- One checklist per income entry. Logging the same money twice is a
  -- different problem; routing it twice would be this one.
  unique (income_id)
);

create table transfer_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references transfer_checklists(id) on delete cascade,
  from_account_id uuid references accounts(id) on delete set null,
  to_account_id uuid references accounts(id) on delete set null,
  goal_id uuid references goals(id) on delete set null,
  amount numeric(12,2) not null,
  -- Why the plan says to do this. Written by code, never by the AI: the AI
  -- may reword it later, but the amounts and the rule behind them are ours.
  reason text not null,
  status text not null default 'todo' check (status in ('todo', 'done', 'skipped')),
  -- Why it was skipped. Null unless status = 'skipped'.
  skip_reason text,
  -- The transfer that carried it out, once one exists. `on delete set null`:
  -- deleting the transfer later must not erase the record that it was done.
  transfer_id uuid references transfers(id) on delete set null,
  created_at timestamptz not null default now()
);

create index transfer_checklist_items_checklist_idx on transfer_checklist_items (checklist_id);
create index transfer_checklists_open_idx on transfer_checklists (created_at) where completed_at is null;

alter table transfer_checklists enable row level security;
alter table transfer_checklist_items enable row level security;

create policy "transfer_checklists_select" on transfer_checklists for select to authenticated using (true);
create policy "transfer_checklists_insert" on transfer_checklists for insert to authenticated with check (created_by = auth.uid());
create policy "transfer_checklists_update" on transfer_checklists for update to authenticated using (true) with check (true);
create policy "transfer_checklists_delete" on transfer_checklists for delete to authenticated using (true);

create policy "transfer_checklist_items_select" on transfer_checklist_items for select to authenticated using (true);
create policy "transfer_checklist_items_insert" on transfer_checklist_items for insert to authenticated with check (true);
create policy "transfer_checklist_items_update" on transfer_checklist_items for update to authenticated using (true) with check (true);
create policy "transfer_checklist_items_delete" on transfer_checklist_items for delete to authenticated using (true);

-- Two destinations the routing table names that the plan had no pointer for.
-- Both nullable: with neither set, those two income kinds route by goal
-- priority like any other money, and the screen says why.
alter table plan_settings
  -- "Brother-in-law instalment -> car fund until the car is bought."
  add column car_goal_id uuid references goals(id) on delete set null,
  -- "Trading payout -> 50% goals, 30% tax and reserve, 20% reinvest."
  -- The 20% reinvest stays in trading_account_id; this is where the 30% goes.
  add column trading_tax_account_id uuid references accounts(id) on delete set null;
