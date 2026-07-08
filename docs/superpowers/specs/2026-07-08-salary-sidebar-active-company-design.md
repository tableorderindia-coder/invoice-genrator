# Salary, Sidebar, and Active Company Design

Date: 2026-07-08
Branch: codex/salary-sidebar-active-company
Worktree: D:\Eassyonboard invoice genrator and company dashboard\tableorder-invoice generator\.worktrees\salary-sidebar-active-company

## Context

The current EassyOnboard billing portal uses a large horizontal navigation bar in `app/_components/shell.tsx`. Company-scoped pages each manage their own company selectors and Load buttons. Employee Cash Flow currently loads company/month/invoice state, builds editable rows from invoice line items and employee master defaults, and allows salary/PF/TDS editing directly in the cash-flow form.

The current authorization model has `admin` and `user` roles plus page-level `permissions`. There is no hardcoded CA role and no company-level user assignment. The checked-in schema has employee master payroll defaults on `employees` and a thin `employee_salary_payments` table, but it does not yet support full monthly payroll review, verification, admin override notes, or audit history.

Baseline on the latest `origin/main` worktree passed:

- `npm test` with 182 tests passing
- `npx tsc --noEmit`
- `npm run lint`

Live Supabase verification was not completed because the active tableorder worktree has no `.env.local`, local Docker was unavailable for `supabase status`, and the older parent-folder env failed at the fetch layer. The design below is based on the checked-in app code and Supabase schema/migrations.

## Goals

- Replace the wrapping top nav with a fixed, collapsible, role-aware sidebar.
- Add a global Active Company selector that persists across company-scoped pages.
- Add real company-level access control configurable from Admin Users.
- Make Salary the monthly payroll review source of truth.
- Refactor Employee Cash Flow so it pre-fills payroll values from Salary while still allowing audited admin overrides.
- Preserve existing billing, invoice, dashboard, employee cash-flow, employee statement, and finance calculations.

## Non-Goals

- Do not build a disconnected demo.
- Do not add a hardcoded CA database role unless the existing model proves insufficient.
- Do not silently overwrite employee master salary defaults from monthly edits.
- Do not turn this first pass into a full payroll ERP with payslip, payment batch, bank export, and accounting close workflows.

## Access Model

Keep `profiles.role` as `admin | user`.

CA or payroll reviewer access is represented as a permission setup:

- Salary page view/edit
- selected company access
- Employees view if needed
- Employee Cash Flow view/edit if needed
- no Founder Balance unless explicitly granted
- no Admin unless the profile is an admin

Add a company access table, for example `user_company_access`:

- `user_id`
- `company_id`
- timestamps
- unique index on `user_id, company_id`

Admin users can access all companies. Normal users can access only assigned companies. The existing Admin Users page gains a Company access section with searchable/checklist assignment per user.

Every company-scoped read and mutation must enforce both page permission and company access. RLS policies for company-scoped tables must be updated so a user cannot read or mutate another company by guessing a company ID.

## Application Shell

Replace the top navigation in `app/_components/shell.tsx` with a page shell that includes:

- fixed desktop sidebar
- expanded width near 260px
- collapsed width near 72px
- smooth width transition
- local-storage collapse persistence
- icon and label when expanded
- icon-only plus tooltip when collapsed
- active route highlight
- bottom account area with Sign out
- mobile drawer/sheet navigation
- content layout that is never covered by the sidebar

Navigation groups:

- Main: Overview
- People & Companies: Companies, Employees
- Finance: Create Invoice, Invoices, Cashout, Employee Cash Flow, Employee Statements, Salary, Expenses
- Analytics: Dashboard, Founder Balance
- System: Admin

Sidebar items render only when the authenticated user can view the corresponding page. Salary must be added to the page permission registry and admin management UI.

## Active Company

Add a reusable Active Company provider and selector in the shell top-right. It should:

- load companies from the existing company source of truth, filtered by company access
- use company ID internally and company name visually
- support search
- clearly show the selected company
- persist the selected company across route navigation
- sync to URL state for company-scoped pages where appropriate
- automatically refresh server-rendered pages on selection change
- show pending or empty states so stale previous-company data is not left visible

Pages should stop maintaining separate incompatible company state. Initial migrated pages:

- Salary
- Employee Cash Flow
- Employees
- Employee Statements
- Expenses
- Invoices where company-scoped

## Payroll Ownership

Payroll has three layers.

### Employee Master Defaults

The permanent employee defaults remain on `employees`:

- actual/master salary
- PF
- TDS
- peg rate
- active status
- company

These defaults are not changed by ordinary monthly payroll edits.

### Monthly Payroll

Salary owns the monthly payroll record for `company_id + employee_id + payroll_month`.

Extend the existing `employee_salary_payments` concept into the monthly payroll record, preserving its current employee/month uniqueness and migrating it forward with additional columns. If live schema inspection shows the deployed table shape differs from `supabase/schema.sql`, the migration must adapt without dropping existing payment history.

Monthly payroll needs to store:

- employee and company IDs
- payroll month
- source/master salary snapshot
- monthly actual salary or gross/payable amount
- PF
- TDS
- bonus
- reimbursement
- other deduction
- adjustment amount
- adjustment reason
- notes
- net payable
- row status
- verified by and verified at
- admin override note and metadata where applicable
- created/updated timestamps

Row statuses:

- Draft
- Changed
- Verified
- Needs Review
- Admin Override
- Locked

