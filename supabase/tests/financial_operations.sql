begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (
  '33333333-3333-4333-8333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'financial-operations@kalsoon.test',
  '', now(), now(), now()
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);

insert into public.accounts (id,user_id,account_type,institution,name,currency,balance)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','33333333-3333-4333-8333-333333333333','bank','Test Bank','Everyday','CHF',1000),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','33333333-3333-4333-8333-333333333333','savings','Test Bank','Goal savings','CHF',200),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','33333333-3333-4333-8333-333333333333','bank','Test Bank','Secondary','CHF',50);

insert into public.debts (id,user_id,debt_type,creditor,current_balance,original_balance,interest_rate,minimum_payment,due_date,payment_frequency)
values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1','33333333-3333-4333-8333-333333333333','Credit card','Test Card',400,500,12,50,'2026-07-25','Monthly'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2','33333333-3333-4333-8333-333333333333','Personal loan','Large Loan',1200,1200,5,100,'2026-07-25','Monthly');

insert into public.goals (id,user_id,linked_account_id,goal_type,name,target_amount,base_amount,deadline,monthly_contribution,status)
values ('99999999-9999-4999-8999-999999999991','33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','Emergency fund','Emergency fund',5000,100,'2027-07-01',250,'Active');

select is(
  public.record_debt_payment('dddddddd-dddd-4ddd-8ddd-ddddddddddd1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',100,'2026-07-14',null,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'),
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'::uuid,
  'debt payment returns the stable transaction id'
);
select is((select balance from public.accounts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),900::numeric,'debt payment reduces the source account once');
select is((select current_balance from public.debts where id='dddddddd-dddd-4ddd-8ddd-ddddddddddd1'),300::numeric,'debt payment reduces the current debt balance');
select is((select transaction_type from public.transactions where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'),'expense','debt payment creates an expense transaction');
select is((select flow_kind from public.transactions where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'),'debt_payment','debt payment transaction has debt_payment flow kind');
select is((select account_id from public.transactions where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,'debt payment transaction uses the selected source account');
select is((select count(*)::integer from public.debt_payments where transaction_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'),1,'debt payment creates one linked ledger row');
select is(public.record_debt_payment('dddddddd-dddd-4ddd-8ddd-ddddddddddd1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',100,'2026-07-14',null,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'),'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'::uuid,'retry returns the original debt transaction');
select is((select count(*)::integer from public.transactions where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'),1,'debt retry does not duplicate the transaction');
select is((select balance from public.accounts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),900::numeric,'debt retry does not debit the account again');
select throws_ok(
  $$select public.record_debt_payment('dddddddd-dddd-4ddd-8ddd-ddddddddddd1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',301,'2026-07-14',null,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2')$$,
  'P0001','Payment exceeds the remaining debt balance','debt payment cannot exceed the remaining debt'
);
select throws_ok(
  $$select public.record_debt_payment('dddddddd-dddd-4ddd-8ddd-ddddddddddd2','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',901,'2026-07-14',null,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3')$$,
  'P0001','Payment exceeds the available source account balance','debt payment cannot exceed available funds'
);

select is(
  public.record_goal_contribution('99999999-9999-4999-8999-999999999991','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',250,'contribution','2026-07-14',null,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4'),
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4'::uuid,
  'goal contribution returns the stable transaction id'
);
select is((select balance from public.accounts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),650::numeric,'goal contribution reduces the source account');
select is((select balance from public.accounts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),450::numeric,'goal contribution increases the linked savings account');
select results_eq(
  $$select transaction_type,flow_kind,from_account_id,to_account_id from public.transactions where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4'$$,
  $$values ('transfer'::text,'goal_contribution'::text,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid)$$,
  'goal contribution creates one correctly linked transfer'
);
select is((select count(*)::integer from public.goal_contributions where transaction_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4'),1,'goal contribution creates one linked ledger row');
select is(public.record_goal_contribution('99999999-9999-4999-8999-999999999991','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',250,'contribution','2026-07-14',null,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4'),'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4'::uuid,'goal contribution retry returns the original transaction');
select is((select balance from public.accounts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),650::numeric,'goal contribution retry does not debit again');
select throws_ok(
  $$select public.record_goal_contribution('99999999-9999-4999-8999-999999999991','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',10,'contribution','2026-07-14',null,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5')$$,
  'P0001','Source and destination accounts must be different','goal source and destination cannot match'
);

select is(
  public.record_goal_contribution('99999999-9999-4999-8999-999999999991','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',75,'withdrawal','2026-07-15',null,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6'),
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6'::uuid,
  'goal withdrawal returns the stable transaction id'
);
select is((select balance from public.accounts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),375::numeric,'goal withdrawal reduces the linked savings account');
select is((select balance from public.accounts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'),125::numeric,'goal withdrawal increases the selected destination account');
select is((select flow_kind from public.transactions where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6'),'goal_withdrawal','goal withdrawal uses the goal_withdrawal flow kind');
select is((select base_amount + sum(case contribution_type when 'contribution' then amount else -amount end) from public.goals join public.goal_contributions on goal_id=goals.id where goals.id='99999999-9999-4999-8999-999999999991' group by base_amount),275::numeric,'goal progress derives from contribution ledger rows');

insert into public.transactions (id,user_id,transaction_type,flow_kind,from_account_id,to_account_id,merchant,amount,currency,occurred_on,status)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7','33333333-3333-4333-8333-333333333333','transfer','transfer','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','Normal transfer',100,'CHF','2026-07-15','Cleared');
select is((select balance from public.accounts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),550::numeric,'normal transfer reduces its source account');
select is((select balance from public.accounts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'),225::numeric,'normal transfer increases its destination account');
select throws_ok(
  $$insert into public.transactions (user_id,transaction_type,flow_kind,from_account_id,to_account_id,merchant,amount,currency,occurred_on,status) values ('33333333-3333-4333-8333-333333333333','transfer','transfer','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','Invalid',1,'CHF','2026-07-15','Cleared')$$,
  'P0001','Source and destination accounts must be different','normal transfer rejects identical accounts'
);
select throws_ok(
  $$insert into public.transactions (user_id,transaction_type,flow_kind,from_account_id,to_account_id,merchant,amount,currency,occurred_on,status) values ('33333333-3333-4333-8333-333333333333','transfer','transfer','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','Too much',551,'CHF','2026-07-15','Cleared')$$,
  'P0001','Transfer amount exceeds the available source account balance','normal transfer rejects insufficient source funds'
);

insert into public.transactions (id,user_id,transaction_type,flow_kind,account_id,merchant,amount,currency,occurred_on,status)
values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee8','33333333-3333-4333-8333-333333333333','income','regular','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','Salary',500,'CHF','2026-07-15','Cleared'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee9','33333333-3333-4333-8333-333333333333','expense','regular','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','Groceries',50,'CHF','2026-07-15','Cleared');
select is((select sum(amount) from public.transactions where transaction_type='income' and flow_kind='regular'),500::numeric,'dashboard income includes regular income only');
select is((select sum(amount) from public.transactions where transaction_type='expense' and flow_kind in ('regular','debt_payment')),150::numeric,'dashboard spending includes regular expenses and debt payments once');

select * from finish();
rollback;
