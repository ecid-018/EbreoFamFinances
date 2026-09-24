-- 0012_bills.sql
-- Phase 8 — bills and subscriptions.
--
-- NUMBERING: the build spec calls this 0008; its file names are labels only.
-- This is the next free number in this folder. See README.md.
--
-- A bill is a REMINDER PLUS A PREFILLED FORM. Nothing here pays anything on a
-- schedule, and nothing moves money without one of the household tapping it.

create table bills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(12,2) not null,
  period text not null check (period in ('monthly','quarterly','semiannual','annual')),
  -- Which day of the month it falls on. Kept alongside next_due so a bill due
  -- on the 31st returns to the 31st after a month that has only 30 days,
  -- instead of drifting earlier and staying there.
  due_day integer check (due_day between 1 and 31),
  next_due date,
  account_id uuid references accounts(id) on delete set null,
  envelope_id uuid references envelopes(id) on delete set null,
  -- The sinking fund that pays it, if any. Paying the bill draws this fund
  -- down by the same amount, so a fund that exists to meet a premium actually
  -- falls when the premium is met.
  goal_id uuid references goals(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Which bill an expense paid, if any. Nullable, so every existing expense and
-- every existing insert path is untouched.
alter table transactions add column bill_id uuid references bills(id) on delete set null;

create index bills_next_due_idx on bills (next_due) where is_active;
create index transactions_bill_id_idx on transactions (bill_id);

alter table bills enable row level security;

create policy "bills_select" on bills for select to authenticated using (true);
create policy "bills_insert" on bills for insert to authenticated with check (created_by = auth.uid());
create policy "bills_update" on bills for update to authenticated using (true) with check (true);
create policy "bills_delete" on bills for delete to authenticated using (true);

-- Paying a bill is three things that must all happen or none of them: the
-- expense, the bill moving to its next due date, and the sinking fund going
-- down if one funds it.
--
-- Done from the client that would be three round trips, and a failure after
-- the first would leave an expense logged against a bill still showing as due.
-- add_transaction is called rather than repeated: it is the one place that
-- writes an expense, deducts the account and appends to ledger.
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
  v_last_day integer;
begin
  select * into v_bill from bills where id = p_bill_id;
  if not found then raise exception 'Bill not found'; end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'A bill payment must be greater than zero';
  end if;

  perform add_transaction(p_transaction_id, p_date, p_amount, p_note, p_envelope_id, p_account_id);
  update transactions set bill_id = p_bill_id where id = p_transaction_id;

  -- Advance from the date it was due, not the date it was paid: paying late
  -- must not push every future due date later too.
  v_next := coalesce(v_bill.next_due, p_date) + case v_bill.period
    when 'monthly' then interval '1 month'
    when 'quarterly' then interval '3 months'
    when 'semiannual' then interval '6 months'
    when 'annual' then interval '12 months'
  end;

  -- Snap back to the intended day of the month where that month is long
  -- enough. Without this, one pass through February moves a bill due on the
  -- 30th to the 28th permanently.
  if v_bill.due_day is not null then
    v_last_day := extract(day from (date_trunc('month', v_next) + interval '1 month - 1 day'))::integer;
    v_next := (date_trunc('month', v_next))::date + (least(v_bill.due_day, v_last_day) - 1);
  end if;

  update bills set next_due = v_next, updated_at = now() where id = p_bill_id;

  -- The fund that exists to meet this bill goes down by what the bill took.
  -- withdraw_from_goal refuses to take more than is saved, so a fund that is
  -- short fails the whole payment rather than going negative.
  if v_bill.goal_id is not null then
    perform withdraw_from_goal(v_bill.goal_id, p_amount, v_bill.name);
  end if;

  insert into ledger (date, domain, type, name, amount, created_by)
  values (p_date, 'Bill', 'Bill paid', v_bill.name, p_amount, auth.uid());

  return v_next;
end;
$$;

revoke all on function pay_bill(uuid, uuid, date, numeric, text, uuid, uuid) from public;
grant execute on function pay_bill(uuid, uuid, date, numeric, text, uuid, uuid) to authenticated;
