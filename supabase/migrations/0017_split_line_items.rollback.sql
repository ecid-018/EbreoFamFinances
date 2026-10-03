-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- This UNDOES a migration and can destroy data. Read what it drops first.
-- The SQL editor looks identical in staging and production.
-- ============================================================================
-- Rollback for 0017_split_line_items.sql
--
-- Loses every itemisation. No money is affected and no payday already applied
-- changes -- those are ordinary transfers and goal contributions. What is lost
-- is the instruction for how FUTURE paydays should split each line, and the
-- app falls back to split_line_sources plus the goal waterfall, which is how
-- it behaved before this migration.

drop table if exists split_line_items;
