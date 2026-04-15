# Remove Employee Payout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the unused `Employee Payout` page, navigation entry, and page-specific backend code without affecting the rest of the billing workflows.

**Architecture:** Treat `Employee Payout` as a self-contained feature removal. Delete the route and nav entry, prune the dedicated payout page actions/store helpers, keep shared payout fields still used elsewhere, and verify that invoice, statement, and employee cash flow flows still compile and test cleanly.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Server Actions, Supabase store helpers, Vitest

---

## File Structure

- Delete: `app/employee-payout/page.tsx`
  - Removes the unused route.
- Modify: `app/_components/shell.tsx`
  - Removes the `Employee Payout` nav link.
- Modify: `src/features/billing/actions.ts`
  - Deletes page-only payout server actions and stale revalidation references.
- Modify: `src/features/billing/store.ts`
  - Deletes page-only payout queries/mutations/helpers and any now-unused imports/types.
- Delete: `src/features/billing/employee-payout.test.ts`
  - Removes tests for the deleted feature.
- Possibly delete: `src/features/billing/employee-payout.ts`
  - Remove only if nothing else imports it after cleanup.

## Task 1: Remove The Visible Feature Surface

**Files:**
- Delete: `app/employee-payout/page.tsx`
- Modify: `app/_components/shell.tsx`

- [ ] Delete the `Employee Payout` route file.
- [ ] Remove the `Employee Payout` link object from the shell navigation.
- [ ] Confirm there are no remaining app-level references to `/employee-payout`.

## Task 2: Remove Employee Payout Page Actions

**Files:**
- Modify: `src/features/billing/actions.ts`

- [ ] Delete `updateEmployeePayoutAction`.
- [ ] Delete `markEmployeePayoutPaidAction`.
- [ ] Delete `addEmployeePayoutRowAction`.
- [ ] Delete `removeEmployeePayoutRowAction`.
- [ ] Remove `revalidatePath("/employee-payout")` and any deleted imports tied only to those actions.
- [ ] Remove stale `/employee-payout` revalidation from shared flows such as invoice deletion and cashout.

## Task 3: Remove Employee Payout Store Helpers

**Files:**
- Modify: `src/features/billing/store.ts`
- Possibly delete: `src/features/billing/employee-payout.ts`

- [ ] Remove `DbEmployeePayout`, mapping helpers, insert/update schema fallback helpers, and feature-only query/mutation helpers if they are no longer used.
- [ ] Remove `assertEmployeePayoutRemovable` import if it becomes unused.
- [ ] Delete `src/features/billing/employee-payout.ts` if nothing imports it after cleanup.
- [ ] Keep shared payout math that still powers invoice, employee cash flow, and statements.

## Task 4: Remove Feature-Only Tests And Verify

**Files:**
- Delete: `src/features/billing/employee-payout.test.ts`

- [ ] Delete the employee payout-specific test file.
- [ ] Run:
  - `Get-ChildItem -Recurse app,src | Select-String -Pattern 'employee-payout|Employee Payout' -CaseSensitive:$false`
- [ ] Run:
  - `npx vitest run src/features/billing/actions.test.ts src/features/billing/employee-statements.test.ts src/features/billing/employee-statements-load.test.ts src/features/billing/employee-statements-pdf.test.ts src/features/billing/pdf.test.ts`
- [ ] Run:
  - `npm run lint`
- [ ] Run:
  - `npm run build`
- [ ] Commit:
  - `git add -A`
  - `git commit -m "refactor: remove employee payout feature"`
