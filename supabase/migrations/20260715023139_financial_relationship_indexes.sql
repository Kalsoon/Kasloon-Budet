-- Cover the composite ownership foreign keys used by atomic money movements.
create index if not exists debt_payments_debt_owner_idx
  on public.debt_payments(debt_id, user_id);
create index if not exists debts_liability_owner_idx
  on public.debts(liability_account_id, user_id)
  where liability_account_id is not null;
create index if not exists goal_contributions_goal_owner_idx
  on public.goal_contributions(goal_id, user_id);
create index if not exists goals_linked_account_owner_idx
  on public.goals(linked_account_id, user_id)
  where linked_account_id is not null;
create index if not exists monthly_budgets_category_owner_idx
  on public.monthly_budgets(category_id, user_id);
create index if not exists transactions_account_owner_idx
  on public.transactions(account_id, user_id)
  where account_id is not null;
create index if not exists transactions_from_account_owner_idx
  on public.transactions(from_account_id, user_id)
  where from_account_id is not null;
create index if not exists transactions_to_account_owner_idx
  on public.transactions(to_account_id, user_id)
  where to_account_id is not null;
create index if not exists transactions_category_owner_idx
  on public.transactions(category_id, user_id)
  where category_id is not null;
