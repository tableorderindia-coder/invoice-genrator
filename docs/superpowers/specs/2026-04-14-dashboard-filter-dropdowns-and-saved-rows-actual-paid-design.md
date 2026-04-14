# Dashboard Filter Dropdowns And Saved Rows Actual Paid Design

**Date:** 2026-04-14

## Goal

Improve Employee Cash Flow and the company dashboard so filtering is compact, consistent, and easier to use, while also making saved-row actual paid values directly editable.

The approved changes are:

- replace the tall visible multi-select lists with compact dropdown filters that open checkbox panels
- support `Select all` inside those filter panels
- apply the same employee and month filtering model across:
  - dashboard employee view
  - dashboard monthly/yearly view
  - employee cash flow saved rows tab
- change Employee Cash Flow invoice selection to the same dropdown checklist pattern
- normalize displayed month/date formatting across these surfaces
- add an editable `Actual paid (INR)` column to Employee Cash Flow saved rows

## Current Problem

The current UI works, but it has four usability gaps:

1. dashboard employee filters are always expanded as large multi-select lists, which takes too much space and is hard to scan
2. dashboard monthly/yearly view inherits employee and month filters through hidden inputs, but does not expose the same controls directly
3. employee cash flow saved rows do not currently support employee/month filtering even though users work with those same concepts elsewhere
4. saved rows show a derived actual paid value only, so users cannot directly correct paid amounts when reality differs from the formula

## Approved Behavior

### 1. Shared Dropdown Checklist Pattern

Use the same interaction model for all multi-value filters in scope:

- show a compact closed trigger instead of a tall list
- clicking the trigger opens a checklist panel
- users tick one or more values inside the panel
- a `Select all` control appears at the bottom of the panel
- the selected values are only applied when the user clicks `Load`

This applies to:

- dashboard employee filter
- dashboard month filter
- employee cash flow invoice filter
- employee cash flow saved rows employee filter
- employee cash flow saved rows month filter

The dropdown does not need live-fetch behavior. It can remain form-driven and URL-driven.

### 2. Dashboard Filter Consistency

The company dashboard must expose the same employee and month filters in both views:

1. `Employee`
2. `Monthly / Yearly`

Changing views must preserve the currently selected filters. Users should not need to switch back to the employee tab to change filters.

### 3. Employee Cash Flow Saved Rows Filters

The `Saved Rows` tab should expose:

- employee filter
- month filter

These filters must follow the same dropdown checklist pattern as the dashboard.

The filtering behavior is:

- company remains the primary scope
- saved rows are narrowed by the selected employees and selected months
- when nothing is explicitly selected, all available values are shown

### 4. Invoice Selection In Employee Cash Flow

The compose tab’s invoice selector should stop using the always-open multi-select box.

Replace it with a compact dropdown checklist that:

- lists all available cashed-out invoices for the selected company
- supports selecting one or more invoices
- preserves existing repeated `invoiceId` query params
- still loads rows only after the user presses `Load`

### 5. Editable Actual Paid In Saved Rows

In the Employee Cash Flow `Saved Rows` table:

- add an editable `Actual paid (INR)` input column
- the value sent to the update action should come from the edited row state, not always from a fresh formula recomputation
- `Salary paid` and any downstream calculations that depend on actual paid should use the edited saved-row value after it is updated

This is intentionally different from the compose tab, where derived values may still remain formula-driven.

## URL And State Contract

Keep the existing server-rendered URL flow. The new UI should submit the same shape of filters through hidden inputs or regular form fields.

### Query Parameters

- `companyId`: selected company
- `tab`: employee cash flow tab
- `month`: employee cash flow compose month in `YYYY-MM`
- `invoiceId`: repeated param for selected invoices
- `employeeIds`: repeated param for selected employees
- `paymentMonths`: repeated param for selected months
- `allEmployees`: `"1"` when all employees are selected
- `allMonths`: `"1"` when all months are selected

### Semantics

