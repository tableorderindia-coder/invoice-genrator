# Employee Cash Flow Dashboard Design

## Goal

Add a new cash-reality dashboard that sits alongside the existing invoice generation, company P&L, employee tracking, and work-log flows without modifying their tables, queries, or UI. The new dashboard must show when cash is actually received, when salary is actually paid, and when an employee is temporarily in negative cash flow because collections lag payroll.

## Non-Negotiable Constraints

- Do not modify existing invoice tables.
- Do not modify existing P&L queries or dashboard behavior.
- Do not alter the UI of existing pages.
- Build the feature as a new layer only:
  - new tables
  - new store/query path
  - new actions
  - new UI page/tab
- Existing invoice, line-item, adjustment, employee payout, and work-log data may be read for prefilling and reporting, but not rewritten as part of this feature.

## User Problem

The existing system answers accrual questions well enough:

- work was done in month A
- invoice was raised in month A
- employee contribution to invoice value exists in month A

But it does not answer cash-reality questions:

- when was the client money actually received
- how much of that receipt belongs to each employee
- how much salary was actually paid that month
- which employees are temporarily negative because salary went out before invoice cash came in

This feature adds that missing cash layer.

## Product Shape

Build a new dashboard page for employee cash flow rather than extending the existing P&L dashboard logic.

The new page should behave like a sibling to the current employee payout/dashboard experience:

- company selector
- employee-level monthly table
- invoice payment entry workflow
- editable prefilled values
- detail panel for employee-month cash reality

This page should feel familiar to operators who already use the current payout section, but all calculations must come from the new cash-ledger tables plus read-only references to existing invoice and work-log data.

## Core Accounting Rules

### Revenue Recognition vs Cash

- existing invoice and payout logic continues to represent accrual-side information
- new cash dashboard represents actual cash movement only

### Salary Cash Out

- salary paid in a month is tracked separately from invoice accrual
- salary can be paid even when no invoice payment has been received yet
- if salary is paid and inward is zero, the employee should show a negative net

### Partial Payments

- one invoice can have multiple payment events
- each payment event has its own:
  - payment date
  - payment month
  - cashout rate
  - editable employee allocations

### Manual Employee Inclusion

- when entering a payment for an invoice, users can add employees who were not present on that invoice
- those employees may have:
  - zero inward
  - positive onboarding advance inward
  - negative offboarding deduction impact
- this supports salary-paid-with-no-collection scenarios cleanly

### Adjustment Handling

If the selected invoice includes employee-linked adjustment rows, those adjustments must appear in the same cash-entry form:

- onboarding advance increases employee dollar inward
- offboarding deduction decreases employee dollar inward

The form must show the breakdown, not only the final total, so operators can inspect and edit the source values directly.

## Data Model

### 1. `employee_salary_payments`

Purpose:
Track actual salary cash out per employee per month.

Columns:

- `id` text primary key
- `employee_id` text not null references existing employee id
- `company_id` text not null references existing company id
- `month` text not null
- `salary_inr` bigint not null
- `paid_status` boolean not null default false
- `paid_date` date null
- `notes` text null
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

Constraints and indexes:

- unique on (`employee_id`, `company_id`, `month`)
- index on (`company_id`, `month`)
- index on (`employee_id`, `month`)

Notes:

- `month` should use `YYYY-MM`
- this table is independent from existing payout or employee payout records

### 2. `invoice_payments`

Purpose:
Track actual cash receipt events against existing invoices.

Columns:

- `id` text primary key
- `invoice_id` text not null references existing invoice id
- `company_id` text not null references existing company id
- `payment_date` date not null
- `payment_month` text not null
- `usd_inr_rate` numeric(12,4) not null
- `notes` text null
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

Constraints and indexes:

- index on (`invoice_id`)
- index on (`company_id`, `payment_month`)
- index on (`company_id`, `payment_date`)

Notes:

- one invoice may have many `invoice_payments`
- `payment_month` uses `YYYY-MM`
- this table is the header row for one cash receipt event

### 3. `invoice_payment_employee_entries`

Purpose:
Track employee-level cash allocation rows for a single invoice payment event. This is the editable ledger row that powers the new dashboard.

Columns:

