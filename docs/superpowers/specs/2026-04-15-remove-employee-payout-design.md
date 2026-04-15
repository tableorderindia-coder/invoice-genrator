# Remove Employee Payout Design

**Date:** 2026-04-15

## Goal

Remove the unused `Employee Payout` feature completely while leaving the rest of the billing app unchanged.

## Approved Scope

Delete the standalone feature surface:

- `/employee-payout` route
- `Employee Payout` navigation entry
- dedicated server actions used only by that page
- dedicated store helpers used only by that page
- tests that exist only for that feature

Keep shared payout values and calculations that are still used elsewhere:

- employee `payoutMonthlyUsdCents`
- invoice line-item payout snapshots
- employee cash flow logic
- employee statements logic
- invoice and dashboard calculations that still depend on payout amounts

## Current State

The app still exposes an `Employee Payout` page:

- `app/employee-payout/page.tsx`

That page has a dedicated backend path:

- `updateEmployeePayoutAction`
- `markEmployeePayoutPaidAction`
- `addEmployeePayoutRowAction`
- `removeEmployeePayoutRowAction`
- `getEmployeePayoutInvoice`
- `updateEmployeePayout`
- `addEmployeePayoutRow`
- `markEmployeePayoutPaid`
- `removeEmployeePayoutRow`
- `ensureEmployeePayoutRows`

The feature is no longer in use, but the employee monthly payout field is still active across the rest of the app.

## Design

### 1. Remove The UI Surface

Delete the route file:

- `app/employee-payout/page.tsx`

Remove the shell link:

- `app/_components/shell.tsx`

After the change, the feature must no longer be visible or reachable from app navigation.

### 2. Remove Feature-Specific Backend Code

Delete only the backend functions that serve the removed page and no other active workflow:

- employee payout page server actions in `src/features/billing/actions.ts`
- employee payout page store/query/mutation helpers in `src/features/billing/store.ts`
- payout row removal helper module if it becomes unused

Do not remove `payoutMonthlyUsdCents` fields or shared payout calculations still used by invoice generation, employee cash flow, or statements.

### 3. Remove Payout-Only Revalidation

Any `revalidatePath("/employee-payout")` calls should be removed.

Invoice deletion and cashout flows should continue to revalidate the pages that still exist, but they should stop referencing the deleted page.

### 4. Route Behavior

No redirect should be added.

Because the page is being removed completely, the route should naturally stop existing and return the normal framework missing-page behavior.

### 5. Tests And Verification

Remove tests that only cover the deleted feature.

Run verification focused on:

- billing action tests
- invoice PDF tests
- employee statement tests
- employee cash flow tests if touched
- production build

## Risks And Guardrails

- Do not remove employee payout values from employee records. Those are still used as the configured monthly paid amount in active workflows.
- Do not remove domain functions still referenced by invoice or dashboard code.
- Keep the change small and focused on the unused feature boundary.
