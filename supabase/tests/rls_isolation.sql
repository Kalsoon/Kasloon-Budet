begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- These fixtures deliberately share similar data while belonging to different users.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
('11111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','isolation-a@kalsoon.test','',now(),now(),now()),
('22222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','isolation-b@kalsoon.test','',now(),now(),now());

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);

insert into public.accounts (user_id,account_type,institution,name,currency,balance)
values ('11111111-1111-4111-8111-111111111111','bank','Test Bank','User A account','CHF',100);
select is((select count(*)::integer from public.accounts),1,'user A sees only their account');
select is((select count(*)::integer from public.profiles),1,'user A sees only their profile');

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select is((select count(*)::integer from public.accounts),0,'user B cannot read user A account');
update public.accounts set balance=999 where user_id='11111111-1111-4111-8111-111111111111';
delete from public.accounts where user_id='11111111-1111-4111-8111-111111111111';
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select is((select balance::integer from public.accounts limit 1),100,'user B cannot update user A account');
select is((select count(*)::integer from public.accounts),1,'user B cannot delete user A account');
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select throws_ok(
  $$insert into public.accounts (user_id,account_type,institution,name,currency,balance) values ('11111111-1111-4111-8111-111111111111','bank','Bad','Bad','CHF',0)$$,
  '42501',
  null,
  'user B cannot insert for user A'
);
insert into public.accounts (user_id,account_type,institution,name,currency,balance)
values ('22222222-2222-4222-8222-222222222222','bank','Test Bank','User B account','CHF',200);
select is((select count(*)::integer from public.accounts),1,'user B sees their own account');
select is((select balance::integer from public.accounts limit 1),200,'user B reads their own balance');

select * from finish();
rollback;
