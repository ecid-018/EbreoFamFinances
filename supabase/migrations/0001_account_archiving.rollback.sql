-- Rollback for 0001_account_archiving.sql
-- Safe to run only if no account has been archived yet, or if losing the
-- archived flag (accounts reappear as active) is acceptable.
alter table accounts drop column archived_at;
