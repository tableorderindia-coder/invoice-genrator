# Dashboard Load Button And Totals Design

## Goal

Refine the company dashboard so employee and month checklist filters only apply when the user clicks `Load`, and add totals at the bottom of every dashboard table, including employee view and monthly/yearly view.

## User Outcomes

- Changing employee and month selections in dashboard filters does not immediately switch periods or views.
- Both dashboard views expose an explicit `Load` action for the current filter selections.
- Every dashboard table ends with a footer totals row that summarizes the visible numeric columns.
- Totals stay aligned with the currently visible columns and current P/L toggle state.

## Current State

- The employee dashboard view already has a filter form, but the monthly/yearly view only has period toggle buttons and no dedicated employee/month filter `Load` action.
- Employee view tables only show a trailing total for net profit, not a full totals row across columns.
- Period view tables do not show a totals row at all.
- Detail columns can be shown or hidden client-side, so a totals solution has to follow the rendered columns rather than assuming a fixed table shape.
- Period view `Expenses` and `Reimb.` checkboxes change how `Net P/L` is calculated on screen.

## Recommended Approach

Implement one shared totals-row system in the dashboard table layer and add explicit employee/month filter forms in both dashboard views.

This keeps the feature aligned with the current server-rendered filter flow while letting the totals logic adapt to client-side column visibility and P/L inclusion toggles.

## Interaction Design

### Dashboard Filters

- Employee view keeps the existing employee/month filter area, but the primary action label becomes `Load`.
- Monthly/yearly view gets the same employee and month checklist dropdowns plus its own `Load` button.
- `Monthly` and `Yearly` buttons remain separate controls for switching period grouping.
- Switching between `Employee` and `Monthly / Yearly` views preserves the most recently loaded employee/month filter values.
- Switching between `Monthly` and `Yearly` preserves the same loaded employee/month filter values.

### Totals Rows

- Employee view:
  - Each employee section gets a full totals footer row at the bottom of its table.
  - The first cell is labeled `Totals`.
  - Numeric money/count columns show aggregated values.
  - Non-additive text and action columns stay blank or show `-`.
- Period view:
  - The period table gets one full totals footer row beneath all rows.
  - The first cell is labeled `Totals`.
  - Totals reflect only currently visible columns.

## Aggregation Rules

### Summed Columns

These columns should be summed where visible:

- `Days worked`
- `Dollar inward`
- `Onboarding advance`
- `Reimbursements`
- `Reimbursements INR`
- `Appraisal advance`
- `Appraisal advance INR`
- `Offboarding deduction`
- `Effective dollar inward`
- `Cash in`
- `Monthly $`
- `Monthly paid INR`
- `Actual paid`
- `PF`
- `TDS`
- `Salary paid`
- `FX commission`
- `Total commission`
- `Commission earned`
- `Gross earnings`
- `Expenses`
- `Company reimbursement USD`
- `Company reimbursement INR`
- `Net Profit` / `Net P/L`

### Rate Columns

Rates should not be naively summed.

- `Cashout rate` and `Paid rate` should use weighted averages when the relevant denominator exists.
- Employee view:
  - `Cashout rate` weighted by `employeeMonthlyUsdCents` or effective USD amount if that produces a truer average for displayed payout economics.
  - `Paid rate` weighted by `employeeMonthlyUsdCents` for rows where paid rate applies.
- Period view:
  - `Cashout rate` weighted by `employeeMonthlyUsdCents` or effective USD amount across periods.
  - `Paid rate` weighted by `employeeMonthlyUsdCents` across periods with positive paid rates.
- If the denominator is zero, show `-`.

### Non-Numeric Columns

These should not be aggregated:

- `Month` / `Period`
- reimbursement labels text
- action buttons

They render as:

- first cell: `Totals`
- non-aggregate cells after that: `-` or empty

## Net P/L Behavior

Period-view totals must follow the same on-screen logic as row rendering:

- If `Expenses` is included in P/L, the total net P/L subtracts the expenses total.
- If `Reimbursements` is included in P/L, the total net P/L adds the company reimbursement total.
- If either toggle is off, the total net P/L excludes that contribution as well.

This keeps the footer row trustworthy relative to what the user currently sees.

## Technical Design

### `app/dashboard/page.tsx`

- Add a dedicated employee/month checklist filter form to the monthly/yearly dashboard view.
- Preserve existing URL-based filter behavior.
- Ensure `Load` submits only the dropdown selections, not stale all-selected hidden flags.
- Keep view and period switch buttons separate from the filter apply form.

### `app/dashboard/dashboard-tables.tsx`

- Introduce table-level helper functions that:
  - classify visible columns as summed, weighted-average, or non-aggregate
  - compute totals from the rendered row data
  - render a footer row aligned with the visible columns
- Reuse the current visible-column list so the totals row always matches the current table shape.
- Employee tables compute totals per employee section.
- Period tables compute totals across all visible period rows after applying current P/L toggle logic.

### Supporting Types And Tests

- Add focused tests for totals calculations and footer alignment in `src/features/billing`.
- Prefer helper-level tests for aggregation rules and a rendering test for footer column alignment.

## Error Handling And Edge Cases

- If a table has no data, keep the existing empty state and do not render a totals row.
- If a visible rate column has no valid denominator, render `-` in the totals cell.
- If detail columns are hidden, the totals row should not include placeholder cells for hidden columns.
- If the user toggles `Expenses` or `Reimb.` inclusion, the period totals row should update immediately on the client with the new net P/L total.

## Verification

- Unit tests for numeric totals and weighted-rate totals.
- Rendering test confirming totals-row cell count matches the rendered header count.
- Manual verification on dashboard employee view, monthly view, and yearly view:
  - employee/month filters require `Load`
  - totals row appears at the bottom of each table
  - totals align with visible columns
  - net P/L total changes when period-view P/L toggles change
