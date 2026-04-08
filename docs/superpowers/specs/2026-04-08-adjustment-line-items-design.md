# Adjustment Line Items Redesign

Date: 2026-04-08

## Goal

Replace the current generic invoice adjustment form with purpose-built adjustment entry blocks that match the monthly billing workflow:

- Onboarding advance
- Offboarding deduction
- Reimbursements
- Appraisal advance

The new UI should make each adjustment type obvious, reduce manual math, and keep invoice totals accurate.

## Product Decision

The invoice draft page will no longer use one shared adjustment form with a type dropdown. Instead, it will render four dedicated adjustment cards.

Three of the cards will use the same person-based calculation pattern:

- `Onboarding advance`
- `Offboarding deduction`
- `Appraisal advance`

Each of those cards will collect:

- `Name`
- `$/hr`
- `No. of hrs`
- `Total` shown as read-only and auto-calculated from `$/hr × No. of hrs`

The fourth card, `Reimbursements`, will collect:

- `Type / label`
- `Amount`

## UX Design

### Adjustment Entry Blocks

The draft invoice page adjustment area will be split into four visible blocks, each with its own form and submit action.

#### Onboarding Advance

- Inputs:
  - `Name`
  - `$/hr`
  - `No. of hrs`
- Derived field:
  - `Total`
- Behavior:
  - total updates as the user types
  - value is shown read-only
  - saved as a positive adjustment

#### Offboarding Deduction

- Inputs:
  - `Name`
  - `$/hr`
  - `No. of hrs`
- Derived field:
  - `Total`
- Behavior:
  - total updates as the user types
  - value is shown read-only
  - saved as a negative adjustment

#### Appraisal Advance

- Inputs:
  - `Name`
  - `$/hr`
  - `No. of hrs`
- Derived field:
  - `Total`
- Behavior:
  - total updates as the user types
  - value is shown read-only
  - saved as a positive adjustment

#### Reimbursements

- Inputs:
  - `Type / label`
  - `Amount`
- Behavior:
  - amount is entered directly by the client
  - saved as a positive adjustment

### Adjustment Listing

Saved adjustments on the invoice draft page will remain visible below the forms, but the display will become type-specific:

- person-based adjustments show `name`, `$/hr`, `hours`, and `total`
- reimbursement adjustments show `label` and `amount`
- offboarding entries are visually labeled as deductions

The list should continue to reflect invoice snapshot data only.

## Data Model Changes

The `invoice_adjustments` shape will be extended to support structured person-based adjustments.

### New Supported Adjustment Types

- `onboarding`
- `offboarding`
- `reimbursement`
- `appraisal`

### Required Stored Fields

For all adjustments:

- `id`
- `invoice_id`
- `type`
- `amount_usd_cents`
- `sort_order`

For person-based adjustments:

- `employee_name`
- `rate_usd_cents`
- `hours`

For reimbursements:

- `label`

### Schema Change

The Supabase `invoice_adjustments` table will need additional nullable columns:

- `rate_usd_cents`
- `hours`

The existing `employee_name` and `label` columns remain in use.

No historical invoice recalculation behavior changes. Old rows without the new fields remain valid.

## Server Behavior

The generic adjustment create action will be replaced by structured handling:

- person-based adjustment submissions calculate total on the server from `rate_usd_cents × hours`
- offboarding deductions are normalized to negative totals on the server
- onboarding and appraisal stay positive
- reimbursements use the submitted amount directly

Server-side calculation remains the final source of truth even if the browser previews totals live.

## Validation Rules

### Person-Based Adjustments

- `name` is required
- `$/hr` must be greater than or equal to 0
- `No. of hrs` must be greater than or equal to 0
- total is derived and not accepted as user input

### Reimbursements

- `type / label` is required
- `amount` must be greater than or equal to 0

### Error Handling

- invalid inputs return the user to the draft page with an inline error banner
- successful submissions return the user to the draft page with an inline success banner

## Implementation Shape

### UI

Update the draft invoice page to:

- remove the old adjustment type dropdown form
- add four dedicated adjustment cards
- show live calculated totals for person-based cards
- keep the existing inline flash banner pattern

### Types and Store

Update billing types and store helpers to:

- add the `appraisal` adjustment type
- store `rateUsdCents` and `hours` on person-based adjustments
- keep reimbursement handling simple

### Actions

Update invoice adjustment server actions to:

- accept the new structured form payloads
- calculate totals server-side
- reuse existing draft-page redirect and flash feedback behavior

## Testing

Add or update tests to cover:

- person-based total calculation
- offboarding normalization to negative amount
- reimbursement creation
- appraisal creation
- draft page rendering of the new adjustment sections

If feasible, add one browser test that confirms:

- a person-based adjustment can be added
- total is shown
- success feedback appears inline

## Out of Scope

- editing existing adjustments in place
- deleting adjustments if that control does not already exist
- exporting the new extra adjustment detail into a redesigned PDF layout beyond the current invoice rendering behavior
- changing invoice profit or cashout workflows
