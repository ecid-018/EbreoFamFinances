-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- This UNDOES a migration and can destroy data. Read what it drops first.
-- The SQL editor looks identical in staging and production.
-- ============================================================================
-- Rollback for 0012_bills.sql
--
-- Loses every bill the household entered. Ledger rows written by pay_bill are
-- NOT removed: the ledger is append-only by design and those entries record
-- payments that really happened. Expenses survive too; they only lose the
-- pointer saying which bill they paid.

drop function if exists pay_bill(uuid, uuid, date, numeric, text, uuid, uuid);

alter table transactions drop column bill_id;

drop table if exists bills;
