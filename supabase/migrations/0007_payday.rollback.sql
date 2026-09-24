-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- This UNDOES a migration and can destroy data. Read what it drops first.
-- The SQL editor looks identical in staging and production.
-- ============================================================================
-- Rollback for 0007_payday.sql
--
-- NOT fully safe. Dropping paydays cascades to payday_allocations and loses the
-- record of which paydays were logged. The income, transfers and goal
-- contributions those paydays created are NOT touched — they are ordinary rows
-- created through the ordinary functions — so balances stay correct. What is
-- lost is the grouping: the money moved, but the app forgets it moved as one
-- payday, and the zero-based check stops subtracting planned allocations.
--
-- income.kind is dropped too, which loses the pay/windfall classification on
-- any income logged through a payday.

drop function if exists apply_payday(jsonb);
drop table if exists payday_allocations;
drop table if exists paydays;
alter table income drop column if exists kind;
