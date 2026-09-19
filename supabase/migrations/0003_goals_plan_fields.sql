-- 0003_goals_plan_fields.sql
-- Phase 2 — goals gain ordering, dates, a home account and sinking funds.
--
-- NUMBERING: the build spec calls this 0002; everything is +1 after Phase 0
-- took a migration of its own. See README.md in this folder.
--
-- Every column is nullable or defaulted, so existing goals are untouched and
-- keep behaving exactly as they do today until someone edits them.
--
-- goal_group exists because one real-world goal can be spread across several
-- accounts (the emergency fund is). Model that as several goal rows, each
-- with its own held_in_account_id, sharing a goal_group label; the Plan view
-- sums a group into one progress bar.

alter table goals
  add column priority integer,
  add column target_date date,
  add column held_in_account_id uuid references accounts(id) on delete set null,
  add column is_sinking_fund boolean not null default false,
  add column goal_group text,
  add column archived_at timestamptz;

-- Spending a sinking fund: the insurance premium comes due, the vacation
-- happens. `saved` goes down, but NO account balance moves — the expense or
-- transfer that actually spent the money already did that. Without this, the
-- only way to reduce `saved` would be to edit the goal, which leaves no trail.
create or replace function withdraw_from_goal(
  p_goal_id uuid, p_amount numeric, p_note text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_goal_name text;
  v_saved numeric;
begin
  select name, saved into v_goal_name, v_saved from goals where id = p_goal_id;
  if not found then raise exception 'Goal not found'; end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Withdrawal must be greater than zero';
  end if;

  -- A goal cannot hold less than nothing. Refusing is better than silently
  -- clamping, which would hide a mistyped amount.
  if p_amount > v_saved then
    raise exception 'Cannot withdraw % from %: only % is saved', p_amount, v_goal_name, v_saved;
  end if;

  update goals set saved = saved - p_amount, updated_at = now() where id = p_goal_id;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (
    current_date,
    'Goal',
    'Withdrawn from goal',
    coalesce(nullif(p_note, ''), v_goal_name),
    p_amount,
    auth.uid()
  );
end;
$$;

revoke all on function withdraw_from_goal(uuid, numeric, text) from public;
grant execute on function withdraw_from_goal(uuid, numeric, text) to authenticated;

-- Same signature as before; only the label list grows, so existing callers are
-- unaffected. 'payday' is bookkeeping only (Phase 5 moves the money itself).
create or replace function contribute_to_goal(
  p_goal_id uuid, p_amount numeric, p_account_id uuid, p_via text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_goal_name text;
  v_account_name text;
  v_label text;
begin
  select name into v_goal_name from goals where id = p_goal_id;
  if not found then return; end if;

  update goals set saved = saved + p_amount where id = p_goal_id;

  v_label := case p_via
    when 'account' then 'Funded from account'
    when 'savingsEnvelope' then 'Funded via Savings envelope'
    when 'income' then 'Funded via new income'
    when 'payday' then 'Funded on payday'
    else 'Funded'
  end;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (current_date, 'Goal', v_label, v_goal_name, p_amount, auth.uid());

  if p_via = 'account' and p_account_id is not null then
    select name into v_account_name from accounts where id = p_account_id;
    update accounts set balance = balance - p_amount, updated_at = now() where id = p_account_id;
    insert into ledger (date, domain, type, name, amount, created_by)
    values (current_date, 'Account', 'Deducted for goal contribution', v_account_name, p_amount, auth.uid());
  end if;
end;
$$;
