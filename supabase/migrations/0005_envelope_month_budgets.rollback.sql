-- Rollback for 0005_envelope_month_budgets.sql
--
-- Safe: envelopes.monthly_budget was never modified by this phase, so dropping
-- the table returns every month to the single shared figure it resolved to
-- before. Any month-specific budgets entered since the migration are lost —
-- that is the intended meaning of rolling this back.

drop table if exists envelope_budgets;
