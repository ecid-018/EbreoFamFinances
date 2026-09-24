-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- This UNDOES a migration and can destroy data. Read what it drops first.
-- The SQL editor looks identical in staging and production.
-- ============================================================================
-- Rollback for 0006_month_modes.sql
--
-- Safe: a month with no row is 'sea', which is what every month resolved to
-- before this table existed. Dropping it returns every month to that default
-- and the zero-based check to comparing against income everywhere.

drop table if exists month_modes;
