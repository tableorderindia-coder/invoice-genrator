# Adjustment Field Visibility Redesign

Date: 2026-04-08

## Goal

Improve readability of the hour-based adjustment entry fields so users can clearly see what they are typing for `Rate`, `Hours`, and `Total`.

## Product Decision

The current hour-based adjustment row is still visually too compact. Replace it with a stacked full-width field layout.

This applies to:

- Onboarding Advance
- Offboarding Deduction
- Appraisal Advance

## Layout Change

For hour-based adjustment types, the form card will render fields in this order:

1. `Name`
2. `Rate ($/hr)`
3. `Hours`
4. `Total`

Each field gets its own full-width row.

## Input Styling

The hour-based fields should:

- use rectangular inputs instead of compact pill-like inputs
- be taller than the current inputs
- have more vertical spacing between fields
- make typed values easy to read

The `Total` field remains:

- read-only
- auto-calculated from `rate × hours`

## What Stays the Same

- labels remain visible above inputs
- placeholders remain descriptive
- reimbursement layout stays unchanged unless needed for visual consistency
- duplicate prevention stays unchanged
- add/remove logic stays unchanged
- grouped adjustment list stays unchanged
- PDF logic stays unchanged

## Testing

Browser verification should confirm:

- `Rate ($/hr)`, `Hours`, and `Total` are shown as separate stacked fields
- hour-based values can be entered clearly
- total still updates correctly
- adjustment add flow still works

## Out of Scope

- redesigning the reimbursement fields
- changing adjustment logic
- changing saved adjustment list layout
