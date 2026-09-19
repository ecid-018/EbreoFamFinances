-- Rollback for 0002_account_types_roles.sql
--
-- WARNING: restoring the original type constraint FAILS if any account has
-- been set to 'cooperative' or 'receivable'. Re-tag those back to one of
-- bank/ewallet/cash first, e.g.:
--   update accounts set type = 'bank' where type in ('cooperative','receivable');
alter table accounts drop column role;
alter table accounts drop column counts_toward_floor;

alter table accounts drop constraint accounts_type_check;
alter table accounts add constraint accounts_type_check
  check (type in ('bank','ewallet','cash'));
