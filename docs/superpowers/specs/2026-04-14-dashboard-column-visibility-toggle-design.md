# Dashboard Column Visibility Toggle

## Summary
Add a single eye-toggle that collapses and expands the column block between “Dollar Inward” and “Effective Dollar Inward” across the Employee table and the Monthly/Yearly summary tables. All other columns remain exactly as they are today. Default state is collapsed. The toggle persists in local storage.

## Goals
- Default view shows only “Dollar Inward” and “Effective Dollar Inward” for the adjustable block.
- Expanded view shows the full intermediate column set:
  - Onboarding Advance
  - Reimbursements / Expenses
  - Reimbursement Labels
  - Reimbursements (INR)
  - Appraisal Advance
  - Appraisal Advance (INR)
  - Offboarding Deduction
- Apply the same toggle behavior to:
  - Employee dashboard table
  - Monthly summary table
  - Yearly summary table
- Preserve existing UI, backend, and data structures.
- Maintain column alignment (no missing cells or shifting).

## Non-Goals
- No backend changes.
- No new tables or data fields.
- No changes to calculations or existing column ordering outside the toggle block.

## UX Behavior
- A single toggle button (eye icon) placed near table header controls all three tables.
- Default: collapsed.
- Expanded: all intermediate columns visible.
- Toggle state persisted to `localStorage` so refresh preserves preference.

## Column Model
Define a column group model for each table that isolates the toggle region:

```
leftFixed = [Dollar Inward]
middleExpandable = [Onboarding Advance, Reimbursements / Expenses, Reimbursement Labels,
                    Reimbursements (INR), Appraisal Advance, Appraisal Advance (INR),
                    Offboarding Deduction]
rightFixed = [Effective Dollar Inward]
visibleColumns = leftFixed + (showDetails ? middleExpandable : []) + rightFixed
```

All other columns in the table remain in their current positions, rendered as-is.

## Implementation Notes
- Create a small shared helper or hook in the dashboard page to build `visibleColumns`.
- Render headers and cells by mapping `visibleColumns` to avoid manual `<td>` conditionals.
- Keep existing `overflow-x-auto` wrappers and apply `min-w-max` if needed to ensure alignment.
- Toggle should not alter any action column or computed values.

## Error Handling / Edge Cases
- If localStorage is unavailable, default to collapsed state.
- Empty data sets should still render header rows with correct column alignment.

## Testing
- Visual verification:
  - Toggle on/off in Employee table; columns appear/disappear correctly.
  - Toggle on/off in Monthly and Yearly tables; columns appear/disappear correctly.
  - Alignment maintained; no shifting or misaligned rows.
- No backend or data changes required, so unit tests are optional unless existing tests cover table output.
