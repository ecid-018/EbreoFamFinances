-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- The SQL editor looks identical in staging and production; the badge is the
-- only tell. Staging first, then production -- and only after a backup
-- (Dashboard -> Database -> Backups).
-- ============================================================================
-- 0013_signoff_pay.sql
-- 10d — a third kind of payday: the leave pay received at sign-off.
--
-- NOT PURELY ADDITIVE, and the only such migration in this plan. Ground rule 4
-- forbids drops; widening a CHECK constraint means dropping and recreating it.
--
-- It is safe for one specific reason: the new constraint is strictly MORE
-- permissive than the old one. Every row that satisfied 'pay'/'windfall' still
-- satisfies 'pay'/'windfall'/'signoff', so no existing row can be invalidated
-- and the ADD cannot fail on live data. The whole thing runs in one
-- transaction, so there is no moment where the column is unconstrained.
--
-- Both tables are widened together on purpose. apply_payday copies the payday
-- kind onto the income rows it creates (`update income set kind = v_kind`), so
-- widening only paydays would let a sign-off payday insert its payday row and
-- then fail on the income -- the worst possible place to stop.

begin;

alter table paydays drop constraint if exists paydays_kind_check;
alter table paydays add constraint paydays_kind_check
  check (kind in ('pay', 'windfall', 'signoff'));

alter table income drop constraint if exists income_kind_check;
alter table income add constraint income_kind_check
  check (kind in ('pay', 'windfall', 'signoff', 'trading_payout', 'other'));

commit;
