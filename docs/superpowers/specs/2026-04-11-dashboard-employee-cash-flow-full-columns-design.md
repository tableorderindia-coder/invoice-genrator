# Dashboard Employee Cash Flow Full Columns Design

## Goal

Update the `/dashboard` employee view so each employee section shows the full Employee Cash Flow row shape by month, removes the invoice number column, shows signed monthly net profit, and displays a final net profit total below each employee.

## Current Context

- The `/dashboard` employee view already reads from Employee Cash Flow data via `getPnDashboardData()`.
- The dashboard still renders a payout-style table with a limited column set and an `Invoice` column.
- The `/employee-cash-flow` page already exposes the richer field set needed for the dashboard table, but it uses card-based UI rather than a grouped table.

## Approved UI Direction

Use the grouped-by-employee dashboard layout from the current employee view, but widen each employee table to match the cash-flow data shape more closely.

Each employee section will:

- render one row per month
- keep `Month` as the first column
- remove the `Invoice` column entirely
- show all cash-flow columns needed for monthly review
- show `Net Profit` as the last value column before actions
- render a footer row below the employee rows with only `Total Net Profit`

The employee footer must not total every numeric column. It must only show the final net profit per employee.

## Table Shape

The employee dashboard table will render these columns in this order:

1. `Month`
2. `Days worked`
3. `Dollar inward`
4. `Onboarding advance`
5. `Offboarding deduction`
6. `Effective dollar inward`
7. `Cashout rate`
8. `Cash in (INR)`
9. `Monthly $`
10. `Paid rate`
11. `Salary paid (INR)`
12. `PF (INR)`
13. `TDS (INR)`
14. `Actual paid (INR)`
15. `FX commission (INR)`
16. `Total commission (USD)`
17. `Commission earned (INR)`
18. `Gross earnings (INR)`
19. `Net Profit (INR)`
20. `Actions`

## Net Profit Definition

For each monthly row:

- `Effective dollar inward = base dollar inward + onboarding advance - offboarding deduction`
- `Cash in (INR) = effective dollar inward * cashout USD/INR rate`
- `Salary paid (INR) = monthly paid USD * paid USD/INR rate`
- `Net Profit (INR) = cash in (INR) - salary paid (INR)`

This value must be shown with explicit sign formatting:

- positive values render as `+ Rs ...`
- negative values render as `- Rs ...`
- zero renders as `Rs 0.00`

For each employee footer:

- `Total Net Profit = sum(monthly net profit for all visible rows for that employee)`

## Data Changes

The dashboard row model must carry the additional cash-flow fields needed by the new table:

- `baseDollarInwardUsdCents`
- `onboardingAdvanceUsdCents`
- `offboardingDeductionUsdCents`
- `effectiveDollarInwardUsdCents`
- `cashInInrCents`
- `salaryPaidInrCents`
- `netProfitInrCents`
- `totalNetProfitInrCents` at the employee section level

These values should be built in the dashboard aggregation layer so the page remains primarily a rendering layer.

## Update Behavior

Existing editable behavior should remain intact for fields that are currently editable in the dashboard:

- dollar inward
- monthly dollars
- cashout rate
- paid rate
- PF
- TDS
- actual paid

Any derived values in the widened table should remain display-only and recompute from the stored cash-flow entry data after each update.

## Empty State

If no employee rows are available for the selected filters, the dashboard should use cash-flow language instead of payout language:

- change the empty copy from payout wording to employee cash-flow wording

## Testing

Add focused regression coverage for:

- dashboard editable section aggregation with the new cash-flow fields
- monthly row net profit calculation and sign handling
- per-employee footer total net profit aggregation

Run:

- `npx vitest run src/features/billing/pn-dashboard.test.ts`
- `npm run lint`

## Risks And Guardrails

- Do not change the period view in this task.
- Do not change `/employee-cash-flow` card layout in this task.
- Do not add per-column employee totals.
- Do not reintroduce invoice-number-based grouping in the employee dashboard table.
