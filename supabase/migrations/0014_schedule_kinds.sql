-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- The SQL editor looks identical in staging and production; the badge is the
-- only tell. Staging first, then production -- and only after a backup
-- (Dashboard -> Database -> Backups).
-- ============================================================================
-- 0014_schedule_kinds.sql
-- 10d — bills become a general schedule.
--
-- Three things recur, not one: money we PAY (bills, premiums, amortizations),
-- money we EXPECT (the allotment, rent, an instalment), and JOBS with a date
-- (open the new MP2 account each January). They share every field that
-- matters -- a name, an amount, a rhythm, a next date -- so they share the
-- table rather than getting two more that would each need their own reminder
-- logic, their own "due soon" query and their own screen.
--
-- The table keeps the name `bills` because renaming is forbidden and churn
-- helps nobody. The app calls it the Schedule.
--
-- Every column is defaulted, so existing bills keep behaving exactly as they
-- do: they all become kind 'bill', which is what they already were.

alter table bills
  add column kind text not null default 'bill' check (kind in ('bill', 'incoming', 'task')),
  -- How many days ahead to send a push reminder. NO CONSUMER YET: web push
  -- lands in a later PR. It is here because the column is free to add now and
  -- would otherwise cost another hand-applied migration on the same table.
  add column remind_days integer[] not null default '{7,1,0}',
  add column notes text;

create index bills_kind_idx on bills (kind) where is_active;

-- The due-date rule, lifted out of pay_bill so that completing a task and
-- receiving an expected payment advance a date the same way paying a bill
-- does. Three copies of this arithmetic would eventually be three answers.
--
-- Advances from the date it was DUE, not today: being late must not push
-- every future occurrence later too. Then snaps back to the intended day of
-- the month where that month is long enough, so a 31st does not become a 28th
-- permanently after one February.
create or replace function advance_bill(p_bill_id uuid) returns date
language plpgsql security definer set search_path = public as $$
declare
  v_bill bills%rowtype;
  v_next date;
  v_last_day integer;
begin
  select * into v_bill from bills where id = p_bill_id;
  if not found then raise exception 'Schedule item not found'; end if;

  v_next := coalesce(v_bill.next_due, current_date) + case v_bill.period
    when 'monthly' then interval '1 month'
    when 'quarterly' then interval '3 months'
    when 'semiannual' then interval '6 months'
    when 'annual' then interval '12 months'
  end;

  if v_bill.due_day is not null then
    v_last_day := extract(day from (date_trunc('month', v_next) + interval '1 month - 1 day'))::integer;
    v_next := (date_trunc('month', v_next))::date + (least(v_bill.due_day, v_last_day) - 1);
  end if;

  update bills set next_due = v_next, updated_at = now() where id = p_bill_id;
  return v_next;
end;
$$;

revoke all on function advance_bill(uuid) from public;
grant execute on function advance_bill(uuid) to authenticated;

-- Marks a non-payment item done: an expected payment that arrived, or a job
-- that got done. No money moves -- whatever money was involved was already
-- recorded by the income or expense the household logged separately -- so
-- this only moves the date on and leaves a trail.
create or replace function complete_schedule_item(p_bill_id uuid) returns date
language plpgsql security definer set search_path = public as $$
declare
  v_bill bills%rowtype;
  v_next date;
begin
  select * into v_bill from bills where id = p_bill_id;
  if not found then raise exception 'Schedule item not found'; end if;

  -- A bill is completed by PAYING it, which is what pay_bill is for: that
  -- path writes the expense and moves the money. Letting a bill be ticked off
  -- here would advance its date with no expense recorded against it.
  if v_bill.kind = 'bill' then
    raise exception 'Use pay_bill to complete a bill, so the expense is recorded';
  end if;

  v_next := advance_bill(p_bill_id);

  insert into ledger (date, domain, type, name, amount, created_by)
  values (current_date, 'Schedule',
          case v_bill.kind when 'incoming' then 'Expected money received' else 'Task done' end,
          v_bill.name, coalesce(v_bill.amount, 0), auth.uid());

  return v_next;
end;
$$;

revoke all on function complete_schedule_item(uuid) from public;
grant execute on function complete_schedule_item(uuid) to authenticated;

-- Unchanged behaviour; the date arithmetic now comes from advance_bill so
-- there is one copy of it rather than two.
create or replace function pay_bill(
  p_bill_id uuid,
  p_transaction_id uuid,
  p_date date,
  p_amount numeric,
  p_note text,
  p_envelope_id uuid,
  p_account_id uuid
) returns date
language plpgsql security definer set search_path = public as $$
declare
  v_bill bills%rowtype;
  v_next date;
begin
  select * into v_bill from bills where id = p_bill_id;
  if not found then raise exception 'Bill not found'; end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'A bill payment must be greater than zero';
  end if;

  perform add_transaction(p_transaction_id, p_date, p_amount, p_note, p_envelope_id, p_account_id);
  update transactions set bill_id = p_bill_id where id = p_transaction_id;

  v_next := advance_bill(p_bill_id);

  if v_bill.goal_id is not null then
    perform withdraw_from_goal(v_bill.goal_id, p_amount, v_bill.name);
  end if;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (p_date, 'Bill', 'Bill paid', v_bill.name, p_amount, auth.uid());

  return v_next;
end;
$$;