- `id` text primary key
- `invoice_payment_id` text not null references `invoice_payments.id`
- `invoice_id` text not null
- `employee_id` text not null
- `company_id` text not null
- `payment_month` text not null
- `invoice_line_item_id` text null
- `days_worked` integer not null default 0
- `days_in_month` integer not null default 0
- `monthly_paid_usd_cents` bigint not null default 0
- `base_dollar_inward_usd_cents` bigint not null default 0
- `onboarding_advance_usd_cents` bigint not null default 0
- `offboarding_deduction_usd_cents` bigint not null default 0
- `effective_dollar_inward_usd_cents` bigint not null default 0
- `cashout_usd_inr_rate` numeric(12,4) not null
- `paid_usd_inr_rate` numeric(12,4) not null default 0
- `cash_in_inr_cents` bigint not null default 0
- `notes` text null
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

Constraints and indexes:

- index on (`invoice_payment_id`)
- index on (`company_id`, `payment_month`)
- index on (`employee_id`, `payment_month`)
- index on (`invoice_id`, `employee_id`)

Derived rule:

- `effective_dollar_inward_usd_cents = base_dollar_inward_usd_cents + onboarding_advance_usd_cents - offboarding_deduction_usd_cents`
- `cash_in_inr_cents = round(effective_dollar_inward_usd_cents * cashout_usd_inr_rate / 100)` when converting cents-based USD to INR cents in code or SQL

Why store these fields instead of deriving everything live:

- the user explicitly wants all fields prefilled but editable
- the new dashboard should remain stable even if old payout values later change
- the operator needs to add employees not originally on the invoice
- negative-net rows require persisted zero-inward entries, not just inferred invoice contributors

## Read-Only Existing Data Dependencies

The new layer may read these existing concepts for prefilling and reporting:

- invoices
- invoice line items
- invoice adjustments
- employee payout rows
- work logs or any existing employee-to-invoice contribution source
- company and employee master data

Existing data is used only to:

- load selectable invoices with `cashed_out` status
- preload employee rows for a selected invoice
- populate days worked
- populate monthly paid dollars
- populate default paid and cashout rates where available
- surface existing accrual-side values in the detail panel

## Prefill Strategy

When a user selects an invoice that has been cashed out:

1. Create or open an `invoice_payments` header record for the selected payment event.
2. Prefill employee entry rows from existing invoice and payout context.
3. For each employee row, prefill:
   - `days_worked`
   - `days_in_month`
   - `monthly_paid_usd_cents`
   - `base_dollar_inward_usd_cents`
   - `onboarding_advance_usd_cents`
   - `offboarding_deduction_usd_cents`
   - `cashout_usd_inr_rate`
   - `paid_usd_inr_rate`
4. Compute:
   - `effective_dollar_inward_usd_cents`
   - `cash_in_inr_cents`
5. Allow the user to edit every prefilled field before saving.
6. Allow the user to add additional employee rows manually.

If a manually added employee has:

- salary paid
- zero effective inward

the row must still be saved and displayed, and the monthly net must show as negative.

## New Dashboard Queries

### Employee Monthly Cash Flow

For each employee per selected month:

- cash in comes from summed `invoice_payment_employee_entries.cash_in_inr_cents`
- salary out comes from `employee_salary_payments.salary_inr`
- net cash = cash in - salary out

Additional cash view columns come from the saved employee payment entry rows:

- days worked
- monthly paid dollars
- cashout USD/INR rate
- paid USD/INR rate
- dollar inward
- onboarding advance
- offboarding deduction
- effective inward

### Accrual Side in Detail Panel

The employee detail panel should also show read-only existing figures:

- total work done
- invoice amount / accrual amount
- payment received / cash amount
- salary paid
- pending amount

Pending amount is conceptually:

- accrual-side employee amount minus cash-side amount received so far

Implementation rule:

- use existing employee payout accrual-side amount as the source of truth for the employee-month accrual total
- subtract summed cash received from `invoice_payment_employee_entries.cash_in_inr_cents`
- keep this calculation read-only within the new dashboard
- do not write the result back into any existing invoice or payout table

## UI Design

### New Route

Create a new page, separate from the existing dashboard:

- `/employee-cash-flow`

### Page Layout

Top section:

- company selector
- month selector
- employee filter
- status filter

Primary action section:

- select cashed-out invoice
- create/open payment event for selected invoice
- preload employee cash rows

Main table:

| Employee | Month | Invoice | Days Worked | Monthly Paid $ | Dollar Inward | Onboarding Advance | Offboarding Deduction | Effective Inward $ | Cashout USD/INR | Paid USD/INR | Cash In INR | Salary Paid INR | Pending Amount | Net | Status |

