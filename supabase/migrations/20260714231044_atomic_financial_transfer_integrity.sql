-- Keep all linked financial movements inside one Postgres transaction.
-- The client supplies a stable transaction UUID so retries are idempotent.

drop function if exists public.record_debt_payment(uuid,uuid,numeric,date,text);
drop function if exists public.record_goal_contribution(uuid,uuid,numeric,text,date,text);

create or replace function public.validate_transfer_source_balance()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_source public.accounts;
  v_destination public.accounts;
  v_available numeric(19,4);
begin
  if new.transaction_type <> 'transfer'
    or new.status <> 'Cleared'
    or new.archived_at is not null then
    return new;
  end if;

  if new.from_account_id = new.to_account_id then
    raise exception 'Source and destination accounts must be different';
  end if;

  select * into v_source
  from public.accounts
  where id = new.from_account_id
    and user_id = new.user_id
    and archived_at is null
  for update;

  if not found then
    raise exception 'Source account not found';
  end if;
  if v_source.account_type = 'liability' then
    raise exception 'Liability accounts cannot fund transfers';
  end if;

  select * into v_destination
  from public.accounts
  where id = new.to_account_id
    and user_id = new.user_id
    and archived_at is null;
  if not found then
    raise exception 'Destination account not found';
  end if;
  if v_destination.currency <> v_source.currency or new.currency <> v_source.currency then
    raise exception 'Transfer accounts and transaction must use the same currency';
  end if;

  v_available := v_source.balance;
  if tg_op = 'UPDATE'
    and old.transaction_type = 'transfer'
    and old.status = 'Cleared'
    and old.archived_at is null
    and old.from_account_id = new.from_account_id then
    v_available := v_available + old.amount;
  end if;

  if v_available < new.amount then
    raise exception 'Transfer amount exceeds the available source account balance';
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_validate_transfer_source on public.transactions;
create trigger transactions_validate_transfer_source
before insert or update on public.transactions
for each row execute function public.validate_transfer_source_balance();

create or replace function public.record_debt_payment(
  p_debt_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_paid_on date,
  p_notes text default null,
  p_transaction_id uuid default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_debt public.debts;
  v_account public.accounts;
  v_transaction_id uuid := coalesce(p_transaction_id, gen_random_uuid());
  v_category_id uuid;
  v_existing_debt_id uuid;
  v_existing_amount numeric(19,4);
  v_existing_account_id uuid;
  v_existing_paid_on date;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Payment must be greater than zero'; end if;
  if p_paid_on is null then raise exception 'Payment date is required'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_transaction_id::text, 0));
  select dp.debt_id, dp.amount, t.account_id, dp.paid_on
  into v_existing_debt_id, v_existing_amount, v_existing_account_id, v_existing_paid_on
  from public.debt_payments dp
  join public.transactions t on t.id = dp.transaction_id and t.user_id = dp.user_id
  where dp.transaction_id = v_transaction_id and dp.user_id = v_user_id;

  if found then
    if v_existing_debt_id = p_debt_id
      and v_existing_amount = p_amount
      and v_existing_account_id = p_account_id
      and v_existing_paid_on = p_paid_on then
      return v_transaction_id;
    end if;
    raise exception 'Transaction retry key conflicts with another debt payment';
  end if;
  if exists (select 1 from public.transactions where id = v_transaction_id and user_id = v_user_id) then
    raise exception 'Transaction retry key is already in use';
  end if;

  select * into v_debt
  from public.debts
  where id = p_debt_id and user_id = v_user_id and archived_at is null
  for update;
  if not found then raise exception 'Debt not found'; end if;
  if p_amount > v_debt.current_balance then raise exception 'Payment exceeds the remaining debt balance'; end if;

  select * into v_account
  from public.accounts
  where id = p_account_id and user_id = v_user_id and archived_at is null
  for update;
  if not found then raise exception 'Payment account not found'; end if;
  if v_account.account_type = 'liability' then raise exception 'Choose a funded account for this payment'; end if;
  if v_account.balance < p_amount then raise exception 'Payment exceeds the available source account balance'; end if;

  select id into v_category_id
  from public.budget_categories
  where user_id = v_user_id
    and kind = 'category'
    and name = 'Debt payments'
    and archived_at is null
  limit 1;

  insert into public.transactions (
    id,user_id,transaction_type,flow_kind,account_id,category_id,merchant,
    amount,currency,occurred_on,occurred_at,status,notes,recurring
  ) values (
    v_transaction_id,v_user_id,'expense','debt_payment',p_account_id,v_category_id,
    v_debt.creditor,p_amount,v_account.currency,p_paid_on,'12:00','Cleared',
    coalesce(p_notes,'Confirmed debt payment'),false
  );

  update public.debts
  set current_balance = current_balance - p_amount
  where id = p_debt_id and user_id = v_user_id;

  insert into public.debt_payments (user_id,debt_id,transaction_id,amount,paid_on)
  values (v_user_id,p_debt_id,v_transaction_id,p_amount,p_paid_on);

  return v_transaction_id;
end;
$$;

