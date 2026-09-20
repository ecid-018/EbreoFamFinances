-- 0008_split_line_sources.sql
-- Which account each split line is actually paid from.
--
-- plan_settings has one hub_account_id and the payday assumed all six lines
-- split from it. In practice the allotment lands mostly in the household
-- account, and the goals it funds (PAFCPIC, Metrobank) are held there too —
-- so paying the goals line out of the hub would mean shipping money from one
-- BPI to the other and straight back out again, money that started in the
-- household account to begin with.
--
-- SPARSE, like envelope_budgets and month_modes: a line with no row is paid
-- from the hub, so an empty table behaves exactly as before this migration.
--
-- Additive: new table only.

create table split_line_sources (
  line_key text primary key check (line_key in (
    'splitGoals', 'splitRetirement', 'splitTrading',
    'splitInsurance', 'splitTrips', 'splitVacationReserve'
  )),
  -- on delete set null rather than cascade: losing an account should fall back
  -- to the hub, not silently delete the household's routing decision.
  account_id uuid references accounts(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table split_line_sources enable row level security;

create policy "split_line_sources_select" on split_line_sources for select to authenticated using (true);
create policy "split_line_sources_insert" on split_line_sources for insert to authenticated with check (created_by = auth.uid());
create policy "split_line_sources_update" on split_line_sources for update to authenticated using (true) with check (true);
create policy "split_line_sources_delete" on split_line_sources for delete to authenticated using (true);

-- apply_payday must now balance EVERY source account, not just the hub. A
-- payday that takes more out of an account than arrived in it is rejected
-- before anything is written, exactly as before — there are simply several
-- accounts to check instead of one.
create or replace function apply_payday(p_payday jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_payday_id uuid := (p_payday ->> 'id')::uuid;
  v_date date := (p_payday ->> 'date')::date;
  v_month text := p_payday ->> 'budget_month_key';
  v_kind text := coalesce(p_payday ->> 'kind', 'pay');
  v_total numeric := 0;
  v_item jsonb;
  v_new_id uuid;
  v_bad record;
begin
  if v_payday_id is null then raise exception 'payday id is required'; end if;

  perform 1 from paydays where id = v_payday_id;
  if found then return; end if;

  -- Validate before writing anything, so a rejected payday leaves no trace.
  create temp table if not exists _payday_flow (account_id uuid, inflow numeric, outflow numeric) on commit drop;
  delete from _payday_flow;

  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'incomes', '[]'::jsonb)) loop
    v_total := v_total + (v_item ->> 'amount')::numeric;
    insert into _payday_flow values ((v_item ->> 'account_id')::uuid, (v_item ->> 'amount')::numeric, 0);
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'transfers', '[]'::jsonb)) loop
    insert into _payday_flow values ((v_item ->> 'from_account_id')::uuid, 0, (v_item ->> 'amount')::numeric);
  end loop;

  -- A goal allocation keeps the money where it is, but it is still spoken for:
  -- it must be counted against the account it is funded from.
  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'goal_allocations', '[]'::jsonb)) loop
    insert into _payday_flow values ((v_item ->> 'source_account_id')::uuid, 0, (v_item ->> 'amount')::numeric);
  end loop;

  select account_id, sum(inflow) as inflow, sum(outflow) as outflow into v_bad
  from _payday_flow where account_id is not null
  group by account_id having sum(outflow) > sum(inflow) limit 1;

  if v_bad.account_id is not null then
    raise exception 'Payday allocates % out of account % but only % arrived there',
      v_bad.outflow, (select name from accounts where id = v_bad.account_id), v_bad.inflow;
  end if;

  insert into paydays (id, date, budget_month_key, total, kind, created_by)
  values (v_payday_id, v_date, v_month, v_total, v_kind, auth.uid());

  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'incomes', '[]'::jsonb)) loop
    v_new_id := coalesce((v_item ->> 'id')::uuid, gen_random_uuid());
    perform add_income(v_new_id, v_date, v_item ->> 'source', (v_item ->> 'amount')::numeric,
                       (v_item ->> 'account_id')::uuid, v_month);
    update income set kind = v_kind where id = v_new_id;
    insert into payday_allocations (payday_id, kind, income_id, amount, label)
    values (v_payday_id, 'income', v_new_id, (v_item ->> 'amount')::numeric, v_item ->> 'source');
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'transfers', '[]'::jsonb)) loop
    v_new_id := coalesce((v_item ->> 'id')::uuid, gen_random_uuid());
    perform add_transfer(v_new_id, v_date, (v_item ->> 'from_account_id')::uuid,
                         (v_item ->> 'to_account_id')::uuid,
                         (v_item ->> 'amount')::numeric, (v_item ->> 'amount')::numeric, v_item ->> 'note');
    insert into payday_allocations (payday_id, kind, transfer_id, amount, label)
    values (v_payday_id, 'transfer', v_new_id, (v_item ->> 'amount')::numeric, v_item ->> 'note');
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_payday -> 'goal_allocations', '[]'::jsonb)) loop
    perform contribute_to_goal((v_item ->> 'goal_id')::uuid, (v_item ->> 'amount')::numeric, null, 'payday');
    insert into payday_allocations (payday_id, kind, goal_id, amount, label)
    values (v_payday_id, 'goal', (v_item ->> 'goal_id')::uuid, (v_item ->> 'amount')::numeric, v_item ->> 'label');
  end loop;
end;
$$;

revoke all on function apply_payday(jsonb) from public;
grant execute on function apply_payday(jsonb) to authenticated;
