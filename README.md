# EassyOnboard Billing Console

Internal staffing billing app for:

- company master data
- employee defaults
- monthly invoice generation
- PDF export
- cash-out tracking
- realized profit dashboard in USD

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- Vitest
- PDFKit
- Postgres (Neon) via `pg`, with self-hosted bcrypt + signed-cookie auth (no Supabase)

## Local run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Browser support

Use a current Chromium browser such as Chrome or Edge. The unsaved-edit guard relies on
the Navigation API to stop Back/Forward traversal before Next.js changes the active route.

## Verification

```bash
npm test
npm run lint
npm run build
```

## Current data mode

The app talks to Postgres directly via [`lib/db/pool.ts`](./lib/db/pool.ts) (a pooled
`pg` client), mainly through [`src/features/billing/store.ts`](./src/features/billing/store.ts)
and the other `*-store.ts` files in that folder. Auth is self-hosted:
[`lib/auth/`](./lib/auth) does bcrypt password checks and signed-cookie sessions against
the `profiles` table - no external auth service.

Working flows:

- create companies
- add employees
- create invoices
- duplicate a previous invoice
- add teams, candidates, and adjustments
- update invoice note/status
- cash out an invoice
- open a generated PDF

## Database wiring

The target schema for a fresh Postgres (Neon) database is
[`supabase/schema.neon.sql`](./supabase/schema.neon.sql). (The `supabase/` folder name is
kept for history - it holds the original Supabase schema/migrations too, which document
how the live schema evolved, but the app no longer talks to Supabase.)

Client code is in [`lib/db/pool.ts`](./lib/db/pool.ts) (query/transaction helpers) and
[`lib/auth/`](./lib/auth) (session cookies, password hashing, permission checks).

To run this app locally or on Vercel:

1. Provision a Postgres database - Neon via the Vercel Marketplace integration is the
   supported path, and sets `DATABASE_URL` for you.
2. Run the SQL in `supabase/schema.neon.sql`.
3. Add `DATABASE_URL` (if not already set) and `SESSION_SECRET` (generate with
   `openssl rand -base64 48`) to your environment.
4. Restart the Next.js server or redeploy on Vercel.

Admin users are created from `/admin/users` by another admin - there's no public
sign-up. To bootstrap the very first admin, insert a row into `profiles` directly (see
`scripts/migrate-supabase-to-neon.cjs` for how existing bcrypt password hashes are
written) or reuse a migrated Supabase admin account, which keeps its existing password.

## Vercel deploy files

Deployment handoff files are in [`deploy/vercel`](./deploy/vercel):

- `README.md`
- `env.production.example`
- `deploy-checklist.md`

The actual Vercel project config file is at the repo root:

- [`vercel.json`](./vercel.json)

## Important business rules implemented

- Employee data stores defaults.
- Each invoice is a frozen monthly snapshot.
- Team assignment can change during invoice generation without changing the employee default team.
- Profit is counted only after cash out.
- All phase 1 calculations are USD only.
