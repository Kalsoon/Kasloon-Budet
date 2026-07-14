-- Harden ownership boundaries and fail migration if any exposed table lacks RLS.
do $$
declare table_name text; rls_enabled boolean;
begin
  foreach table_name in array array['profiles','user_preferences','notification_preferences','accounts','budget_categories','transactions','monthly_budgets','debts','debt_payments','goals','goal_contributions']
  loop
    execute format('alter table public.%I force row level security', table_name);
    select c.relrowsecurity into rls_enabled
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=table_name;
    if not coalesce(rls_enabled,false) then raise exception 'RLS is not enabled on public.%', table_name; end if;
  end loop;
end $$;
