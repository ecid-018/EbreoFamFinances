-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- This UNDOES a migration and can destroy data. Read what it drops first.
-- The SQL editor looks identical in staging and production.
-- ============================================================================
-- Rollback for 0008_split_line_sources.sql
--
-- Drops the table, which returns every line to being paid from the hub. It
-- does NOT restore the previous apply_payday, which validated only the hub;
-- the version left in place validates every source account, and with no rows
-- every line is hub-sourced, so it behaves identically to the old one.
-- Re-run 0007 if the earlier function body is genuinely wanted back.

drop table if exists split_line_sources;
