# Employee Statements Design

**Date:** 2026-04-14

## Goal

Add a dedicated employee statement page where users can:

- select a company
- select one, multiple, or all employees
- choose a start month and end month
- load statement data grouped by employee and month
- edit statement values inline
- save edits once per employee
- download one PDF per employee statement

This feature is a statement workflow, not a dashboard extension and not an invoice rewrite flow.

## Approved Location

Create a separate page:

- `app/employee-statements/page.tsx`

This page is intentionally separate from:

- `app/dashboard/page.tsx`
- `app/employee-cash-flow/page.tsx`

The goal is to keep the statement workflow focused and prevent dashboard or cash-flow tabs from becoming overloaded with a second reporting mode.

## Current Problem

Users need an employee-facing statement view that does not exist yet.

The existing app has:

- invoice generation
- employee cash flow editing
- dashboard reporting
- invoice PDF generation

But it does not provide a dedicated employee statement that:

- spans a month range
- loads one or multiple employees at once
- shows invoice-linked entries per employee
- supports statement-only edits
- produces a branded PDF per employee

## Approved Behavior

### 1. Filter Bar

The employee statements page should have a top filter area with:

- `Company`
- `Employees`
- `Start month`
- `End month`
- `Load`

### 2. Employee Filter Behavior

The employee selector should use the same checklist dropdown pattern already approved elsewhere in the app:

- compact closed trigger
- checkbox list when opened
- supports one, multiple, or all employees
- includes `Select all`
- values apply only after clicking `Load`

### 3. Load Result Shape

After `Load`, the page renders one statement section per selected employee.

Each employee section is separate and includes:

- employee-specific statement header
- grouped month blocks
- editable statement values
- one `Save` button for that employee
- one `Download PDF` button for that employee

If a selected employee has no invoice entries in the chosen range, the page should not render an empty statement block for that employee.

## Statement Table Structure

### Invoice Rows

Within each employee statement, rows are grouped by month.

For a given month:

- each invoice for that employee appears as its own row
- if two or more invoices exist in the same month, each invoice is shown separately

Each invoice row includes these columns:

- `Month`
- `Invoice no.`
- `Dollar inward`
- `Onboarding advance`
- `Employee reimbursements (USD)`
- `Employee reimbursement labels`
- `Offboarding deduction`

The following columns were requested initially but are now explicitly excluded:

- `Employee reimbursements (INR)`
- `Appraisal advance`
- `Appraisal advance (INR)`

### Month Summary Rows

After the invoice rows for a month, render two full-width summary rows sized to the combined width of the statement table:

1. `Effective dollar inward`
2. `Monthly $ paid`

These rows are month-level values, not invoice-level values.

They should visually read as month summary rows rather than ordinary table cells repeated across invoice rows.

## Data Rules

### Invoice-Level Source

Statement invoice rows are based on invoice-linked employee data.

The statement should show one row per employee per invoice.

Month should be derived from the invoice month.

If multiple invoices exist in the same month for one employee, they remain separate invoice rows under the same month block.

### Monthly Dollar Paid Source

`Monthly $ paid` should not come from employee cash flow saved rows.

It should default from the employee master record set during employee creation and editing:

- `Employee.payoutMonthlyUsdCents`

This value currently exists in the employee model and employee management flow.

### Effective Dollar Inward

`Effective dollar inward` is a month-level summary field.

Its initial default should be the sum of all statement invoice-row entries for that employee in that month.

It is shown in a full-width month summary row after the invoice rows.

### Statement Edit Isolation

Edits made on the employee statements page should affect only the new employee statement feature.

They must not update:

- invoices
- dashboard values
- employee cash flow rows
- employee master defaults

This page is a statement workspace with its own saved state.

## Storage Design

Use a dedicated statement-specific persistence model with two levels of saved data.

### Invoice-Level Statement Rows

Keyed by:

- employee
- invoice

Saved fields:

- month snapshot
- invoice number snapshot
- dollar inward
- onboarding advance
- employee reimbursements (USD)
- employee reimbursement labels
- offboarding deduction

### Month-Level Statement Summaries

Keyed by:

- employee
- payment month

