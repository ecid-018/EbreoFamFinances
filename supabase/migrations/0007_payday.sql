-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- The SQL editor looks identical in staging and production; the badge is the
-- only tell. Staging first, then production -- and only after a backup
-- (Dashboard -> Database -> Backups).
-- ============================================================================
-- 0007_payday.sql
-- Phase 5 — Payday.
--
-- A payday is one event that fans out into several existing actions: income
-- landing in one or two accounts, transfers out of the hub, and goal
-- allocations that stay in the hub. Recording it as a single row with its
-- allocations means the app can later say "this is what happened on the 30th"
-- rather than showing eight unrelated entries.
--
-- Numbering: +1 against the spec, which calls this 0005. The offset has held
-- since 0001 went to the Phase 0 archiving column.
--
-- Additive: two new tables, one nullable column. Nothing renamed or retyped.

create table paydays (
  -- Client-generated, which is what makes apply_payday idempotent: a retry
  -- after a dropped connection carries the same id and does nothing twice.
  id uuid primary key,
  date date not null,
  budget_month_key text not null check (budget_month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  total numeric(12,2) not null,
  kind text not null default 'pay' check (kind in ('pay', 'windfall')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table payday_allocations (
  id uuid primary key default gen_random_uuid(),
  payday_id uuid not null references paydays(id) on delete cascade,
  kind text not null check (kind in ('income', 'transfer', 'goal')),
  -- Each allocation points at whichever row it actually created. All three are
  -- `on delete set null`: deleting the income or transfer later must not delete
  -- the record that a payday happened.
  income_id uuid references income(id) on delete set null,
  transfer_id uuid references transfers(id) on delete set null,
  goal_id uuid references goals(id) on delete set null,
  amount numeric(12,2) not null,
  label text
);

create index on payday_allocations (payday_id);
create index on paydays (budget_month_key);

-- Nullable: every existing income row stays null and keeps behaving exactly as
-- it did. Only income logged through a payday is classified.
alter table income add column kind text
  check (kind in ('pay', 'windfall', 'trading_payout', 'other'));

alter table paydays enable row level security;
alter table payday_allocations enable row level security;

create policy "paydays_select" on paydays for select to authenticated using (true);
create policy "paydays_insert" on paydays for insert to authenticated with check (created_by = auth.uid());
create policy "paydays_update" on paydays for update to authenticated using (true) with check (true);
create policy "paydays_delete" on paydays for delete to authenticated using (true);

create policy "payday_allocations_select" on payday_allocations for select to authenticated using (true);
create policy "payday_allocations_insert" on payday_allocations for insert to authenticated with check (true);
create policy "payday_allocations_update" on payday_allocations for update to authenticated using (true) with check (true);
create policy "payday_allocations_delete" on payday_allocations for delete to authenticated using (true);

-- One transaction, all or nothing.
--
-- Rather than copy the bodies of add_income / add_transfer / contribute_to_goal,
-- this CALLS them. They are already SECURITY DEFINER and run inside this
-- function's transaction, so every ledger row and balance update they normally
-- write happens here identically, and there is exactly one definition of what
-- "log income" means. That is the whole reason balances have not drifted so
-- far, and this phase does not add a second copy of the math.
create or replace function apply_payday(p_payday jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_payday_id uuid := (p_payday ->> 'id')::uuid;
  v_date date := (p_payday ->> 'date')::date;
  v_month text := p_payday ->> 'budget_month_key';
  v_kind text := coalesce(p_payday ->> 'kind', 'pay');
  v_hub uuid;
  v_hub_income numeric := 0;
  v_hub_out numeric := 0;
  v_total numeric := 0;
  v_item jsonb;
  v_new_id uuid;
begin
  if v_payday_id is null then raise exception 'payday id is required'; end if;

  -- Idempotent retry: the same id twice does nothing the second time.
  perform 1 from paydays where id = v_payday_id;
  if found then return; end if;

  select hub_account_id into v_hub from plan_settings where id = true;

  -- Validate BEFORE writing anything: what leaves the hub, plus what is
  -- allocated to goals still sitting in it, must not exceed what arrived there.
  -- Running this first means a rejected payday leaves no partial trace.
  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'incomes', '[]'::jsonb)) loop
    v_total := v_total + (v_item ->> 'amount')::numeric;
    if v_hub is not null and (v_item ->> 'account_id')::uuid = v_hub then
      v_hub_income := v_hub_income + (v_item ->> 'amount')::numeric;
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'transfers', '[]'::jsonb)) loop
    if v_hub is not null and (v_item ->> 'from_account_id')::uuid = v_hub then
      v_hub_out := v_hub_out + (v_item ->> 'amount')::numeric;
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'goal_allocations', '[]'::jsonb)) loop
    v_hub_out := v_hub_out + (v_item ->> 'amount')::numeric;
  end loop;

  if v_hub is not null and v_hub_out > v_hub_income then
    raise exception 'Payday allocates % out of the hub but only % arrived there', v_hub_out, v_hub_income;
  end if;

  insert into paydays (id, date, budget_month_key, total, kind, created_by)
  values (v_payday_id, v_date, v_month, v_total, v_kind, auth.uid());

  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'incomes', '[]'::jsonb)) loop
    v_new_id := coalesce((v_item ->> 'id')::uuid, gen_random_uuid());
    perform add_income(
      v_new_id, v_date, v_item ->> 'source', (v_item ->> 'amount')::numeric,
      (v_item ->> 'account_id')::uuid, v_month
    );
    -- add_income does not know about kinds; classify the row it just wrote.
    update income set kind = v_kind where id = v_new_id;
    insert into payday_allocations (payday_id, kind, income_id, amount, label)
    values (v_payday_id, 'income', v_new_id, (v_item ->> 'amount')::numeric, v_item ->> 'source');
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'transfers', '[]'::jsonb)) loop
    v_new_id := coalesce((v_item ->> 'id')::uuid, gen_random_uuid());
    -- Same-currency by construction: a payday splits one peso amount, so the
    -- two sides of the transfer are equal.
    perform add_transfer(
      v_new_id, v_date, (v_item ->> 'from_account_id')::uuid, (v_item ->> 'to_account_id')::uuid,
      (v_item ->> 'amount')::numeric, (v_item ->> 'amount')::numeric, v_item ->> 'note'
    );
    insert into payday_allocations (payday_id, kind, transfer_id, amount, label)
    values (v_payday_id, 'transfer', v_new_id, (v_item ->> 'amount')::numeric, v_item ->> 'note');
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'goal_allocations', '[]'::jsonb)) loop
    -- p_via = 'payday' deliberately: contribute_to_goal only moves an account
    -- balance for p_via = 'account'. Here the transfer above already moved the
    -- money, so this must raise `saved` WITHOUT touching a balance again.
    perform contribute_to_goal((v_item ->> 'goal_id')::uuid, (v_item ->> 'amount')::numeric, null, 'payday');
    insert into payday_allocations (payday_id, kind, goal_id, amount, label)
    values (v_payday_id, 'goal', (v_item ->> 'goal_id')::uuid, (v_item ->> 'amount')::numeric, v_item ->> 'label');
  end loop;
end;
$$;

revoke all on function apply_payday(jsonb) from public;
grant execute on function apply_payday(jsonb) to authenticated;