Status rules:

- if `net < 0`, show loss state
- if `net > 0`, show profit state
- if salary is paid and effective inward is zero, show waiting-for-payment state

The implementation may use color plus text, but the semantic states above must remain explicit.

### Detail Panel

Clicking an employee row opens a detail panel showing:

- employee identity
- month
- invoice reference(s)
- total work done from existing data
- accrual invoice amount
- cash payment received
- salary paid
- pending amount
- adjustment breakdown
- notes

### Entry Form

For one selected invoice payment event, show an editable table/form:

- employee
- days worked
- monthly paid dollars
- base dollar inward
- onboarding advance
- offboarding deduction
- effective inward
- cashout USD/INR rate
- paid USD/INR rate
- cash in INR
- notes

Form behavior:

- preload values from existing invoice/payout context
- allow inline edits
- allow manual employee add
- allow save/update without altering existing payout rows

## SQL Query Shape

The employee monthly cash dashboard should favor SQL-side aggregation rather than frontend loops.

Recommended shape:

1. aggregate payment entries by employee/company/month
2. left join salary payments by employee/company/month
3. left join employee and company master data
4. compute net and status in SQL or in one small TypeScript projection step

Representative query target:

- group by `company_id`, `employee_id`, `payment_month`
- sum:
  - `cash_in_inr_cents`
  - `effective_dollar_inward_usd_cents`
  - `onboarding_advance_usd_cents`
  - `offboarding_deduction_usd_cents`
- carry or aggregate:
  - `days_worked`
  - `monthly_paid_usd_cents`
  - `cashout_usd_inr_rate`
  - `paid_usd_inr_rate`
- join salary row for same employee/month
- compute `net_inr_cents`

If performance becomes an issue, a SQL view can be added later, but v1 should start with explicit SQL joins in the store layer.

## API / Action Surface

The new feature needs its own isolated read/write layer:

- list cashed-out invoices available for cash entry
- create/open invoice payment event
- preload employee payment entry draft rows
- save invoice payment employee entry rows
- save employee salary payment rows
- fetch employee monthly cash dashboard data
- fetch employee-month detail panel data

These can be implemented as server actions if they match the existing project pattern. They do not need public route handlers unless a specific client-side interaction requires them.

## Error Handling

The new page should handle these cases gracefully:

- no cashed-out invoices available
- invoice selected but no existing employee rows available to preload
- employee manually added with zero inward
- duplicate salary row for employee/month
- payment event saved with partial employee edits
- missing latest Supabase tables in local or hosted environment

Errors should stay scoped to the new page and should not break any existing invoice or P&L route.

## Testing Strategy

### Data-layer tests

Add tests for:

- employee monthly cash aggregation
- negative net when salary exists and inward is zero
- onboarding advance increases inward
- offboarding deduction reduces inward
- partial payments across multiple months
- manual non-invoice employee rows
- pending amount calculation boundaries

### Action tests

Add tests for:

- prefill from selected cashed-out invoice
- save edited payment rows
- save salary rows
- reopening and editing existing payment events

### UI tests

Add tests for:

- new page loads without touching old dashboard
- selecting invoice preloads editable rows
- adding employee manually works
- negative status appears when expected
- waiting-for-payment state appears when salary is paid but inward is zero

## Architecture Boundaries

New code should live in a separate cash-flow slice, parallel to existing billing logic, for example:

- new page under `app/employee-cash-flow/`
- new store/query module(s) under `src/features/billing/` or a dedicated adjacent feature folder
- new types for cash-flow tables and dashboard rows
- new actions isolated from existing `updateEmployeePayoutAction` and P&L actions

The current employee payout and current dashboard code should be treated as reference implementations for operator experience and field naming, not as targets for mutation.

## Success Criteria

This feature is successful when:

- existing invoice generation, company P&L, employee tracking, and work logs continue working unchanged
- the app has a new standalone cash dashboard
- invoice cash receipts can be recorded in multiple parts across months
- salary cash-out is tracked separately by employee and month
- onboarding advance and offboarding deduction appear in the same cash-entry workflow
- all important payout-style fields are prefilled but editable
- an employee with salary paid and zero inward shows negative net immediately
- the dashboard can explain both accrual reality and cash reality for the same employee-month
