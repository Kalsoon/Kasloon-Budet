-- Ledger effects live in the database so every client gets identical, atomic balances.
create or replace function public.apply_transaction_balance()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op in ('UPDATE','DELETE') and old.status = 'Cleared' and old.archived_at is null then
    if old.transaction_type = 'income' then
      update public.accounts set balance = balance - old.amount where id = old.account_id and user_id = old.user_id;
    elsif old.transaction_type = 'expense' then
      update public.accounts set balance = balance + old.amount where id = old.account_id and user_id = old.user_id;
    else
      update public.accounts set balance = balance + old.amount where id = old.from_account_id and user_id = old.user_id;
      update public.accounts set balance = balance - old.amount where id = old.to_account_id and user_id = old.user_id;
    end if;
  end if;

  if tg_op in ('INSERT','UPDATE') and new.status = 'Cleared' and new.archived_at is null then
    if new.transaction_type = 'income' then
      update public.accounts set balance = balance + new.amount where id = new.account_id and user_id = new.user_id;
    elsif new.transaction_type = 'expense' then
      update public.accounts set balance = balance - new.amount where id = new.account_id and user_id = new.user_id;
    else
      update public.accounts set balance = balance - new.amount where id = new.from_account_id and user_id = new.user_id;
      update public.accounts set balance = balance + new.amount where id = new.to_account_id and user_id = new.user_id;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger transactions_apply_balance
after insert or update or delete on public.transactions
for each row execute function public.apply_transaction_balance();

