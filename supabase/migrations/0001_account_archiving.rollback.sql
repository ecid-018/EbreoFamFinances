-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- This UNDOES a migration and can destroy data. Read what it drops first.
-- The SQL editor looks identical in staging and production.
-- ============================================================================
-- Rollback for 0001_account_archiving.sql
-- Safe to run only if no account has been archived yet, or if losing the
-- archived flag (accounts reappear as active) is acceptable.
alter table accounts drop column archived_at;
