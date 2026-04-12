# Multi-Invoice Employee Cash Flow Design

**Date:** 2026-04-12

## Goal

Allow Employee Cash Flow to load multiple invoices for the same company and month, keep one editable row per `employee + invoice`, and have the dashboard aggregate those rows by `employee + month`.

## Current Problem

- [app/employee-cash-flow/page.tsx](D:/Eassyonboard%20invoice%20genrator%20and%20company%20dashboard/app/employee-cash-flow/page.tsx:1) only accepts a single `invoiceId`.
- [src/features/billing/employee-cash-flow-entry-aggregation.ts](D:/Eassyonboard%20invoice%20genrator%20and%20company%20dashboard/src/features/billing/employee-cash-flow-entry-aggregation.ts:1) merges loaded rows into a single row per employee.
- This prevents storing separate same-month invoice rows for the same employee.
- The user needs separate invoice rows preserved, while the dashboard still combines them into a single monthly employee view.

## Approved Behavior

### Employee Cash Flow Page

- The page will allow selecting multiple invoices for the same company and month.
- Selected invoices must all load together into the editor.
- Each loaded row stays separate by `employee + invoice`.
- If one employee appears in multiple invoices in the same month, multiple editable rows must appear.
- Each row continues to store its own:
  - base dollar inward
  - onboarding advance
  - reimbursement amount and labels
  - appraisal advance
  - offboarding deduction
  - cashout rate
  - salary and payment fields

### Dashboard Employee View

- Dashboard employee rows continue to group by employee and month.
- All cash-flow rows for the same employee and month must be summed together, even if they came from different invoices.
- Aggregation must preserve the current per-column behavior:
  - onboarding, reimbursements, appraisal add into the employee-side totals
  - offboarding deductions subtract
  - reimbursement labels roll up into the monthly employee row

### Dashboard Monthly / Yearly View

- Period rows continue to aggregate month/year totals from cash-flow rows.
- If multiple invoices exist in the same month, their employee rows must all contribute to:
  - dollar inward
  - reimbursements
  - appraisal advance
  - salary paid
  - net P/L

## Data Model Decision

No new summary table will be added.

The existing `invoice_payment_employee_entries` table remains the source of truth. The change is:

- preserve invoice-level rows in Employee Cash Flow editing
- aggregate only in dashboard builders

This keeps auditability and avoids duplicate monthly summary state.

## UI Design

### Filters

- Replace the single invoice select with a multi-select invoice picker for the selected company and month.
- If no invoices are selected, default to loading all available invoice options for that company-month only if the current UX already auto-selects the first invoice; otherwise require explicit selection.
- The selected state must round-trip through the URL so refresh and save flows keep the same invoice set.

### Entry Form

- The form will render one card/row per `employee + invoice`.
- Each row must clearly identify its invoice number.
- Existing edit and remove behavior stays intact per row.
- No hidden re-aggregation should happen inside page state before rendering.

## Aggregation Rules

### Employee Cash Flow Editor

- Keep raw invoice-level rows separate.
- Sorting order should be:
  - employee name
  - month
  - invoice number

### Dashboard Employee Aggregation

- Group key remains `employeeId + year + month`.
- Sum all numeric fields across invoice rows for the same group.
- Reimbursement label text joins distinct non-empty labels.

### Dashboard Editable Employee Section

- Keep invoice rows visible as separate rows in the editable dashboard employee table.
- No change to invoice-level edit behavior there.

## Validation and Edge Cases

- Same employee on multiple invoices in the same month must not overwrite earlier rows.
- Adjustment-only rows for an employee must still be included for that invoice.
- Missing invoice line items must still support manual/non-invoice rows where already allowed.
- If invoice selections span different months, the server should reject them or ignore out-of-month invoices consistently; the simplest approved rule is to limit options to the selected month so cross-month selection cannot happen.

## Testing

- Add page-state or aggregation tests proving invoice rows remain separate for the same employee.
- Add dashboard aggregation tests proving multiple invoice rows for one employee/month combine into one employee-month row with summed values.
- Verify monthly/yearly period rows include all same-month invoice rows.

## Out of Scope

- Cross-month combined editing
- New monthly summary tables
- Redesigning the cash-flow UI beyond the invoice selector and per-row invoice labeling
