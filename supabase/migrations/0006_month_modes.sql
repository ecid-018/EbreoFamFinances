-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- The SQL editor looks identical in staging and production; the badge is the
-- only tell. Staging first, then production -- and only after a backup
-- (Dashboard -> Database -> Backups).
-- ============================================================================
-- 0006_month_modes.sql
-- Phase 4 (remainder) — Sea and vacation month modes.
--
-- The household is paid for about eight months a year and at home for the rest.
-- A vacation month has no pay coming in: it is funded from the vacation reserve
-- that the paid months built up. Tagging a month says which of those two things
-- it is, so the zero-based check can compare budgets against the right pool.
--
-- Numbering: +1 against the spec, which calls this 0004 — 0001 went to the
-- Phase 0 archiving column and the offset has held ever since.
--
-- DELIBERATELY NOT INCLUDED: the spec's `envelopes.vacation_budget` column.
-- 0005 made budgets month-scoped, so a vacation month simply gets its own rows
-- in envelope_budgets. A second budget column per envelope would be a parallel
-- way of saying the same thing, and two mechanisms resolving one figure is how
-- balance math drifts. Mode now decides what budgets are measured AGAINST, not
-- what they are.
--
-- Additive: new table only. Nothing renamed, dropped or retyped.

create table month_modes (
  month_key text primary key check (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  mode text not null check (mode in ('sea', 'vacation')),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table month_modes enable row level security;

-- Standard shared-table shape: readable by any signed-in household member,
-- insertable only as yourself, updatable and deletable by either. Nothing to anon.
create policy "month_modes_select" on month_modes for select to authenticated using (true);
create policy "month_modes_insert" on month_modes for insert to authenticated with check (created_by = auth.uid());
create policy "month_modes_update" on month_modes for update to authenticated using (true) with check (true);
create policy "month_modes_delete" on month_modes for delete to authenticated using (true);
