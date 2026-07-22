# P&L Summary Acceleration

Date: 2026-07-22

## Baseline

Latest post-hotfix live audit showed protected routes rendering without server errors, but Dashboard and Overview still spent most of their time in server-side P&L assembly.

| Route | Baseline median first data visible |
| --- | ---: |
| Overview | ~5.1s |
| Dashboard | ~6.5s |

The noisy 9-14s `networkidle` readings were caused by aborted Next RSC/prefetch requests. The useful target metric remains first data visible / response completion.

## Step 1 Change

- Added `pn_employee_month_summaries` and `pn_company_month_summaries`.
- Dashboard and Overview now read persisted monthly P&L summaries instead of rebuilding raw P&L from cash-flow, invoices, expenses, and adjustments on every render.
- Summary rebuild still uses the existing TypeScript Dashboard calculation path as the source of truth.
- Financial write actions synchronously rebuild summaries for the affected company or invoice.
- Added `POST /api/admin/pn-summaries/rebuild` for one-time post-migration backfill.

## Deployment Checklist

1. Apply migration `20260722165000_pn_dashboard_summaries.sql`.
2. Deploy this PR.
3. Log in as an admin and call:

```bash
curl -X POST https://<deployment-host>/api/admin/pn-summaries/rebuild
```

Use browser session cookies or another authenticated request method because the endpoint is protected by Dashboard edit access.

4. Re-run the same three-run audit for:
   - `/`
   - `/dashboard`

## Acceptance Target

- Overview median first data visible under 2s.
- Dashboard median first data visible under 2.5s.
- No server-error pages.
