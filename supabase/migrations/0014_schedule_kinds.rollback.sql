-- ============================================================================
-- STOP. CHECK THE PROJECT BADGE IN THE TOP BAR BEFORE YOU RUN THIS.
-- This UNDOES a migration and can destroy data. Read what it drops first.
-- The SQL editor looks identical in staging and production.
-- ============================================================================
-- Rollback for 0014_schedule_kinds.sql
--
-- DESTROYS every 'incoming' and 'task' item. Those rows only make sense with
-- the kind column, so dropping it would leave them looking like bills that
-- nobody ever pays. They are deleted deliberately rather than left to rot.
-- Bills themselves are untouched.
--
-- Ledger rows written by complete_schedule_item are NOT removed: the ledger is
-- append-only by design and those entries record things that really happened.

begin;

delete from bills where kind in ('incoming', 'task');

drop function if exists complete_schedule_item(uuid);

-- pay_bill goes back to owning its own date arithmetic, because advance_bill
-- is about to stop existing.
create or replace function pay_bill(
  p_bill_id uuid, p_transaction_id uuid, p_date date, p_amount numeric,
  p_note text, p_envelope_id uuid, p_account_id uuid
) returns date
language plpgsql security definer set search_path = public as $$
declare
  v_bill bills%rowtype;
  v_next date;
  v_last_day integer;
begin
  select * into v_bill from bills where id = p_bill_id;
  if not found then raise exception 'Bill not found'; end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'A bill payment must be greater than zero';
  end if;

  perform add_transaction(p_transaction_id, p_date, p_amount, p_note, p_envelope_id, p_account_id);
  update transactions set bill_id = p_bill_id where id = p_transaction_id;

  v_next := coalesce(v_bill.next_due, p_date) + case v_bill.period
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

  if v_bill.goal_id is not null then
    perform withdraw_from_goal(v_bill.goal_id, p_amount, v_bill.name);
  end if;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (p_date, 'Bill', 'Bill paid', v_bill.name, p_amount, auth.uid());

  return v_next;
end;
$$;

drop function if exists advance_bill(uuid);
drop index if exists bills_kind_idx;

alter table bills
  drop column kind,
  drop column remind_days,
  drop column notes;

commit;
