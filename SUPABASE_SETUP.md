# Kalsoon Supabase setup

## Connect a project

1. Copy `.env.example` to `.env.local`.
2. Add the Project URL and the `sb_publishable_...` key from the Supabase Connect dialog.
3. Never add a secret or service-role key to a `VITE_` variable.
4. Link and migrate the project:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

5. In Authentication → URL Configuration, add the local and production Vite URLs.

## Migration phases

- `20260714152551_initial_financial_schema.sql`: profiles, preferences, notification settings, accounts, two-level categories, transactions, budgets, debts, payments, goals and contributions; indexes; default category provisioning; RLS.
- `20260714152645_atomic_financial_operations.sql`: account ledger trigger and atomic debt-payment, goal-contribution, transaction-delete, account-delete and category-reassignment functions.
- `20260714152650_rls_isolation_tests.sql`: force-RLS hardening and migration-time RLS assertions.

## Verification

With Docker running:

```bash
npx supabase start
npx supabase db reset
npx supabase test db supabase/tests/rls_isolation.sql
npx supabase db lint --local --level error --fail-on error
npm run build
```

The isolation test creates two rolled-back fixture users and verifies that neither can read, create, update or delete the other user's records.

## Financial invariants

- Cleared income adds to one account.
- Cleared expenses subtract from one account.
- Transfers subtract from the source and add to the destination; they are excluded from income and spending totals.
- Debt-payment RPCs update the payment account, transaction ledger, debt balance and payment record in one database transaction.
- Goal-contribution RPCs update both accounts, the transfer ledger and contribution record in one database transaction.
- Deleting a managed transaction reverses its account effect and, for debt payments, restores the associated debt balance.
