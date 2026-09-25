-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- This UNDOES a migration and can destroy data. Read what it drops first.
-- The SQL editor looks identical in staging and production.
-- ============================================================================
-- Rollback for 0016_trading_ledger.sql
--
-- Loses which envelopes were marked as trading costs -- a handful of
-- checkboxes, quickly re-ticked. No expense, envelope or budget is affected.

drop index if exists envelopes_trading_cost_idx;

alter table envelopes
  drop column is_trading_cost;
