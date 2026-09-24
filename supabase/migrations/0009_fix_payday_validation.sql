-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- The SQL editor looks identical in staging and production; the badge is the
-- only tell. Staging first, then production -- and only after a backup
-- (Dashboard -> Database -> Backups).
-- ============================================================================
-- 0009_fix_payday_validation.sql
-- Fixes apply_payday, which 0008 left unable to run at all.
--
-- 0008 accumulated each account's inflow and outflow in a temp table and
-- cleared it with an unqualified `delete from _payday_flow;`. Supabase refuses
-- unqualified DELETE and UPDATE, so EVERY call raised "DELETE requires a WHERE
-- clause" before reaching any of the work. Nothing was ever written, because
-- validation runs first — but no payday could be applied either.
--
-- The temp table is gone rather than patched. The same check is one query over
-- the payload, which needs no scratch state, cannot leak between calls in a
-- session, and is honest about being a single aggregation.
--
-- Replaces a function only. No tables, columns or data touched.

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
  v_bad_account uuid;
  v_bad_out numeric;
  v_bad_in numeric;
begin
  if v_payday_id is null then raise exception 'payday id is required'; end if;

  perform 1 from paydays where id = v_payday_id;
  if found then return; end if;

  select coalesce(sum((i ->> 'amount')::numeric), 0) into v_total
  from jsonb_array_elements(coalesce(p_payday -> 'incomes', '[]'::jsonb)) i;

  -- Every source account must cover what the payday takes out of it. Runs
  -- before anything is written, so a rejected payday leaves no partial trace.
  -- A goal allocation keeps the money where it is but is still spoken for, so
  -- it counts against the account funding it.
  select f.account_id, sum(f.outflow), sum(f.inflow)
    into v_bad_account, v_bad_out, v_bad_in
  from (
    select (i ->> 'account_id')::uuid as account_id,
           (i ->> 'amount')::numeric as inflow, 0::numeric as outflow
    from jsonb_array_elements(coalesce(p_payday -> 'incomes', '[]'::jsonb)) i
    union all
    select (t ->> 'from_account_id')::uuid, 0::numeric, (t ->> 'amount')::numeric
    from jsonb_array_elements(coalesce(p_payday -> 'transfers', '[]'::jsonb)) t
    union all
    select (g ->> 'source_account_id')::uuid, 0::numeric, (g ->> 'amount')::numeric
    from jsonb_array_elements(coalesce(p_payday -> 'goal_allocations', '[]'::jsonb)) g
  ) f
  where f.account_id is not null
  group by f.account_id
  having sum(f.outflow) > sum(f.inflow)
  limit 1;

  if v_bad_account is not null then
    raise exception 'Payday takes % out of % but only % arrived there',
      v_bad_out, coalesce((select name from accounts where id = v_bad_account), 'an account'), v_bad_in;
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
