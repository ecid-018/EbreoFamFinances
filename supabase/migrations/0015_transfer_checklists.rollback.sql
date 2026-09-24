-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- This UNDOES a migration and can destroy data. Read what it drops first.
-- The SQL editor looks identical in staging and production.
-- ============================================================================
-- Rollback for 0015_transfer_checklists.sql
--
-- Loses every checklist and every record of which suggestions were acted on
-- or skipped. NO MONEY IS AFFECTED: the transfers themselves are ordinary
-- rows in `transfers`, made through the existing RPC, and they stay exactly
-- as they are. What is lost is the note saying which of them the plan asked
-- for -- annoying, not dangerous.

begin;

drop table if exists transfer_checklist_items;
drop table if exists transfer_checklists;

alter table plan_settings
  drop column car_goal_id,
  drop column trading_tax_account_id;

commit;
