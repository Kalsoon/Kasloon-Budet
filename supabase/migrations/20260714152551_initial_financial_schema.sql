-- Kalsoon core schema. All financial amounts use exact fixed-point numerics.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency char(3) not null default 'CHF' check (currency ~ '^[A-Z]{3}$'),
  language text not null default 'English',
  date_format text not null default 'DD.MM.YYYY',
  first_day_of_week text not null default 'Monday' check (first_day_of_week in ('Monday','Sunday')),
  selected_month date not null default date_trunc('month', current_date)::date check (selected_month = date_trunc('month', selected_month)::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_check_in boolean not null default true,
  budget_warnings boolean not null default true,
  bill_reminders boolean not null default true,
  goal_updates boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_type text not null check (account_type in ('bank','savings','cash','investment','pillar','liability')),
  institution text not null,
  name text not null,
  currency char(3) not null default 'CHF' check (currency ~ '^[A-Z]{3}$'),
  balance numeric(19,4) not null default 0,
  last_four char(4) check (last_four is null or last_four ~ '^[0-9]{4}$'),
  include_in_net_worth boolean not null default true,
  archived_at timestamptz,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

-- kind='group' rows are the first level; kind='category' rows reference a group.
create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.budget_categories(id) on delete restrict,
  kind text not null check (kind in ('group','category')),
  group_key text not null check (group_key in ('fixed','flexible','income','savings')),
  name text not null,
  transaction_type text not null check (transaction_type in ('expense','income','transfer')),
  position integer not null default 0 check (position >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, parent_id, name),
  check ((kind = 'group' and parent_id is null) or (kind = 'category' and parent_id is not null))
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('expense','income','transfer')),
  flow_kind text not null default 'regular' check (flow_kind in ('regular','transfer','debt_payment','goal_contribution','goal_withdrawal')),
  account_id uuid,
  from_account_id uuid,
  to_account_id uuid,
  category_id uuid,
  merchant text not null,
  amount numeric(19,4) not null check (amount > 0),
  currency char(3) not null default 'CHF' check (currency ~ '^[A-Z]{3}$'),
  occurred_on date not null,
  occurred_at time not null default '12:00',
  status text not null default 'Cleared' check (status in ('Cleared','Pending','Scheduled')),
  notes text,
  recurring boolean not null default false,
  frequency text check (frequency is null or frequency in ('Weekly','Fortnightly','Monthly','Yearly')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, user_id) references public.accounts(id, user_id) on delete restrict,
  foreign key (from_account_id, user_id) references public.accounts(id, user_id) on delete restrict,
  foreign key (to_account_id, user_id) references public.accounts(id, user_id) on delete restrict,
  foreign key (category_id, user_id) references public.budget_categories(id, user_id) on delete restrict,
  check (
    (transaction_type in ('expense','income') and account_id is not null and from_account_id is null and to_account_id is null)
    or
    (transaction_type = 'transfer' and account_id is null and from_account_id is not null and to_account_id is not null and from_account_id <> to_account_id)
  )
);

create table public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null,
  month date not null check (month = date_trunc('month', month)::date),
  planned_amount numeric(19,4) not null check (planned_amount >= 0),
  frequency text not null default 'Monthly' check (frequency in ('Weekly','Fortnightly','Monthly','Yearly','One time')),
  due_date date,
  reminder_enabled boolean not null default false,
  reminder_days integer not null default 3 check (reminder_days between 0 and 90),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, user_id) references public.budget_categories(id, user_id) on delete restrict,
  unique (user_id, category_id, month)
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  liability_account_id uuid,
  debt_type text not null,
  creditor text not null,
  current_balance numeric(19,4) not null check (current_balance >= 0),
  original_balance numeric(19,4) not null check (original_balance >= current_balance),
  interest_rate numeric(8,4) not null default 0 check (interest_rate >= 0),
  minimum_payment numeric(19,4) not null default 0 check (minimum_payment >= 0),
  due_date date not null,
  payment_frequency text not null default 'Monthly' check (payment_frequency in ('Weekly','Fortnightly','Monthly')),
  custom_position integer,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (liability_account_id, user_id) references public.accounts(id, user_id) on delete restrict,
  unique (id, user_id)
);

