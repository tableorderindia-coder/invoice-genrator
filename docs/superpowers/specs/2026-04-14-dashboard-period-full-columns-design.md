# Dashboard Monthly/Yearly Full Columns (Fiscal Year)

## Summary
The Monthly/Yearly dashboard view should display the full cash‑flow column set (same as Employee tab), and aggregate values across the company. Yearly rows must follow fiscal years (Apr–Mar) and be labeled as `Apr YYYY–Mar YYYY+1`. Net profit logic stays unchanged.

## Goals
- Show the full column list in Monthly and Yearly views.
- Yearly rows aggregate by fiscal year (Apr–Mar).
- Net Profit calculation remains the same as current logic.
- Employee tab remains unchanged.

## Non‑Goals
- No changes to Employee tab columns or behavior.
- No change to saved cash‑flow row storage.
- No changes to invoice creation, cashout, or adjustment logic.

## Column Set (Monthly + Yearly)
- Month (or fiscal year label)
- Dollar inward
- Onboarding advance
- Reimbursements / Expenses
- Reimbursement labels
- Reimbursements / Expenses (INR)
- Appraisal advance
- Appraisal advance (INR)
- Offboarding deduction
- Effective dollar inward
- Cashout rate
- Cash in (INR)
- Monthly $
- Paid rate
- Monthly paid INR
- Actual paid (INR)
- PF (INR)
- TDS (INR)
- Salary paid (Actual − PF − TDS)
- FX commission (INR)
- Total commission (USD)
- Commission earned (INR)
- Gross earnings (INR)
- Expenses (INR) with Save
- Net Profit (unchanged logic)

## Data Rules
- Monthly rows aggregate all employee cash‑flow rows for the calendar month.
- Yearly rows aggregate all employee cash‑flow rows for the fiscal year (Apr–Mar).
- Reimbursement labels are concatenated uniquely (comma‑separated).
- Effective dollar inward uses the same formula as employee cash‑flow.
- Monthly paid INR = Monthly $ × Paid rate.
- Salary paid = Actual paid − PF − TDS.
- Net Profit remains the same formula as current dashboard logic.

## Fiscal Year Label
For a row that aggregates Apr 2025–Mar 2026, label:
`Apr 2025–Mar 2026`.

## Implementation Plan (High Level)
1. Expand the Period row model to include the new columns.
2. Aggregate period rows from cash‑flow entries, not from employee view.
3. Implement fiscal‑year grouping for Yearly rows.
4. Update Monthly/Yearly table UI to render the full column set.
5. Add tests for fiscal‑year grouping and column aggregation.

## Test Plan
- Unit tests for period aggregation, including fiscal year bucketing.
- Existing dashboard tests must pass.
