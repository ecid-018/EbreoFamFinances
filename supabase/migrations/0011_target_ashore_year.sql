-- 0011_target_ashore_year.sql
-- Phase 6 — the Plan view's "Ashore at" countdown needs a year to count to.
--
-- NUMBERING: the build spec's file names are labels only; this is the next
-- free number in this folder. See README.md.
--
-- The build-order table says Phase 6 touches no database, but the phase text
-- requires this column and is explicit that nothing is hard-coded. One
-- nullable column is the smallest way to honour both, so the table entry is
-- what gives: this migration exists.
--
-- Nullable on purpose. Null means "no date set", which the countdown renders
-- as nothing at all rather than as a year the household never chose.

alter table plan_settings
  add column target_ashore_year integer
    check (target_ashore_year is null or target_ashore_year between 2000 and 2100);
