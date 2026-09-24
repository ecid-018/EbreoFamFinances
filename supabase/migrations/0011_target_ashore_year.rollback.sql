-- Rollback for 0011_target_ashore_year.sql
--
-- Loses the year the household set. That is one number they can retype, so
-- unlike 0010 this rollback is safe to run.

alter table plan_settings
  drop column target_ashore_year;
