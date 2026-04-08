# Monthly Payout And Weekly Hours Redesign

Date: 2026-04-08

## Goal

Replace the current hourly payout and monthly-hours invoice logic with a new billing model based on:

- employee payout stored as fixed monthly USD
- weekly working hours stored as `Hrs per week`
- invoice and adjustment totals calculated from:
  - `(billed $/hour × hrs/week × 52) / 12`

The user will delete existing data, so the system can switch fully to the new model without preserving legacy behavior.

## Product Decision

This is a hard model replacement, not a compatibility layer.

The app should no longer present:

- `Payout $/hr`
- `Hours`
- hourly payout calculations

It should instead present:

- `Payout $/month`
- `Hrs per week`
- `Total` using monthlyized weekly-hours logic

## Core Formula

For invoice team rows and hour-based adjustments:

`Total = (Rate ($/hr) × Hrs per week × 52) / 12`

The visible field label remains `Total`.

This applies to:

- invoice team members
- onboarding advance
- offboarding deduction
- appraisal advance

Reimbursements / Expenses remain direct-amount entries.

## Data Model Changes

### Employees

Current employee fields:

- `billing_rate_usd_cents`
- `payout_rate_usd_cents`

New employee model:

- `billing_rate_usd_cents` stays hourly
- `payout_monthly_usd_cents` replaces hourly payout
- `hrs_per_week` is added as a default workload field

### Invoice Line Items

Current line item shape uses:

- `hours_billed`
- `payout_rate_usd_cents`
- billed total from `billing rate × hours`

New line item model uses:

- `hrs_per_week`
- `payout_monthly_usd_cents_snapshot`
- `billed_total_usd_cents` calculated from monthlyized weekly-hours formula

The field shown in the invoice editor should be `Hrs per week`, not `Hours`.

### Invoice Adjustments

Hour-based adjustments should use:

- `employee_name`
- `rate_usd_cents`
- `hrs_per_week`
- `amount_usd_cents`

Reimbursements / Expenses continue to use:

- `label`
- `amount_usd_cents`

## Schema Update Files

The implementation should create two separate SQL files:

### 1. Schema update SQL

Create a new migration-style file for existing databases, for example:

`supabase/migrations/2026-04-08-monthly-payout-weekly-hours.sql`

This file should:

- add `payout_monthly_usd_cents` to `employees`
- add `hrs_per_week` to `employees`
- add `hrs_per_week` to `invoice_line_items`
- add `payout_monthly_usd_cents_snapshot` to `invoice_line_items`
- add `hrs_per_week` to `invoice_adjustments`
- keep table structure intact
- drop or rename old columns only if the app code is fully switched in the same change

### 2. Data reset SQL

Create a separate safe data-clear file, for example:

`supabase/reset-data-keep-tables.sql`

This file should:

- delete all rows from operational tables
- preserve table definitions and indexes
- reset in the correct dependency order

It should clear:

- `invoice_realizations`
- `invoice_adjustments`
- `invoice_line_items`
- `invoice_teams`
- `invoices`
- `employees`
- `teams`
- `companies`

## UI Changes

### Employee Page

Update employee creation and employee cards:

- `Payout $/hr` becomes `Payout $/month`
- add `Hrs per week`
- keep `Billing rate (USD/hr)`
- employee summary cards should show billed hourly rate and payout monthly amount

### Invoice Draft Team Rows

Update invoice line-item editing:

- `Hours` becomes `Hrs per week`
- `Total` uses monthlyized weekly-hours formula
- row total is recalculated from editable `Rate ($/hr)` and `Hrs per week`

### Adjustments

Update hour-based adjustment forms:

- `Hours` becomes `Hrs per week`
- `Total` uses the same monthlyized formula

Reimbursement stays:

- `Type / Label`
- `Amount`

### PDF

PDF team rows and hour-based adjustment rows must reflect:

- `Hrs per week`
- `Total` based on the monthlyized formula

## Domain Logic Changes

The billing domain should stop treating invoice rows as direct `hourly rate × billed hours`.

Instead:

- invoice line-item totals become monthlyized weekly-hour totals
- payout totals should be based on monthly payout snapshots where required for reporting
- adjustment totals for onboarding/offboarding/appraisal use the same formula

## Error Handling

Validation should ensure:

- `Rate ($/hr)` is numeric and non-negative
- `Hrs per week` is numeric and non-negative
- `Payout $/month` is numeric and non-negative
- reimbursement amount is numeric and non-negative

## Testing

Update and add tests for:

- employee model changes
- monthlyized line-item total calculation
- monthlyized adjustment total calculation
- invoice editor labels (`Hrs per week`, `Payout $/month`)
- PDF output using weekly-hours totals
- one E2E flow for:
  - adding employee with monthly payout + weekly hours
  - creating invoice
  - editing invoice team row using weekly hours
  - verifying total reflects `(rate × hrs/week × 52) / 12`

## Scope Notes

Because the user will delete all existing data:

- no legacy invoice recalculation support is needed
- no backfill migration is required
- only schema shape and current application behavior need to be updated