create table public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null,
  transaction_id uuid not null unique references public.transactions(id) on delete restrict,
  amount numeric(19,4) not null check (amount > 0),
  paid_on date not null,
  created_at timestamptz not null default now(),
  foreign key (debt_id, user_id) references public.debts(id, user_id) on delete restrict
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  linked_account_id uuid,
  goal_type text not null,
  name text not null,
  target_amount numeric(19,4) not null check (target_amount > 0),
  base_amount numeric(19,4) not null default 0 check (base_amount >= 0),
  deadline date not null,
  monthly_contribution numeric(19,4) not null default 0 check (monthly_contribution >= 0),
  status text not null default 'Active' check (status in ('Active','Paused','Completed')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (linked_account_id, user_id) references public.accounts(id, user_id) on delete restrict,
  unique (id, user_id)
);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  transaction_id uuid not null unique references public.transactions(id) on delete restrict,
  contribution_type text not null check (contribution_type in ('contribution','withdrawal')),
  amount numeric(19,4) not null check (amount > 0),
  contributed_on date not null,
  created_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals(id, user_id) on delete restrict
);

create index accounts_user_id_idx on public.accounts(user_id);
create index accounts_user_active_idx on public.accounts(user_id, archived_at, position);
create index budget_categories_user_id_idx on public.budget_categories(user_id);
create index budget_categories_parent_idx on public.budget_categories(parent_id);
create index transactions_user_date_idx on public.transactions(user_id, occurred_on desc);
create index transactions_account_idx on public.transactions(account_id) where account_id is not null;
create index transactions_from_account_idx on public.transactions(from_account_id) where from_account_id is not null;
create index transactions_to_account_idx on public.transactions(to_account_id) where to_account_id is not null;
create index transactions_category_month_idx on public.transactions(user_id, category_id, occurred_on);
create index monthly_budgets_user_month_idx on public.monthly_budgets(user_id, month);
create index debts_user_id_idx on public.debts(user_id);
create index debt_payments_user_debt_idx on public.debt_payments(user_id, debt_id, paid_on desc);
create index goals_user_id_idx on public.goals(user_id);
create index goal_contributions_user_goal_idx on public.goal_contributions(user_id, goal_id, contributed_on desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','user_preferences','notification_preferences','accounts','budget_categories','transactions','monthly_budgets','debts','goals']
  loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  fixed_id uuid := gen_random_uuid(); flexible_id uuid := gen_random_uuid();
  income_id uuid := gen_random_uuid(); savings_id uuid := gen_random_uuid();
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'first_name',''), coalesce(new.raw_user_meta_data ->> 'last_name',''), coalesce(new.email,''));
  insert into public.user_preferences (user_id) values (new.id);
  insert into public.notification_preferences (user_id) values (new.id);
  insert into public.budget_categories (id,user_id,kind,group_key,name,transaction_type,position) values
    (fixed_id,new.id,'group','fixed','Fixed bills','expense',0),
    (flexible_id,new.id,'group','flexible','Flexible spending','expense',1),
    (income_id,new.id,'group','income','Income','income',2),
    (savings_id,new.id,'group','savings','Savings','transfer',3);
  insert into public.budget_categories (user_id,parent_id,kind,group_key,name,transaction_type,position) values
    (new.id,fixed_id,'category','fixed','Rent','expense',0),(new.id,fixed_id,'category','fixed','Insurance','expense',1),
    (new.id,fixed_id,'category','fixed','Subscriptions','expense',2),(new.id,fixed_id,'category','fixed','Debt payments','expense',3),(new.id,fixed_id,'category','fixed','Utilities','expense',4),
    (new.id,flexible_id,'category','flexible','Groceries','expense',0),(new.id,flexible_id,'category','flexible','Dining out','expense',1),(new.id,flexible_id,'category','flexible','Transport','expense',2),(new.id,flexible_id,'category','flexible','Shopping','expense',3),(new.id,flexible_id,'category','flexible','Entertainment','expense',4),
    (new.id,income_id,'category','income','Salary','income',0),(new.id,income_id,'category','income','Freelance','income',1),(new.id,income_id,'category','income','Refund','income',2),(new.id,income_id,'category','income','Interest','income',3),(new.id,income_id,'category','income','Gift','income',4),
    (new.id,savings_id,'category','savings','Emergency fund','transfer',0),(new.id,savings_id,'category','savings','Holidays','transfer',1),(new.id,savings_id,'category','savings','Pillar 3a','transfer',2);
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

do $$
declare table_name text;
begin
  foreach table_name in array array['user_preferences','notification_preferences','accounts','budget_categories','transactions','monthly_budgets','debts','debt_payments','goals','goal_contributions']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
  end loop;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
