# Adjustment Dropdown Reliability Redesign

Date: 2026-04-08

## Goal

Replace the current adjustment entry system with a single dropdown-driven workflow that is harder to misuse, prevents duplicate entries, supports removal, and produces correct category totals in both the invoice UI and generated PDF.

## Product Decision

The invoice draft page will use one adjustment form with one category dropdown. The available categories are fixed:

- Onboarding Advance
- Appraisal Advance
- Reimbursements / Expenses
- Offboarding Deductions

Each category can contain multiple entries per invoice, but the user only works with one category form at a time.

## UX Design

### Adjustment Form

The adjustment area will have one controlled form state with:

- `type`
- `name`
- `rateUsd`
- `hours`
- `label`
- `amountUsd`

The visible fields depend on the selected category.

#### Onboarding Advance

Show:

- `Name`
- `$/hour`
- `Hours`
- read-only `Total`

The total is auto-calculated from `$/hour × Hours`.

#### Appraisal Advance

Show:

- `Name`
- `$/hour`
- `Hours`
- read-only `Total`

The total is auto-calculated from `$/hour × Hours`.

#### Offboarding Deductions

Show:

- `Name`
- `$/hour`
- `Hours`
- read-only `Total`

The total is auto-calculated from `$/hour × Hours`, but is stored as a deduction.

#### Reimbursements / Expenses

Show:

- `Label`
- `Amount`

No person-based calculation is shown here.

### Form Behavior

- The form is controlled by client state.
- The user selects one category from the dropdown.
- Only the relevant fields for that category are rendered.
- All inputs use clear placeholders matched to the selected category.
- Clicking `Add Adjustment`:
  - validates inputs
  - blocks duplicates
  - locks the button immediately
  - shows `Adding...`
  - submits once
- After successful add:
  - the form resets to empty state
  - the selected type resets to blank
  - the user can pick another category for the next adjustment

### Adjustment List

Saved adjustments remain visible on the draft page and are grouped by category:

- Onboarding Advance
- Appraisal Advance
- Reimbursements / Expenses
- Offboarding Deductions

Each item shows:

- type label
- amount
- description:
  - `name · $/hour · hours` for person-based adjustments
  - `label` for reimbursements
- `Remove` action

If a category has no entries, it may be hidden or shown empty, but saved entries must be clearly separated by category.

## Duplicate Protection

Duplicate prevention is required in three layers.

### UI Lock

- Add button disables immediately during submit
- Create Invoice button disables immediately during submit
- double clicks are ignored while pending

### State Validation

Before submit, the client checks for an existing adjustment entry with the same normalized:

- `type`
- `amount`
- `description`

If a duplicate exists:

- do not submit
- show inline error message: `Duplicate adjustment already added`

### Server Validation

The server should continue enforcing exact adjustment payload rules so stale clients or repeated requests cannot silently corrupt invoice totals.

## Removal Behavior

Each saved adjustment entry must be removable from the invoice draft page.

Removing an adjustment:

- deletes only that invoice adjustment row
- updates invoice totals immediately after reload
- does not affect employees, teams, or other invoice data

## Validation Rules

### Person-Based Adjustments

- `type` is required
- `name` is required
- `$/hour` is required and numeric
- `hours` is required and numeric
- `total` is derived and read-only

### Reimbursements / Expenses

- `type` is required
- `label` is required
- `amount` is required and numeric

### Invalid Submission UX

- empty or invalid inputs show inline error feedback
- duplicate entries show inline error feedback
- no invisible failures

## PDF Behavior

The PDF must stop mixing adjustment categories together.

### Separate PDF Categories

Render separate sections or totals for:

- Onboarding Advance
- Appraisal Advance
- Reimbursements / Expenses
- Offboarding Deductions

### Formula

Final total calculation in the PDF must be represented as:

`Team Total + Onboarding Advance + Appraisal Advance + Reimbursements / Expenses - Offboarding Deductions`

### Mapping Rules

- onboarding rows include only onboarding entries
- appraisal rows include only appraisal entries
- reimbursement rows include only reimbursement entries
- offboarding rows include only offboarding entries
- no category may reuse another category’s rows

## Data Model

The existing `invoice_adjustments` structure remains usable, with these interpretations:

- person-based adjustments use:
  - `employee_name`
  - `rate_usd_cents`
  - `hours`
  - `amount_usd_cents`
- reimbursements use:
  - `label`
  - `amount_usd_cents`

No new table is required.

## Implementation Shape

### UI

Replace the current adjustment cards with one client adjustment manager component that owns:

- dropdown selection
- controlled form state
- duplicate detection against existing adjustments
- pending lock state
- grouped adjustment rendering
- remove actions

### Create Invoice

Add a pending button state to the create-invoice flow so duplicate invoice drafts cannot be created by repeated clicks.

### Store / Actions

Add adjustment deletion support and keep server-side calculation as the source of truth for person-based totals and deduction normalization.

### PDF

Refactor PDF adjustment grouping helpers so each category is generated independently and total labels remain correct.

## Testing

Add or update tests for:

- duplicate adjustment detection
- dropdown form reset behavior
- removal action
- offboarding negative normalization
- grouped adjustment totals for PDF
- create invoice button pending state if covered by browser testing

Add browser verification that covers:

- selecting an adjustment type
- entering values
- seeing calculated total
- adding the adjustment once
- blocking duplicate add
- removing an adjustment

## Out of Scope

- editing an existing saved adjustment in place
- changing employee/team data model
- redesigning the whole invoice page outside the adjustment area and create button pending state
