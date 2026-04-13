# Dashboard Employee Rows Merge by Month

## Summary
The dashboard Employee tab should show one row per employee per month. If an employee has multiple saved cash flow entries in the same month, the dashboard must merge them by summing numeric values. Raw entries remain unchanged in storage.

## Goals
- Display one row per employee per month in the dashboard Employee tab.
- Sum values across multiple saved entries for the same employee + month.
- Preserve existing cash flow rows in `invoice_payment_employee_entries`.
- Keep net profit logic unchanged (still based on `actualPaidInrCents`).

## Non-Goals
- Do not change the saved rows view behavior.
- Do not collapse or delete cash flow rows in Supabase.
- Do not change monthly/yearly dashboard aggregation rules.

## Current Behavior
The dashboard Employee tab reads cash flow entries as editable rows without merging. Multiple entries in the same month show as separate rows.

## Desired Behavior
For the Employee dashboard only:
- Group rows by `employeeId + paymentMonth`.
- Sum all numeric fields across rows in the group.
- Merge reimbursement labels into a unique, comma-separated list.
- Keep rate fields (`cashoutUsdInrRate`, `paidUsdInrRate`) from the latest entry in that month.

## Data Rules
Summed fields:
- daysWorked
- baseDollarInwardUsdCents
- onboardingAdvanceUsdCents
- reimbursementUsdCents
- appraisalAdvanceUsdCents
- offboardingDeductionUsdCents
- effectiveDollarInwardUsdCents
- cashInInrCents
- monthlyPaidUsdCents (sum)
- actualPaidInrCents (sum)
- pfInrCents (sum)
- tdsInrCents (sum)
- fxCommissionInrCents (sum)
- totalCommissionUsdCents (sum)
- commissionEarnedInrCents (sum)
- grossEarningsInrCents (sum)

Merged labels:
- reimbursementLabelsText: union of labels across entries, joined with ", ".

Single-value fields:
- cashoutUsdInrRate: take the latest row in the group
- paidUsdInrRate: take the latest row in the group
- daysInMonth: take from the latest row in the group
- invoiceNumber: join unique invoice numbers across entries (existing behavior)

## Implementation Plan (High Level)
1. Add a grouping reducer in the dashboard employee row builder (`pn-dashboard.ts`).
2. Use the grouped rows for `employeeEditableSections`.
3. Keep raw rows for other views unchanged.
4. Add a regression test for multi-entry merge behavior.

## Test Plan
- Unit test: multiple entries for same employee + month aggregate correctly.
- Existing dashboard tests should still pass.

## Risks
- Over-summing if a field should be treated as a max or latest. Only sum fields that represent additive values.
- If rates differ across entries, selecting the latest entry is a tradeoff. This is acceptable for display, since raw rows remain available.