- If `allEmployees=1`, server logic may treat that as all employees even if explicit ids are also present.
- If `allMonths=1`, server logic may treat that as all available months even if explicit values are also present.
- If no employee ids are present and `allEmployees` is absent, default to all employees.
- If no payment months are present and `allMonths` is absent, default to all months.
- Invoice selection remains explicit-only; there is no invoice `select all` requirement unless it falls out naturally from the shared component.

## Date Formatting Decision

Use one shared display formatter for month labels across:

- dashboard employee tables
- dashboard monthly/yearly tables
- employee cash flow saved rows filter labels
- employee cash flow saved rows month headers
- any dropdown option labels for payment months where raw `YYYY-MM` is currently shown

Approved format:

- month-level values display as `Month YYYY`
- example: `April 2026`

Raw `YYYY-MM` values may still be used internally and in URLs, but not as final UI labels where a formatted label is available.

## Component And File Boundaries

### New Shared UI Component

Add one reusable client component for checklist dropdown filters under `app/_components`.

Responsibilities:

- render a button-like trigger
- render a checkbox panel with options
- show selected summary text
- support `Select all`
- mirror selected values into form-compatible inputs

The component should be generic enough to use for invoices, employees, and months without branching logic by page.

### Employee Cash Flow Page

Update `app/employee-cash-flow/page.tsx` to:

- replace invoice multi-select with the shared dropdown filter
- parse employee and payment-month filters for saved rows
- build the available saved-row filter options from the loaded saved-row dataset or a small helper
- pass selected filter state into the saved rows component

### Saved Rows Component

Update `app/employee-cash-flow/_components/employee-cash-flow-saved-rows.tsx` to:

- receive already-filtered rows or enough filter props to render the narrowed dataset
- expose editable `Actual paid (INR)`
- preserve update and remove actions
- use the shared month display formatter

### Dashboard Page

Update `app/dashboard/page.tsx` to:

- replace visible multi-select boxes with the shared dropdown filters
- expose the same employee/month filter controls in `Monthly / Yearly`
- preserve filters while switching views and period type

### Shared Billing Helpers

Small helper additions in `src/features/billing` are acceptable for:

- month label formatting
- normalizing repeated query params
- deriving saved-row filter option lists

Do not introduce a broad new state management layer for this work.

## Data Handling Rules

### Saved Row Filtering

Filtering saved rows should happen before grouping for display so group headers reflect only the visible dataset.

Grouping still remains:

- employee
- payment month
- individual saved row

### Saved Row Update Payload

When a saved row is edited and updated:

- the edited `actualPaidInrCents` value must be persisted
- the update action must not overwrite it with a newly derived value unless that is explicitly intended elsewhere

### Dashboard Filters

Dashboard filtering continues to be server-driven:

- employee filters narrow `getPnDashboardData`
- payment month filters narrow `getPnDashboardData`
- switching between employee and period views preserves both filters

## Edge Cases

- If there are no employees or no months available for a filter, the dropdown should show an empty-state label rather than breaking layout.
- If all options are selected, the closed trigger can show `All` instead of a long comma-separated list.
- If one or more options are selected, the closed trigger can show a short summary such as `3 selected`.
- If the current URL contains ids that are no longer valid for the selected company, ignore them safely.
- If saved rows are empty after filtering, keep the existing empty-state pattern and make the reason understandable.

## Testing

Follow TDD for the implementation.

Add or extend tests for:

- query-param normalization for repeated employee/month selections
- dashboard filter preservation across `Employee` and `Monthly / Yearly` views
- saved-row filtering by employee and payment month
- month label formatting consistency
- saved-row update behavior persisting edited `Actual paid (INR)`
- invoice selection still producing the expected selected invoice ids for compose loading

## Non-Goals

- redesigning dashboard tables beyond the filter controls already approved
- changing employee cash flow compose calculations except where needed to support saved-row editing behavior
- changing invoice storage, payout aggregation, or Supabase schema unless required by the saved actual-paid persistence path
