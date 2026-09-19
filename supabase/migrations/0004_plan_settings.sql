-- 0004_plan_settings.sql
-- Phase 3 — one shared row of household plan figures.
--
-- NUMBERING: the build spec calls this 0003; everything is +1 after Phase 0
-- took a migration of its own. See README.md in this folder.
--
-- A singleton table, not a key/value store: `id boolean primary key check (id)`
-- means the only value the primary key can take is true, so a second row is
-- impossible rather than merely discouraged.
--
-- Discrete columns rather than jsonb, deliberately. Every read/write in this
-- app goes through a hand-written mapper in repo.js; a jsonb blob would put
-- the shape beyond the reach of both Postgres constraints and code review.
--
-- Every figure is NULLABLE and starts empty. The household enters its own
-- numbers in Settings — nothing is seeded here, and no amount belongs in this
-- repository, which is public.
create table plan_settings (
  id boolean primary key default true check (id),

  -- What comes in each paid month
  pay_household numeric(12,2),
  pay_hub numeric(12,2),

  -- How the hub amount is split. These six should sum to pay_hub; the app
  -- shows the difference live rather than enforcing it, because a plan in
  -- progress is legitimately unbalanced.
  split_vacation_reserve numeric(12,2),
  split_insurance numeric(12,2),
  split_goals numeric(12,2),
  split_trips numeric(12,2),
  split_retirement numeric(12,2),
  split_trading numeric(12,2),

  -- Targets and annual caps, used by the Plan view's guard-rails
  bank_floor_target numeric(12,2),
  vacation_reserve_target numeric(12,2),
  trading_cap_annual numeric(12,2),
  trips_annual numeric(12,2),
  insurance_annual numeric(12,2),
  windfall_goals_pct integer check (windfall_goals_pct between 0 and 100),

  -- The pre-sign-off rule: until the vacation reserve reaches its target, the
  -- vacation line is held at a fixed amount and the difference goes to goals.
  presignoff_active boolean not null default false,
  presignoff_vacation_amount numeric(12,2),

  -- Which account plays which part. on delete set null so archiving or
  -- deleting an account can never take the whole settings row with it.
  household_account_id uuid references accounts(id) on delete set null,
  hub_account_id uuid references accounts(id) on delete set null,
  trading_account_id uuid references accounts(id) on delete set null,
  retirement_account_id uuid references accounts(id) on delete set null,

  -- The three sinking funds, by goal
  vacation_goal_id uuid references goals(id) on delete set null,
  insurance_goal_id uuid references goals(id) on delete set null,
  trips_goal_id uuid references goals(id) on delete set null,

  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- The one row. Created here so the app only ever needs UPDATE, which is why
-- there is no insert policy below.
insert into plan_settings (id) values (true) on conflict do nothing;

alter table plan_settings enable row level security;

-- Shared household data, same shape as every other table: either member may
-- read and change it. No insert or delete policy, so RLS denies both by
-- default and the singleton cannot be duplicated or removed from the app.
create policy "plan_settings_select" on plan_settings for select to authenticated using (true);
create policy "plan_settings_update" on plan_settings for update to authenticated using (true) with check (true);
