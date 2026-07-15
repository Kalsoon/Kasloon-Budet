-- Accounts created before the initial Kalsoon schema existed need the same
-- supporting rows as users created by the auth trigger.
insert into public.profiles (id, first_name, last_name, email)
select id,
       coalesce(raw_user_meta_data ->> 'first_name', ''),
       coalesce(raw_user_meta_data ->> 'last_name', ''),
       coalesce(email, '')
from auth.users
on conflict (id) do nothing;

insert into public.user_preferences (user_id, onboarding_completed, onboarding_step)
select id, true, 5
from auth.users
on conflict (user_id) do nothing;

insert into public.notification_preferences (user_id)
select id
from auth.users
on conflict (user_id) do nothing;

with missing_groups as (
  insert into public.budget_categories (user_id, kind, group_key, name, transaction_type, position)
  select users.id, 'group', groups.group_key, groups.name, groups.transaction_type, groups.position
  from auth.users users
  cross join (values
    ('fixed', 'Fixed bills', 'expense', 0),
    ('flexible', 'Flexible spending', 'expense', 1),
    ('income', 'Income', 'income', 2),
    ('savings', 'Savings', 'transfer', 3)
  ) as groups(group_key, name, transaction_type, position)
  where not exists (
    select 1 from public.budget_categories categories
    where categories.user_id = users.id
      and categories.kind = 'group'
      and categories.group_key = groups.group_key
  )
  returning id, user_id, group_key
)
insert into public.budget_categories (user_id, parent_id, kind, group_key, name, transaction_type, position)
select groups.user_id, groups.id, 'category', categories.group_key, categories.name, categories.transaction_type, categories.position
from missing_groups groups
join (values
  ('fixed', 'Rent', 'expense', 0), ('fixed', 'Insurance', 'expense', 1), ('fixed', 'Subscriptions', 'expense', 2), ('fixed', 'Debt payments', 'expense', 3), ('fixed', 'Utilities', 'expense', 4),
  ('flexible', 'Groceries', 'expense', 0), ('flexible', 'Dining out', 'expense', 1), ('flexible', 'Transport', 'expense', 2), ('flexible', 'Shopping', 'expense', 3), ('flexible', 'Entertainment', 'expense', 4),
  ('income', 'Salary', 'income', 0), ('income', 'Freelance', 'income', 1), ('income', 'Refund', 'income', 2), ('income', 'Interest', 'income', 3), ('income', 'Gift', 'income', 4),
  ('savings', 'Emergency fund', 'transfer', 0), ('savings', 'Holidays', 'transfer', 1), ('savings', 'Pillar 3a', 'transfer', 2)
) as categories(group_key, name, transaction_type, position) on categories.group_key = groups.group_key
on conflict (user_id, parent_id, name) do nothing;
