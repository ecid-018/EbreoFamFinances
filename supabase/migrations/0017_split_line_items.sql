-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- The SQL editor looks identical in staging and production; the badge is the
-- only tell. Staging first, then production.
-- ============================================================================
-- 0017_split_line_items.sql
-- Each split line, broken into the named parts it is actually made of.
--
-- WHY. The household's plan allocates a line as several fixed amounts, each
-- from its own account and each going somewhere different: the goals line is
-- four standing amounts to four funds, paid partly from one bank and partly
-- from the other. Two things in the app could not express that.
--
--   * split_line_sources keys on line_key alone, so a line has ONE source
--     account. Two of the six lines are genuinely paid from both.
--   * routeGoalsLine fills the highest-priority unfunded goal until it is
--     full, then moves on. That is the rule Phase 5 asked for, and it is not
--     this plan: this plan funds four goals in parallel, every month, at fixed
--     amounts.
--
-- SPARSE, like envelope_budgets and split_line_sources before it. A line with
-- no rows here keeps behaving exactly as it does today -- same sources, same
-- waterfall. Nothing changes until a line is itemised deliberately.

create table split_line_items (
  id uuid primary key default gen_random_uuid(),
  line_key text not null check (line_key in (
    'splitGoals', 'splitRetirement', 'splitTrading',
    'splitInsurance', 'splitTrips', 'splitVacationReserve'
  )),
  -- What this part of the line is for, in the household's own words.
  label text not null,
  amount numeric(12,2) not null check (amount >= 0),
  -- Which account pays it. Null falls back to the line's source, and then to
  -- the hub, exactly as before.
  from_account_id uuid references accounts(id) on delete set null,
  -- Where it goes. At most ONE of these: a goal credits that goal, an account
  -- is a plain transfer, and neither means the money stays where it is (a
  -- premium auto-debited from the account it already sits in).
  to_account_id uuid references accounts(id) on delete set null,
  goal_id uuid references goals(id) on delete set null,
  constraint split_line_items_one_destination
    check (to_account_id is null or goal_id is null),
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index split_line_items_line_idx on split_line_items (line_key, sort_order);

alter table split_line_items enable row level security;

create policy "split_line_items_select" on split_line_items for select to authenticated using (true);
create policy "split_line_items_insert" on split_line_items for insert to authenticated with check (created_by = auth.uid());
create policy "split_line_items_update" on split_line_items for update to authenticated using (true) with check (true);
create policy "split_line_items_delete" on split_line_items for delete to authenticated using (true);