Saved fields:

- effective dollar inward
- monthly dollar paid

This split matches the approved UI:

- invoice rows for invoice-level values
- full-width month summary rows for month-level values

## Editing Model

All visible statement values are editable inline.

Editing rules:

- invoice-row edits affect only that invoice-row statement record
- month summary edits affect only that employee-month statement summary record
- the user can make multiple edits across the employee section before saving
- one `Save` button persists the entire employee statement section at once

There is no row-by-row save button in this feature.

## Save Behavior

Each employee statement section gets a single `Save` button.

Clicking `Save` should persist:

- all edited invoice-level rows in that employee section
- all edited month summary rows in that employee section

The save action should not be blocked by other loaded employee sections. Each employee section saves independently.

## PDF Behavior

Each employee statement section gets its own `Download PDF` action.

The PDF should reuse the branded invoice-PDF visual language where practical, but with employee statement content instead of invoice content.

### PDF Header

Use an invoice-style header block that includes:

- company name
- employee name
- selected date range
- generated date

### PDF Body

The PDF body should mirror the on-screen month-grouped structure:

- invoice rows grouped by month
- full-width month summary row for `Effective dollar inward`
- full-width month summary row for `Monthly $ paid`

### PDF Totals

Include totals at the end of the PDF across the selected range.

Approved totals:

- total dollar inward
- total onboarding advance
- total reimbursements (USD)
- total offboarding deduction
- total effective dollar inward
- total monthly dollar paid

## File And Component Boundaries

### New Page

Add:

- `app/employee-statements/page.tsx`

Responsibilities:

- parse search params
- load companies, employees, and month options
- load statement sections for selected employees
- render filter form and employee statement sections

### New Statement Components

Add dedicated components under:

- `app/employee-statements/_components`

Likely splits:

- filter form or page section wrapper
- employee statement section
- statement table and month summary rows

### New Billing Domain Files

Add statement-specific helpers under:

- `src/features/billing`

Likely responsibilities:

- statement query parsing and filter helpers
- statement view model building
- statement persistence
- statement PDF model building
- statement PDF rendering

### Reuse

Reuse existing patterns where appropriate:

- checklist dropdown filter component
- pending submit button pattern
- invoice PDF branding approach

Do not force this feature into the existing employee cash flow saved-row component because the row model and save behavior are different.

## Data Retrieval Rules

### Company Scope

All statement data is scoped to the selected company.

### Employee Scope

Load only the selected employees.

If no employees are explicitly selected, default to all available employees for the selected company.

### Month Range Scope

Use `startMonth` and `endMonth` in `YYYY-MM` form.

The statement should include invoice-linked rows whose invoice month falls inside the inclusive range from start to end.

If the range is invalid, the page should fail safely with a clear message rather than silently loading the wrong months.

## Rendering Rules

- group employee statement data by month in chronological order
- group invoice rows inside the month by invoice date, then invoice number
- show month labels in the same formatted `Month YYYY` style used elsewhere in the app
- render full-width summary rows after the invoice rows for that month
- keep month summary rows visually distinct from regular invoice rows

## Edge Cases

- if a company has no employees, show an empty-state message instead of a broken filter
- if the selected range has no invoices for any selected employee, show an empty-state message
- if one selected employee has data and another does not, render only the employee with data
- if saved statement data exists for an employee-month but the raw invoice set has changed, prefer the saved statement record for editable fields while keeping invoice identity aligned to the current invoice rows
- if an invoice referenced by a saved statement row no longer exists, ignore that saved row safely instead of crashing the page

## Testing

Follow TDD for implementation.

Add or extend tests for:

- employee statement filter parsing
- inclusive month-range handling
- invoice-row grouping by employee and month
- month summary row generation
- defaulting `monthly $ paid` from employee master payout
- statement save behavior for invoice rows and month summaries
- statement-only edit isolation from invoice and cash-flow data
- employee statement PDF model generation

## Non-Goals

- changing invoice source data when statement edits are saved
- changing employee cash flow saved rows behavior
- changing dashboard data models
- adding combined multi-employee PDFs in this feature
- adding statement editing to existing invoice pages
