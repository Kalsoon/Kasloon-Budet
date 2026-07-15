alter table public.accounts
  add column if not exists institution_logo text,
  add column if not exists balance_date date not null default current_date,
  add column if not exists include_in_available_cash boolean not null default true,
  add column if not exists include_transactions_in_budgets boolean not null default true,
  add column if not exists is_primary_spending boolean not null default false,
  add column if not exists created_via text not null default 'manual',
  add column if not exists balance_confirmed boolean not null default true;

alter table public.accounts
  drop constraint if exists accounts_created_via_check;

alter table public.accounts
  add constraint accounts_created_via_check
  check (created_via in ('manual', 'csv'));

update public.accounts
set include_in_available_cash = false
where account_type in ('investment', 'pillar', 'liability');

comment on column public.accounts.institution_logo is 'Optional user-provided institution logo encoded as a data URL.';
comment on column public.accounts.balance_date is 'Date on which the user confirmed the current balance.';
comment on column public.accounts.include_in_available_cash is 'Whether the account contributes to available cash summaries.';
comment on column public.accounts.include_transactions_in_budgets is 'Whether the account transactions contribute to monthly budget actuals.';
comment on column public.accounts.is_primary_spending is 'Whether the account should be preselected for everyday spending.';
comment on column public.accounts.created_via is 'Account creation method: manual or csv.';
comment on column public.accounts.balance_confirmed is 'Whether the displayed balance has been confirmed by the user.';