Month-level status can be represented by a separate company-month table:

- Draft
- In Review
- Verified
- Approved or Paid can be reserved for a later workflow

Save Month can persist partial progress. The month remains Draft or In Review until every employee row is verified.

### Cash Flow Invoice Entries

Employee Cash Flow links monthly payroll records to invoice/payment/cashout rows. It pre-fills salary/PF/TDS/net payable from Salary for the selected company and month.

Admin can still edit payroll values in Cash Flow for discrepancies. Those changes update the monthly payroll record as final admin override, require a note, and write audit history.

## Salary Page

Route: `/salary`

Sidebar group: Finance

Purpose: CA/payroll reviewer selects active company and payroll month, reviews employees, edits values, verifies rows, then clicks Save Month.

Top:

- title: Salary
- subtitle: Review and verify monthly employee payroll
- Active Company selector in shell top-right
- Payroll Month control as page-specific state

Summary cards:

- Employee Count
- Gross / Actual Salary
- PF Total
- TDS Total
- Net Payable
- Changed Rows
- Needs Review

Table:

- Employee
- Master Salary / Actual Salary
- PF
- TDS
- Adjustments
- Net Payable
- Status
- Action

Filters:

- employee search
- status
- changed only
- verified/unverified

Edit drawer:

- employee name
- company
- payroll month
- master/default reference values
- monthly actual salary
- PF
- TDS
- bonus
- reimbursement
- other deduction
- adjustment reason
- notes
- calculated net payable
- "Changed from INR X" deltas

Actions:

- Cancel
- Save this month only
- Update employee master too
- Mark verified or Save & Verify when allowed

Save this month only updates only the selected monthly payroll record. It is for leave deduction, bonus, one-time correction, reimbursement, temporary PF/TDS changes, and similar month-specific adjustments.

Update employee master too updates the monthly payroll record and the employee master defaults. It is for salary increments, permanent PF/TDS/default salary corrections, and long-term peg-rate changes. It must be a secondary explicit action with confirmation and a required reason.

## Employee Cash Flow Refactor

Employee Cash Flow should no longer be the primary place where payroll is created from employee defaults.

New flow:

1. Active Company comes from the global selector.
2. Admin selects payroll month.
3. Admin selects invoice or invoices.
4. The page loads monthly payroll rows from Salary for the company/month.
5. It links those payroll rows to invoice/payment/cashout data.
6. Salary/PF/TDS/net payable are prefilled from monthly payroll.
7. Admin can override payroll values if there is a discrepancy.
8. Admin override updates monthly payroll as final and requires a note.
9. Existing invoice/payment/cashout calculations remain intact.

Remove:

- local Company selector
- ordinary Load button dependency
- duplicate salary source-of-truth behavior

Keep or refactor:

- Compose tab
- Saved Rows tab
- invoice selection/filter
- add employee behavior for invoice/cash-flow edge cases
- payment status/date/notes
- invoice association
- current cash-in/commission/net P&L calculations
- editable cash-flow rows, with salary overrides audited back to payroll

## Audit History

Add or reuse an audit/history mechanism for payroll changes. If no suitable audit table exists, add a dedicated payroll audit table.

Record at minimum:

- payroll record ID
- company ID
- employee ID
- payroll month
- field changed
- old value
- new value
- reason or note
- change source: CA edit, admin override, employee master update
- changed by
- changed at

Audit rows should be append-only for normal users. Admin visibility should be available from Salary row drawer and possibly Cash Flow row detail.

## Server Actions And RLS

Add company-aware authorization helpers, for example:

- requireCompanyPageAccess(page, companyId)
- requireCompanyPageEditAccess(page, companyId)

Use these in company-scoped loaders and mutations.

Salary mutations require Salary edit permission and company access. The explicit "Update employee master too" Salary action also uses Salary edit permission and company access, because salary increments are part of the approved Salary workflow; it must require confirmation, a reason, and audit history. Cash Flow payroll overrides require Employee Cash Flow edit permission and company access.

RLS must cover:

- companies
- employees
- invoices
- invoice payment tables
- employee salary/monthly payroll tables
- company expenses
- founder withdrawals as currently protected by dashboard permissions
- payroll audit/history tables

Admin bypasses company restrictions. Normal users are restricted to assigned companies.

## Testing

Add focused tests for:

- company access authorization helpers
- Admin Users company assignment UI/data handling
- page permission registry with Salary
- global company selector persistence and URL sync
- sidebar visibility and active route behavior
- Salary loading from employee defaults
- Save Month creates/updates monthly payroll rows
- month-only edit does not change employee master
- update employee master action changes employee defaults and monthly payroll
- payroll audit rows for CA edit, master update, and admin override
- Employee Cash Flow prefill from Salary monthly payroll
- admin Cash Flow override updates payroll with note/audit
- unauthorized company access blocked
- existing cash-flow calculations preserved

Full verification stack before implementation completion:

- `npm test`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

## Implementation Notes

- Read the relevant Next.js 16 docs under `node_modules/next/dist/docs/` before touching app-router or proxy behavior.
- Keep UI consistent with the existing dark EassyOnboard visual language while improving density and hierarchy.
- Prefer lucide icons for sidebar controls.
- Avoid broad unrelated refactors.
- Before live schema migration, verify the active Supabase project and current tables. The local worktree does not currently have confirmed active Supabase env.
