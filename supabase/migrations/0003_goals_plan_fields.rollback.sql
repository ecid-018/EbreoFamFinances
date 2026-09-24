-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- This UNDOES a migration and can destroy data. Read what it drops first.
-- The SQL editor looks identical in staging and production.
-- ============================================================================
-- Rollback for 0003_goals_plan_fields.sql
--
-- Dropping the columns loses any priority/date/grouping the household set.
-- Ledger rows written by withdraw_from_goal are NOT removed: the ledger is
-- append-only by design, and those entries record things that really happened.
drop function if exists withdraw_from_goal(uuid, numeric, text);

alter table goals
  drop column priority,
  drop column target_date,
  drop column held_in_account_id,
  drop column is_sinking_fund,
  drop column goal_group,
  drop column archived_at;

-- contribute_to_goal keeps the extra 'payday' label: it is additive, harmless
-- to older callers, and reverting it would orphan any ledger rows using it.