create or replace function public.record_debt_payment(
  p_debt_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_paid_on date,
  p_notes text default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_debt public.debts;
  v_account public.accounts;
  v_transaction_id uuid := gen_random_uuid();
  v_category_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount <= 0 then raise exception 'Payment must be greater than zero'; end if;
  select * into v_debt from public.debts where id = p_debt_id and user_id = v_user_id and archived_at is null for update;
  if not found then raise exception 'Debt not found'; end if;
  if p_amount > v_debt.current_balance then raise exception 'Payment exceeds current debt balance'; end if;
  select * into v_account from public.accounts where id = p_account_id and user_id = v_user_id and archived_at is null for update;
  if not found then raise exception 'Payment account not found'; end if;
  select id into v_category_id from public.budget_categories where user_id=v_user_id and kind='category' and name='Debt payments' and archived_at is null limit 1;

  insert into public.transactions (id,user_id,transaction_type,flow_kind,account_id,category_id,merchant,amount,currency,occurred_on,occurred_at,status,notes,recurring)
  values (v_transaction_id,v_user_id,'expense','debt_payment',p_account_id,v_category_id,v_debt.creditor,p_amount,v_account.currency,p_paid_on,'12:00','Cleared',coalesce(p_notes,'Confirmed debt payment'),false);
  update public.debts set current_balance = current_balance - p_amount where id = p_debt_id and user_id = v_user_id;
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
  p_notes text default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_goal public.goals;
  v_linked public.accounts;
  v_counterparty public.accounts;
  v_transaction_id uuid := gen_random_uuid();
  v_from uuid;
  v_to uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount <= 0 then raise exception 'Contribution must be greater than zero'; end if;
  if p_contribution_type not in ('contribution','withdrawal') then raise exception 'Invalid contribution type'; end if;
  select * into v_goal from public.goals where id = p_goal_id and user_id = v_user_id and archived_at is null for update;
  if not found or v_goal.linked_account_id is null then raise exception 'Goal or linked account not found'; end if;
  select * into v_linked from public.accounts where id = v_goal.linked_account_id and user_id = v_user_id and archived_at is null for update;
  select * into v_counterparty from public.accounts where id = p_counterparty_account_id and user_id = v_user_id and archived_at is null for update;
  if v_counterparty.id is null or v_counterparty.id = v_linked.id then raise exception 'Choose a different counterparty account'; end if;
  if p_contribution_type = 'contribution' then v_from := v_counterparty.id; v_to := v_linked.id;
  else v_from := v_linked.id; v_to := v_counterparty.id; end if;

  insert into public.transactions (id,user_id,transaction_type,flow_kind,from_account_id,to_account_id,merchant,amount,currency,occurred_on,occurred_at,status,notes,recurring)
  values (v_transaction_id,v_user_id,'transfer',case when p_contribution_type='contribution' then 'goal_contribution' else 'goal_withdrawal' end,v_from,v_to,v_goal.name,p_amount,v_counterparty.currency,p_contributed_on,'12:00','Cleared',coalesce(p_notes,'Goal transfer'),false);
  insert into public.goal_contributions (user_id,goal_id,transaction_id,contribution_type,amount,contributed_on)
  values (v_user_id,p_goal_id,v_transaction_id,p_contribution_type,p_amount,p_contributed_on);
  return v_transaction_id;
end;
$$;

create or replace function public.delete_transaction(p_transaction_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := (select auth.uid()); v_debt_id uuid; v_debt_amount numeric;
begin
  select debt_id, amount into v_debt_id, v_debt_amount from public.debt_payments where transaction_id=p_transaction_id and user_id=v_user_id;
  if v_debt_id is not null then update public.debts set current_balance=least(original_balance,current_balance+v_debt_amount) where id=v_debt_id and user_id=v_user_id; end if;
  delete from public.goal_contributions where transaction_id = p_transaction_id and user_id = v_user_id;
  delete from public.debt_payments where transaction_id = p_transaction_id and user_id = v_user_id;
  delete from public.transactions where id = p_transaction_id and user_id = v_user_id;
  if not found then raise exception 'Transaction not found'; end if;
end;
$$;

create or replace function public.delete_account(p_account_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := (select auth.uid());
begin
  if not exists (select 1 from public.accounts where id = p_account_id and user_id = v_user_id) then raise exception 'Account not found'; end if;
  update public.debts d set current_balance=least(d.original_balance,d.current_balance+x.amount)
  from (select dp.debt_id, sum(dp.amount) amount from public.debt_payments dp join public.transactions t on t.id=dp.transaction_id where dp.user_id=v_user_id and (t.account_id=p_account_id or t.from_account_id=p_account_id or t.to_account_id=p_account_id) group by dp.debt_id) x
  where d.id=x.debt_id and d.user_id=v_user_id;
  delete from public.goal_contributions where user_id = v_user_id and transaction_id in (select id from public.transactions where user_id=v_user_id and (account_id=p_account_id or from_account_id=p_account_id or to_account_id=p_account_id));
  delete from public.debt_payments where user_id = v_user_id and transaction_id in (select id from public.transactions where user_id=v_user_id and (account_id=p_account_id or from_account_id=p_account_id or to_account_id=p_account_id));
  delete from public.transactions where user_id=v_user_id and (account_id=p_account_id or from_account_id=p_account_id or to_account_id=p_account_id);
  update public.goals set linked_account_id = null where user_id=v_user_id and linked_account_id=p_account_id;
  update public.debts set liability_account_id = null where user_id=v_user_id and liability_account_id=p_account_id;
  delete from public.accounts where id=p_account_id and user_id=v_user_id;
end;
$$;

create or replace function public.delete_budget_category(p_category_id uuid, p_reassign_to uuid default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := (select auth.uid()); v_kind text;
begin
  select kind into v_kind from public.budget_categories where id=p_category_id and user_id=v_user_id for update;
  if v_kind is null then raise exception 'Category not found'; end if;
  if v_kind='group' then raise exception 'Top-level groups cannot be deleted'; end if;
  if exists(select 1 from public.transactions where user_id=v_user_id and category_id=p_category_id) or exists(select 1 from public.monthly_budgets where user_id=v_user_id and category_id=p_category_id) then
    if p_reassign_to is null or not exists(select 1 from public.budget_categories where id=p_reassign_to and user_id=v_user_id and kind='category') then raise exception 'A valid reassignment category is required'; end if;
    update public.transactions set category_id=p_reassign_to where user_id=v_user_id and category_id=p_category_id;
    update public.monthly_budgets set category_id=p_reassign_to where user_id=v_user_id and category_id=p_category_id;
  end if;
  delete from public.budget_categories where id=p_category_id and user_id=v_user_id;
end;
$$;

revoke execute on function public.record_debt_payment(uuid,uuid,numeric,date,text) from public, anon;
revoke execute on function public.record_goal_contribution(uuid,uuid,numeric,text,date,text) from public, anon;
revoke execute on function public.delete_transaction(uuid) from public, anon;
revoke execute on function public.delete_account(uuid) from public, anon;
revoke execute on function public.delete_budget_category(uuid,uuid) from public, anon;
grant execute on function public.record_debt_payment(uuid,uuid,numeric,date,text) to authenticated;
grant execute on function public.record_goal_contribution(uuid,uuid,numeric,text,date,text) to authenticated;
grant execute on function public.delete_transaction(uuid) to authenticated;
grant execute on function public.delete_account(uuid) to authenticated;
grant execute on function public.delete_budget_category(uuid,uuid) to authenticated;
