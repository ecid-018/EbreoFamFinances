-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- This UNDOES a migration and can destroy data. Read what it drops first.
-- The SQL editor looks identical in staging and production.
-- ============================================================================
-- Rollback for 0013_signoff_pay.sql
--
-- WILL FAIL if any sign-off payday has been recorded, and that is deliberate:
-- narrowing a CHECK is only safe when nothing violates the narrower rule.
-- Postgres validates the constraint against existing rows, so a real sign-off
-- payday makes this refuse rather than silently leaving bad data behind.
--
-- To roll back after one has been recorded, decide first what those rows
-- should become -- there is no automatic answer, which is why this file does
-- not guess at one.

begin;

alter table paydays drop constraint if exists paydays_kind_check;
alter table paydays add constraint paydays_kind_check
  check (kind in ('pay', 'windfall'));

alter table income drop constraint if exists income_kind_check;
alter table income add constraint income_kind_check
  check (kind in ('pay', 'windfall', 'trading_payout', 'other'));

commit;
