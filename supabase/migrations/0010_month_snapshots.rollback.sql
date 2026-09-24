-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- This UNDOES a migration and can destroy data. Read what it drops first.
-- The SQL editor looks identical in staging and production.
-- ============================================================================
-- Rollback for 0010_month_snapshots.sql
--
-- Dropping this table destroys the only record of what the household was worth
-- in each closed month, and it CANNOT be rebuilt: balances are stored, not
-- derived. Export the rows before running this if there is any doubt.

drop function if exists take_month_snapshot(text, numeric);
drop table if exists month_snapshots;
