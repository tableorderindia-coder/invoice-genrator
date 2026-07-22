# Live Portal Speed Audit - 2026-07-22

Source: `https://invoice-genrator-liart.vercel.app/`

Login: `eassyonboard.hr@gmail.com`

## Measurement Notes

The earlier observed `9-14s` values were dominated by Playwright `networkidle` waits. The app triggers Next RSC/prefetch requests during navigation, and some of those requests are aborted by normal route changes. This keeps the network busy after the page is already usable.

For optimization work, the useful targets are:

- `responseEnd`: document/RSC response completion.
- `first data visible`: route content and real rows/cards visible to the user.
- request count and server/network errors.

## Baseline

These are corrected live timings gathered before this optimization PR. Values are medians from a read-only benchmark smoke using `npm run perf:benchmark`.

| Route/process | Scope | Response/data visible | Network idle observed | Notes |
| --- | --- | ---: | ---: | --- |
| Overview | selected/all company P&L | 5.4s | 10s+ | Company loop calls dashboard P&L assembly per company. |
| Employees | global company filter changes | 4.0s | 10s+ | Data visible before aborted RSC/prefetch requests settle. |
| Salary | selected company/month | 3.6s | 10s+ | Company list plus monthly payroll assembly. |
| Employee Cash Flow | saved/compose filters | 3.3s | 10s+ | Heavy invoice/payment/salary data assembly. |
| Dashboard | employee/monthly/yearly | 5.1s | 10s+ | P&L data assembly is the dominant cost. |
| Invoices | list load | 2.4s | 10s+ | Invoice list query is lighter, navigation prefetch adds noise. |

No browser-side Supabase calls were observed in the main page load path. The delay is primarily server-render/data assembly plus avoidable background RSC work.

## Optimization Changes In This PR

- Added tagged server-side cached read wrappers for companies, employee lists by company scope, invoice lists by company scope, payment months, P&L dashboard data, and salary payroll rows.
- Added precise `updateTag` invalidation after employee, salary, invoice draft, cash-flow, expense, and company mutations.
- Disabled sidebar/mobile nav prefetch for heavy authenticated routes to avoid unnecessary aborted RSC requests.
- Added safe supporting indexes for invoice listing/detail joins and RBAC lookup tables.

## Expected After-Fix Behavior

Cached repeat navigations should become near-instant for stable reads, while first uncached loads should still be reduced by fewer duplicated reads and better indexed filters. Financial saves invalidate the affected cache tags before redirecting so the next render sees fresh data.

## Follow-Up Benchmark

Run the same matrix against local production build and Vercel preview after deployment:

| Route/process | Baseline median | Optimized median | Improvement | Remaining bottleneck |
| --- | ---: | ---: | ---: | --- |
| Overview | 5.4s | TBD | TBD | Preview measurement pending. |
| Employees | 4.0s | TBD | TBD | Preview measurement pending. |
| Salary | 3.6s | TBD | TBD | Preview measurement pending. |
| Employee Cash Flow | 3.3s | TBD | TBD | Preview measurement pending. |
| Dashboard | 5.1s | TBD | TBD | Preview measurement pending. |
| Invoices | 2.4s | TBD | TBD | Preview measurement pending. |
