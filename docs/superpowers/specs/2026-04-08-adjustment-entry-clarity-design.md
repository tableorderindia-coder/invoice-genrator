# Adjustment Entry Clarity Redesign

Date: 2026-04-08

## Goal

Make the adjustment entry UI obvious and readable by replacing the unclear compact inputs with structured, labeled form fields while preserving the existing card styling, colors, and gradient action button.

## Product Decision

The adjustment section will keep one selected adjustment type at a time, but the entry form will use a strict field structure with visible labels and descriptive placeholders.

The four supported adjustment types remain:

- Onboarding Advance
- Offboarding Deduction
- Appraisal Advance
- Reimbursements / Expenses

## Strict Field Structure

### Onboarding Advance

Fields:

- `Name`
  - placeholder: `Enter employee name`
- `Rate ($/hr)`
  - placeholder: `Enter hourly rate`
- `Hours`
  - placeholder: `Enter number of hours`
- `Total`
  - auto-calculated as `rate × hours`
  - read-only

### Offboarding Deduction

Fields:

- `Name`
- `Rate ($/hr)`
- `Hours`
- `Total`

Total remains auto-calculated from `rate × hours`.

### Appraisal Advance

Fields:

- `Name`
- `Rate ($/hr)`
- `Hours`
- `Total`

Total remains auto-calculated from `rate × hours`.

### Reimbursements / Expenses

Fields:

- `Type / Label`
  - placeholder: `Enter expense type (e.g., travel, food)`
- `Amount`
  - placeholder: `Enter amount`

No rate or hours are shown for this category.

## Dynamic Rendering

When the selected type changes:

- hour-based categories render:
  - `Name`
  - `Rate ($/hr)`
  - `Hours`
  - `Total`
- reimbursement renders:
  - `Type / Label`
  - `Amount`

Only the relevant fields for the selected category are visible.

## Layout Design

### Selector

The adjustment type selector stays at the top of the card.

### Form Card

The selected adjustment renders inside one larger structured card below the selector.

The card keeps:

- current color palette
- existing gradient action button
- overall glass/card visual language

The card changes:

- no compact unlabeled input cluster
- no visually ambiguous circular input rhythm
- fields are stacked with explicit labels
- inputs are larger and easier to read

### Hour-Based Layout

Desktop layout:

- row 1: `Name`
- row 2: `Rate ($/hr)`, `Hours`, `Total`

Mobile layout:

- all fields stack vertically

### Reimbursement Layout

Desktop layout:

- row 1: `Type / Label`
- row 2: `Amount`

Mobile layout:

- fields stack vertically

## UX Rules

- labels are always visible above fields
- placeholders act as examples, not the only instruction
- total remains read-only
- the add button stays visually prominent
- the adjustment form should feel larger and easier to scan than the current version

## Existing Logic That Stays

This redesign does not change:

- duplicate prevention
- add pending state
- removal behavior
- grouped saved adjustments
- PDF category separation
- server-side total calculation and validation

## Testing

Browser verification should confirm:

- visible labels are shown for the selected adjustment type
- expected placeholders appear
- total is shown read-only for hour-based categories
- reimbursement hides rate and hours
- add flow still works end to end

## Out of Scope

- changing the adjustment data model
- replacing the selector with tabs
- redesigning the entire invoice page
