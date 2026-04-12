# Employee-Linked Reimbursements And Appraisal Design

## Goal

Extend invoice adjustments so reimbursements / expenses and appraisal advance can optionally target a specific employee, then carry those values through Employee Cash Flow, the employee dashboard, and the company monthly/yearly dashboard.

The result should support:

- company-level reimbursements / expenses with no employee selected
- employee-linked reimbursements / expenses with employee, label, and amount
- employee-linked appraisal advance as a separate tracked value
- employee and company P/L that includes these amounts after converting through the cashout rate

## Current State

Today:

- onboarding and offboarding are employee-linked and already flow into Employee Cash Flow and dashboard P/L
- reimbursement is invoice-level and does not consistently carry an employee
- appraisal exists as an invoice adjustment type, but it is not surfaced as its own employee cash-flow/dashboard column
- the company monthly/yearly dashboard already has reimbursement-derived totals, but those are company-level and not broken out into employee-linked detail

This means reimbursements such as laptop purchases or signing bonuses cannot be assigned to an employee and followed through employee profit views.

## Approved Approach

Reuse the existing `invoice_adjustments` pipeline rather than creating a second adjustment system.

This means:

- `invoice_adjustments` remains the source of truth
- reimbursement and appraisal rows can optionally carry employee metadata
- Employee Cash Flow and dashboard shaping logic learn how to interpret those adjustment types per employee
- invoice totals continue to work through the same adjustment aggregation path

## User-Facing Behavior

### Invoice Editor

`Reimbursements / Expenses` will support two modes in one form:

- company-level reimbursement/expense:
  - no employee selected
  - label required
  - amount required
- employee-linked reimbursement:
  - employee selected
  - label required
  - amount required

`Appraisal advance` will be employee-linked and should work like onboarding in terms of employee selection and downstream cash-flow impact, but stay visible as its own separate column.

### Employee Cash Flow

Each employee row will gain:

- reimbursement / expense (USD)
- reimbursement / expense (INR derived by cashout rate)
- appraisal advance (USD)
- appraisal advance (INR derived by cashout rate)

These values should remain visible as separate columns and also contribute to employee-side effective inward / net P&L.

### Employee Dashboard

The employee dashboard table should show:

- reimbursement / expense as its own column
- appraisal advance as its own column
- those values included in employee net P/L

If reimbursement labels are available for an employee-month, they should be shown in a compact readable form alongside the reimbursement amount instead of being lost entirely.

### Company Monthly / Yearly Dashboard

The company monthly/yearly view should include:

- manual expenses (existing behavior stays intact)
- reimbursement / expense (USD)
- reimbursement / expense (INR)
- appraisal advance (USD)
- appraisal advance (INR)

Monthly/yearly net P/L should include:

- employee-linked reimbursements converted to INR
- company-level reimbursements converted to INR
- appraisal advance converted to INR

Manual dashboard expenses remain a separate subtraction path and should not be overwritten by these new adjustment columns.

## Data Rules

### Employee-Linked Reimbursement

When a reimbursement has an employee selected:

- it belongs to that employee for cash flow and dashboard purposes
- it increases that employee’s effective inward
- it increases that employee’s net P/L
- it appears in both employee and company views
- its label/type should remain available for display

### Company-Level Reimbursement

When a reimbursement has no employee selected:

- it stays invoice/company scoped
- it affects company monthly/yearly totals only
- it does not create or modify an employee row

### Appraisal Advance

Appraisal advance should be treated as employee-linked positive value:

- it increases employee effective inward
- it increases employee net P/L
- it appears as a separate column from onboarding advance
- it contributes to company monthly/yearly totals after INR conversion

### Offboarding

Offboarding remains unchanged:

- negative employee-side effect
- separate visible column

## Storage Model

Keep using `invoice_adjustments`.

Required model behavior:

- reimbursement rows may have `employee_name`
- appraisal rows should carry `employee_name`
- label remains required for reimbursement rows
- amount remains the source amount in USD cents

No new adjustment table should be introduced.

## Aggregation Changes

### Employee Cash Flow Shaping

The adjustment extraction logic should calculate, per employee:

- onboarding advance USD
- offboarding deduction USD
- reimbursement USD
- appraisal advance USD

It should also preserve any employee reimbursement labels needed for display.

When a monthly row is built:

- base inward remains the invoice/cashout inward
- onboarding, reimbursement, and appraisal are added into effective inward
- offboarding is subtracted from effective inward
- INR equivalents are derived from the row cashout rate

### Dashboard Aggregation

Employee dashboard rows should carry the new reimbursement/appraisal fields directly from Employee Cash Flow.

Company monthly/yearly rows should sum:

- employee-linked reimbursement INR
- company-level reimbursement INR
- appraisal INR

Those sums should flow into final net P/L alongside the existing cash flow and manual expense logic.

## Validation

- reimbursement label must not be blank
- reimbursement amount must be valid
- employee is optional for reimbursement
- employee is required for appraisal advance
- selected employee must belong to the invoice company

If validation fails, the invoice draft page should continue using the existing flash error pattern.

## UI Constraints

- preserve the existing invoice editor structure
- extend the current adjustment form rather than redesigning it
- keep the add-adjustment sidebar scroll behavior
- preserve current dashboard structure where possible, only widening data columns as needed

## Testing

Add focused coverage for:

- employee-linked reimbursement payload and validation
- company-level reimbursement staying out of employee cash flow
- employee-linked reimbursement appearing in employee cash flow
- appraisal advance appearing as a separate employee cash-flow/dashboard column
- company monthly/yearly P/L including reimbursement/appraisal INR values
- invoice draft flow allowing reimbursement with and without employee selection

## Risks And Mitigations

### Mixed reimbursement semantics

Risk: company-level and employee-level reimbursements could be confused if they share one type.

Mitigation: make employee selection explicit and interpret employee presence as the branch condition.

### Double counting in employee and company dashboards

Risk: employee-linked reimbursements could be summed once per employee and again as invoice-level totals.

Mitigation: company totals should sum employee-linked reimbursements from employee cash flow plus only the truly company-level reimbursement rows, never both for the same adjustment.

### Dashboard column sprawl

Risk: adding more columns can make the tables harder to scan.

Mitigation: preserve the current structure and add only the approved reimbursement/appraisal columns, without unrelated redesign.

## Out Of Scope

- creating a new adjustment type beyond the existing four
- redesigning the dashboard layout
- changing invoice PDF format
- changing manual dashboard-expense behavior
