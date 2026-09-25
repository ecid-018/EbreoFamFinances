-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- The SQL editor looks identical in staging and production; the badge is the
-- only tell. Staging first, then production.
-- ============================================================================
-- 0016_trading_ledger.sql
-- Phase 7 — is this envelope a cost of trading?
--
-- One flag, so the Plan view can answer the only question that matters about
-- trading: does it make money once what it costs to run is taken off. Data
-- feeds, platform fees and subscriptions are ordinary expenses in ordinary
-- envelopes; flagging them is what lets them be counted together without
-- moving them out of the budget they belong to.
--
-- Defaulted, so every existing envelope is unflagged, which is what they all
-- already were.

alter table envelopes
  add column is_trading_cost boolean not null default false;

create index envelopes_trading_cost_idx on envelopes (is_trading_cost) where is_trading_cost;
