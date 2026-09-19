-- 0002_account_types_roles.sql
-- Phase 1 — account types, roles, and the bank-floor flag.
--
-- NOTE ON NUMBERING: the build spec calls this 0001. Phase 0 needed a
-- migration of its own (0001_account_archiving.sql), so every phase from here
-- is +1 against the spec. See README.md in this folder.
--
-- Two new account types:
--   cooperative  a co-op share/savings account — real money, spendable only
--                through the co-op, so it stays out of expense pickers
--   receivable   money lent out and owed back — real, but NOT cash on hand,
--                so it is excluded from household balance totals and shown
--                separately as "Owed to us"
--
-- `counts_toward_floor` marks the accounts whose combined balance makes up the
-- household's bank floor. It defaults to FALSE: the floor counts only what is
-- explicitly tagged, so adding this column changes no existing figure.
--
-- `role` is free-form-but-checked labelling used by the later Plan phases.
-- Nullable, so existing rows need no backfill.

-- The live constraint is named accounts_type_check (verified against the
-- database before writing this).
alter table accounts drop constraint accounts_type_check;
alter table accounts add constraint accounts_type_check
  check (type in ('bank','ewallet','cash','cooperative','receivable'));

alter table accounts
  add column counts_toward_floor boolean not null default false,
  add column role text
    check (role in ('household','daily','floor','hub','goals','trading','spare'));
