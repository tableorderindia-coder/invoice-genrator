# Employee Cash Flow Batches And Row Editing Design

**Date:** 2026-04-12

## Goal

Extend Employee Cash Flow so users can:

- update a single employee row directly to Supabase
- enter whole-number monthly paid and paid-rate values while still allowing decimals
- derive actual paid INR from `days worked × monthly paid dollars × paid USD/INR`
- manage saved populated cash-flow rows in a dedicated edit/view/remove tab
- add the same invoice multiple times for the same month as separate saved batches

## Current Problem

The current Employee Cash Flow flow assumes a single saved set of rows per invoice and month. That creates five issues:

1. saving is bulk-only, not per employee row
2. monthly paid and paid USD/INR input behavior is awkward for whole numbers
3. actual paid INR is stored as a manual field instead of being derived from the working inputs
4. there is no dedicated saved-row management tab
5. the same invoice cannot be intentionally loaded and saved twice as separate batches

## Approved Behavior

### 1. Row-Level Save

- Every editable employee cash-flow row gets its own `Update` action.
- Updating one row saves only that row to Supabase.
- The bulk save flow may remain, but row-level update must be available and reliable.

### 2. Input Behavior

- `Monthly Paid $` and `Paid USD/INR` should behave naturally for integers.
- Users can type `5000` without the UI forcing an awkward decimal-first experience.
- Users can still type decimals such as `84.25` if needed.

### 3. Actual Paid INR Formula

- `Monthly Paid $` should prefill from the selected employee’s payout monthly USD where available.
- `Actual Paid (INR)` becomes a derived value:
  - `days worked × monthly paid dollars × paid usd/inr`
- This should update live in the editor and be what is persisted.

### 4. Saved Rows Tab

- Add a new Employee Cash Flow tab for saved populated rows.
- The tab must support:
  - viewing saved rows
  - editing saved rows
  - removing saved rows
- This is distinct from the current load/edit composer view.

### 5. Duplicate Invoice Loads

- The same invoice can be added multiple times in the same month intentionally.
- Each add creates a separate cash-flow batch, even when the invoice id is the same.
- These batches remain separately editable and removable.
- Dashboard aggregation ignores batch boundaries and still combines all same-month rows by employee.

## Data Model Decision

Introduce a batch identity above invoice identity.

### New Concept: Cash Flow Batch

A cash-flow batch represents one loaded invoice instance inside Employee Cash Flow for a company and month.

- Multiple batches can reference the same invoice id.
- Each batch has its own saved row set.
- Rows are stored per employee plus batch, not just per employee plus invoice.

### Storage

The existing `invoice_payment_employee_entries` table remains the source of truth for employee cash-flow rows, but rows need batch identity. The cleanest approved approach is:

- add `cash_flow_batch_id`
- add `cash_flow_batch_label` or equivalent batch display metadata if helpful for UI
- keep `invoice_id` as the source invoice link

Optionally, introduce a lightweight `cash_flow_batches` table if needed for listing/removing batches cleanly. This is acceptable if it keeps the row model simpler.

## UI Design

### Employee Cash Flow Screen Structure

Use two tabs:

1. `Compose`
   - select company, month, and one or more invoice instances
   - add duplicate invoice batches intentionally
   - edit rows before or after saving

2. `Saved Rows`
   - list already saved rows for the selected company and month
   - support row edit, row update, row delete
   - mirror the dashboard employee/month structure visually
   - do not aggregate saved rows; each saved entry stays its own row

### Invoice Selection / Duplication

- Invoice options remain filtered by company and month.
- Add a control to insert another instance of the same invoice into the compose list.
- Each inserted instance gets a unique client batch id that becomes a saved batch id.

### Row Card Display

Each row should show enough identity to avoid confusion:

- employee name
- source invoice number
- batch identity when duplicate batches exist
- current month

### Row Actions

Per row:

- `Update`
- `Remove row`

Saved rows tab should group like the dashboard:

- employee section
- month subgroup
- individual saved entry rows inside that subgroup

Each row must still show invoice and batch identity so duplicate invoice instances remain distinguishable.

## Calculation Rules

### Derived Actual Paid INR

For a row:

- `actualPaidInrCents = round(daysWorked × monthlyPaidUsd × paidUsdInrRate)`

Where:

- `daysWorked` is treated as the direct multiplier requested by the user
- `monthlyPaidUsd` is the entered USD amount
- `paidUsdInrRate` is the entered rate

This replaces the current manual actual-paid editing model on the Employee Cash Flow screen.

### Dashboard Aggregation

The dashboard continues to aggregate by:

- employee
- year
- month

It must sum across all rows regardless of invoice duplication or batch identity. That means:

- duplicate invoice batch rows contribute independently
- onboarding, reimbursement, appraisal, inward, and offboarding continue to land in their existing columns
- monthly/yearly company P/L continues to sum employee-month totals from all batches

## Validation And Edge Cases

- Duplicate invoice batches must not overwrite one another.
- Row-level update must target the correct saved row by row id plus batch id.
- Removing one duplicate batch must not remove another batch for the same invoice.
- Compose view and saved rows view must stay consistent after update/remove.
- If an employee appears multiple times in the same invoice across duplicate batches, the dashboard must still aggregate all of them into one employee-month result.

## Testing

Add coverage for:

- duplicate invoice batch creation and persistence
- row-level update saving only one row
- actual paid INR derived formula
- integer-friendly and decimal-friendly input parsing
- saved rows tab listing and removal
- dashboard aggregation across duplicate batches of the same invoice

## Out Of Scope

- changing dashboard grouping away from employee-month aggregation
- redesigning the rest of the dashboard layout
- changing invoice generation or invoice PDF behavior
