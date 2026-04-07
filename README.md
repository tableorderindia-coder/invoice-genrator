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
- Supabase-backed data layer

## Local run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm test
npm run lint
npm run build
```

## Current data mode

The app now uses Supabase only through [`src/features/billing/store.ts`](./src/features/billing/store.ts).

Working flows:

- create companies
- add employees
- create invoices
- duplicate a previous invoice
- add teams, candidates, and adjustments
- update invoice note/status
- cash out an invoice
- open a generated PDF

## Supabase wiring

The initial SQL schema is in [`supabase/schema.sql`](./supabase/schema.sql).

Client scaffolding is in:

- [`src/lib/supabase/client.ts`](./src/lib/supabase/client.ts)
- [`src/lib/supabase/server.ts`](./src/lib/supabase/server.ts)

To run this app locally or on Vercel:

1. Create a Supabase project.
2. Run the SQL in `supabase/schema.sql`.
3. Optionally run `supabase/seed.sql` to preload sample records.
4. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`.
5. Restart the Next.js server or redeploy on Vercel.

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
