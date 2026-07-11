# Portal Speed Audit - 2026-07-11

## Scope

Baseline was measured read-only against the deployed Vercel portal at `https://invoice-genrator-liart.vercel.app` using the provided test account. After-fix timings were measured against a local production build at `http://127.0.0.1:3027` connected to the same Supabase project.

No live records were created or edited. PDF/download endpoints were not stress-tested because the first pass focused on data-populating page loads and filter/page switches.

## Key Findings

- Several pages already knew the selected company IDs but still loaded data with one Supabase query per company.
- The highest-value redundant loads were in Create Invoice, Invoices, Employee Statements, Expenses, and Dashboard filter bootstrap.
- Existing Supabase indexes already cover the optimized filters used in this PR, so no DB migration was applied in this pass.
- Remaining latency is mostly in heavier aggregate flows: Employee Cash Flow, Dashboard P/L data, and Founders Balance.

## Baseline - Live Vercel

| Process | Filter state | Runs | Min | Median | Max | Rows/cards | Notes |
|---|---:|---:|---:|---:|---:|---:|---|
| Login to dashboard | default | 3 | 2.96s | 3.15s | 3.35s | 9 cards | Read-only login/navigation |
| Overview | default | 3 | 3.22s | 3.81s | 3.83s | 9 cards | Server render + hydration |
| Companies | default | 3 | 2.93s | 3.06s | 3.35s | 4 cards | Lightweight page |
| Employees | all companies | 3 | 2.37s | 2.73s | 2.79s | 20 cards | Already uses batched company query |
| Employees | Wizard | 3 | 2.66s | 2.70s | 2.87s | 5 cards | Data populated correctly |
| Employees | Arena | 3 | 2.71s | 2.74s | 2.74s | 17 cards | Data populated correctly |
| Salary sheet | Wizard, 2026-07 | 3 | 2.41s | 2.43s | 2.52s | 3 rows | Single-company flow |
| Salary payslips | Wizard, 2026-07 | 3 | 2.45s | 2.56s | 3.22s | 2 cards | Single-company flow |
| Create Invoice | initial | 1 capped probe | 4.49s | 4.49s | 4.49s | 2 cards | Eagerly loaded per-company invoice/team data |
| Create Invoice | Wizard query param | 1 capped probe | 4.57s | 4.57s | 4.57s | 2 cards | Query param does not reduce preload scope |
| Invoices | all companies | 1 probe | 3.18s | 3.18s | 3.18s | 18 rows | Per-company invoice loop |
| Invoices | Arena | 1 probe | 3.02s | 3.02s | 3.02s | 16 rows | Single company still rendered via shared page |
| Cashout | all companies | 1 probe | 2.82s | 2.82s | 2.82s | 1 row | Reference only |
| Employee Cash Flow compose | Arena, 2026-07 | 1 probe | 5.63s | 5.63s | 5.63s | 2 cards | Heavy page-state load |
| Employee Cash Flow saved | Arena, 2026-07 | 1 probe | 4.82s | 4.82s | 4.82s | 117 rows | Heavy saved-row render |
| Employee Statements | all companies | 1 probe | 5.05s | 5.05s | 5.05s | 13 rows | Per-company employees + invoices + sections |
| Employee Statements | Arena | 1 probe | 4.01s | 4.01s | 4.01s | 10 rows | Per-company sections remain |
| Expenses | all companies | 1 probe | 2.41s | 2.41s | 2.41s | 2 cards | Per-company expense loop |
| Expenses | Arena, July 2026 | 1 probe | 2.88s | 2.88s | 2.88s | 2 cards | Single company |
| Dashboard employee | all companies | 1 probe | 4.06s | 4.06s | 4.06s | 130 rows | Filter bootstrap + P/L aggregation |
| Dashboard period | all companies | 1 probe | 4.86s | 4.86s | 4.86s | 12 rows | Filter bootstrap + P/L aggregation |
| Founders Balance | all companies | 1 probe | 4.33s | 4.33s | 4.33s | 13 rows | Aggregate flow, not changed |
| Founders Balance | Arena | 1 probe | 3.53s | 3.53s | 3.53s | 13 rows | Aggregate flow, not changed |
| Admin users | default | 1 probe | 2.83s | 2.83s | 2.83s | 2 cards | Reference only |

## Optimizations Applied

| Area | Before | After |
|---|---|---|
| Create Invoice preload | Previous invoices loaded with one query per company; team names loaded as teams + employees per company. | Previous invoices load with one `.in("company_id", ids)` query; team catalog loads with one teams query plus one employees query. |
| Invoices page | One `listInvoicesForCompany` call per selected company. | One `listInvoicesForCompanies(selectedCompanyIds)` call. |
| Employee Statements page | Employee and invoice filter data loaded in per-company loops. | Employee and invoice filter data loaded with batched company queries. |
| Expenses page | One expenses query per selected company. | One `listCompanyExpensesForCompanies` query scoped by selected company IDs/month/year. |
| Dashboard filter bootstrap | Employee list and available payment months loaded in per-company loops. | Employees and payment months loaded with batched company queries. |

## After Fix - Local Production Build

| Process | Filter state | Runs | Min | Median | Max | Rows/cards | Improvement vs live median |
|---|---:|---:|---:|---:|---:|---:|---:|
| Create Invoice | initial | 3 | 1.58s | 1.77s | 1.87s | 2 cards | 61% faster |
| Create Invoice | Wizard query param | 3 | 1.47s | 1.47s | 1.48s | 2 cards | 68% faster |
| Invoices | all companies | 3 | 1.46s | 1.47s | 1.58s | 18 rows | 54% faster |
| Invoices | Arena | 3 | 1.47s | 1.48s | 1.53s | 16 rows | 51% faster |
| Employee Statements | all companies | 3 | 2.47s | 2.68s | 2.82s | 13 rows | 47% faster |
| Employee Statements | Arena | 3 | 2.38s | 2.38s | 2.42s | 10 rows | 41% faster |
| Expenses | all companies | 3 | 1.42s | 1.45s | 1.53s | 2 cards | 40% faster |
| Expenses | Arena, July 2026 | 3 | 1.44s | 1.49s | 1.52s | 2 cards | 48% faster |
| Dashboard employee | all companies | 3 | 2.82s | 2.86s | 3.09s | 130 rows | 30% faster |
| Dashboard period | all companies | 3 | 2.47s | 2.53s | 2.84s | 12 rows | 48% faster |
| Employee Cash Flow compose | Arena, 2026-07 | 3 | 2.66s | 2.75s | 2.88s | 2 cards | 51% faster |
| Employee Cash Flow saved | Arena, 2026-07 | 3 | 2.85s | 2.86s | 2.87s | 117 rows | 41% faster |

## Remaining Bottlenecks

- Employee Cash Flow still does a substantial composed load and should get a second-pass audit around invoice/payment/salary aggregation.
- Dashboard still runs `getPnDashboardData` per selected company. The filter bootstrap is batched now, but the P/L aggregation itself remains the largest dashboard cost.
- Founders Balance was not changed in this PR; it should be reviewed with Dashboard because it depends on P/L summary data.
- A Vercel preview timing pass should be run after the PR is deployed, because local production timings remove Vercel edge/server variability.

## Verification

- `npm test` - passed, 204 tests.
- `npm run lint` - passed.
- `npm run build` - passed after installing dependencies inside the isolated worktree so Next/Turbopack resolved the correct project root.
- Browser checks completed against the deployed portal and local production build using the provided read-only login flow.
