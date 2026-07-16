# Kalsoon Vite to Next.js migration map

## Baseline (2026-07-15)

- Branch: `migrate/nextjs`
- Package manager: npm
- Runtime: Node.js 24.15.0, npm 11.12.1
- Working tree before migration: clean
- Existing production check: `npm run build` passes with Vite 6.4.2
- Existing lint command: none
- Existing TypeScript command/configuration: none; the Vite app is JavaScript/JSX
- Browser baseline: `/` and `/login` render without framework overlays or console warnings/errors
- Visual source: existing Kalsoon React UI, styles, assets, animations, and responsive breakpoints

## Current architecture

| Concern | Current implementation | Next.js target |
| --- | --- | --- |
| Entry | `index.html` -> `src/main.jsx` -> `src/App.jsx` | `src/app/layout.tsx` plus App Router pages |
| Routing | `window.location.pathname` for `/`, `/login`, `/signup`; local `page` state for the signed-in app | App Router pages with `next/link`, `useRouter`, and `usePathname` |
| Public UI | `LandingPage.jsx`, auth form in `AuthGate.jsx` | `/`, `/login`, `/register`, and `/signup` compatibility route |
| Authenticated UI | `AuthenticatedApp` and `KalsoonApp` in `App.jsx` | `(app)` route-group layout and direct section pages |
| Onboarding | Rendered conditionally after client-side auth | `/onboarding`, protected by cookie-auth proxy/layout |
| Auth | Browser-only `@supabase/supabase-js`, local-storage session | `@supabase/ssr` browser/server clients and cookie refresh proxy |
| Data | Client-side Supabase queries, mutations, RPCs, Realtime | Preserve existing data layer and RLS behavior through the SSR browser client |
| Styling | Global `styles.css`; component CSS imports; Fontsource Manrope | Same files imported from the root layout/client modules |
| Assets | `public/assets` and `public/landing` | Preserve paths under `public` |
| Charts | Recharts in landing/dashboard/accounts/debt/goals/reports | Client components; no layout or chart redesign |
| Animations | CSS animations, Recharts animation, scroll/reveal/video interactions | Client components with reduced-motion behavior preserved |
| Browser-only APIs | `window`, `document`, `FileReader`, canvas, Blob, URL, crypto, media queries | Keep inside focused client components |

## Existing route list

- `/` - landing page
- `/login` - sign-in mode
- `/signup` - create-account mode
- All authenticated sections currently share the non-routable app shell and use local state: dashboard, accounts, transactions, budget, debt, goals, reports, settings.

## App Router route map

| Route | Existing screen/state | Access |
| --- | --- | --- |
| `/` | Landing page | Public |
| `/login` | Auth form, sign-in tab | Public; authenticated users redirect to their workspace |
| `/register` | Auth form, create-account tab | Public; authenticated users redirect to their workspace |
| `/signup` | Compatibility alias for existing landing links | Public; redirects to `/register` |
| `/onboarding` | Existing onboarding flow | Authenticated |
| `/dashboard` | `page = "dashboard"` | Authenticated |
| `/accounts` | `page = "accounts"` | Authenticated |
| `/transactions` | `page = "transactions"` | Authenticated |
| `/budget` | `page = "budget"` | Authenticated |
| `/debts` | `page = "debt"` | Authenticated |
| `/goals` | `page = "goals"` | Authenticated |
| `/reports` | `page = "reports"` | Authenticated |
| `/settings` | `page = "settings"` | Authenticated |
| `/app` | Existing landing-preview link compatibility | Redirect to `/dashboard` |

The current product has no separate Income or Expenses page; those flows live in Transactions and Budget. The migration will not invent duplicate screens.

## Planned file mapping

- Create `src/app/layout.tsx`, public pages, `(app)` protected layout/pages, and compatibility redirects.
- Create `src/lib/supabase/client.ts`, `server.ts`, and `middleware.ts`, plus root `proxy.ts` for current Next.js proxy conventions.
- Convert interactive JSX modules to TSX client components while preserving markup and CSS.
- Refactor `KalsoonApp` to derive its active section from the pathname and navigate with Next.js routing.
- Replace browser-only auth gating with server-verified route protection plus the existing client auth form and data interactions.
- Rename public Supabase environment variables from `VITE_SUPABASE_*` to `NEXT_PUBLIC_SUPABASE_*` without changing values.
- Keep all existing Supabase migrations, tests, RLS policies, RPCs, assets, styles, charts, and workflows intact.
- Remove Vite entry/configuration and React Router/Vite-only dependencies only after the Next.js build and runtime checks pass.