create or replace function public.record_goal_contribution(
  p_goal_id uuid,
  p_counterparty_account_id uuid,
  p_amount numeric,
  p_contribution_type text,
  p_contributed_on date,
  p_notes text default null,
  p_transaction_id uuid default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_goal public.goals;
  v_linked public.accounts;
  v_counterparty public.accounts;
  v_transaction_id uuid := coalesce(p_transaction_id, gen_random_uuid());
  v_from uuid;
  v_to uuid;
  v_goal_total numeric(19,4);
  v_existing_goal_id uuid;
  v_existing_amount numeric(19,4);
  v_existing_type text;
  v_existing_from uuid;
  v_existing_to uuid;
  v_existing_date date;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if p_contribution_type not in ('contribution','withdrawal') then raise exception 'Invalid contribution type'; end if;
  if p_contributed_on is null then raise exception 'Contribution date is required'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_transaction_id::text, 0));

  select * into v_goal
  from public.goals
  where id = p_goal_id and user_id = v_user_id and archived_at is null
  for update;
  if not found then raise exception 'Goal not found'; end if;
  if v_goal.linked_account_id is null then raise exception 'Goal must be linked to a savings account'; end if;
  if v_goal.linked_account_id = p_counterparty_account_id then
    raise exception 'Source and destination accounts must be different';
  end if;

  perform 1
  from public.accounts
  where user_id = v_user_id
    and archived_at is null
    and id in (v_goal.linked_account_id, p_counterparty_account_id)
  order by id
  for update;

  select * into v_linked
  from public.accounts
  where id = v_goal.linked_account_id and user_id = v_user_id and archived_at is null;
  select * into v_counterparty
  from public.accounts
  where id = p_counterparty_account_id and user_id = v_user_id and archived_at is null;

  if v_linked.id is null then raise exception 'Linked savings account not found'; end if;
  if v_counterparty.id is null then raise exception 'Selected account not found'; end if;
  if v_linked.account_type not in ('savings','investment','pillar') then
    raise exception 'Goal must be linked to a savings, investment, or Pillar 3a account';
  end if;
  if v_counterparty.account_type = 'liability' then
    raise exception 'Choose a funded account instead of a liability account';
  end if;
  if v_linked.currency <> v_counterparty.currency then
    raise exception 'Selected account must use the same currency as the linked savings account';
  end if;

  if p_contribution_type = 'contribution' then
    v_from := v_counterparty.id;
    v_to := v_linked.id;
  else
    v_from := v_linked.id;
    v_to := v_counterparty.id;
  end if;

  select gc.goal_id, gc.amount, gc.contribution_type, t.from_account_id, t.to_account_id, gc.contributed_on
  into v_existing_goal_id, v_existing_amount, v_existing_type, v_existing_from, v_existing_to, v_existing_date
  from public.goal_contributions gc
  join public.transactions t on t.id = gc.transaction_id and t.user_id = gc.user_id
  where gc.transaction_id = v_transaction_id and gc.user_id = v_user_id;

  if found then
    if v_existing_goal_id = p_goal_id
      and v_existing_amount = p_amount
      and v_existing_type = p_contribution_type
      and v_existing_from = v_from
      and v_existing_to = v_to
      and v_existing_date = p_contributed_on then
      return v_transaction_id;
    end if;
    raise exception 'Transaction retry key conflicts with another goal movement';
  end if;
  if exists (select 1 from public.transactions where id = v_transaction_id and user_id = v_user_id) then
    raise exception 'Transaction retry key is already in use';
  end if;

  if p_contribution_type = 'contribution' then
    if v_counterparty.balance < p_amount then
      raise exception 'Contribution exceeds the available source account balance';
    end if;
  else
    select v_goal.base_amount + coalesce(sum(
      case when contribution_type = 'contribution' then amount else -amount end
    ), 0)
    into v_goal_total
    from public.goal_contributions
    where user_id = v_user_id and goal_id = p_goal_id;
    if p_amount > v_goal_total then raise exception 'Withdrawal exceeds the funded goal balance'; end if;
    if p_amount > v_linked.balance then raise exception 'Withdrawal exceeds the linked savings account balance'; end if;
  end if;

  insert into public.transactions (
    id,user_id,transaction_type,flow_kind,from_account_id,to_account_id,merchant,
    amount,currency,occurred_on,occurred_at,status,notes,recurring
  ) values (
    v_transaction_id,v_user_id,'transfer',
    case when p_contribution_type = 'contribution' then 'goal_contribution' else 'goal_withdrawal' end,
    v_from,v_to,v_goal.name,p_amount,v_linked.currency,p_contributed_on,'12:00','Cleared',
    coalesce(p_notes,case when p_contribution_type = 'contribution' then 'Goal contribution' else 'Goal withdrawal' end),false
  );

  insert into public.goal_contributions (
    user_id,goal_id,transaction_id,contribution_type,amount,contributed_on
  ) values (
    v_user_id,p_goal_id,v_transaction_id,p_contribution_type,p_amount,p_contributed_on
  );

  return v_transaction_id;
end;
$$;

revoke execute on function public.validate_transfer_source_balance() from public, anon, authenticated;
revoke execute on function public.record_debt_payment(uuid,uuid,numeric,date,text,uuid) from public, anon;
revoke execute on function public.record_goal_contribution(uuid,uuid,numeric,text,date,text,uuid) from public, anon;
grant execute on function public.record_debt_payment(uuid,uuid,numeric,date,text,uuid) to authenticated;
grant execute on function public.record_goal_contribution(uuid,uuid,numeric,text,date,text,uuid) to authenticated;
