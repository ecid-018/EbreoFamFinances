-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- The SQL editor looks identical in staging and production; the badge is the
-- only tell. Staging first, then production -- and only after a backup
-- (Dashboard -> Database -> Backups).
-- ============================================================================
-- 0010_month_snapshots.sql
-- Net-worth snapshot per closed month.
--
-- Pulled forward out of Phase 9, ahead of any reports screen, because it is the
-- one piece of this plan that cannot be caught up later. Account balances are
-- STORED, not derived from transactions, so once a month closes there is no way
-- to reconstruct what the household was worth on the last day of it. Budget
-- history exists (phase 4 made budgets month-scoped); balance history does not.
-- Every month that passes without a row here is lost for good.
--
-- Numbering: the spec calls this 0009; that name was already taken by the
-- apply_payday fix. Spec migration names are labels, not instructions.
--
-- Additive: new table and one new function.

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

alter table month_snapshots enable row level security;

create policy "month_snapshots_select" on month_snapshots for select to authenticated using (true);
create policy "month_snapshots_insert" on month_snapshots for insert to authenticated with check (created_by = auth.uid());
create policy "month_snapshots_update" on month_snapshots for update to authenticated using (true) with check (true);
create policy "month_snapshots_delete" on month_snapshots for delete to authenticated using (true);

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
