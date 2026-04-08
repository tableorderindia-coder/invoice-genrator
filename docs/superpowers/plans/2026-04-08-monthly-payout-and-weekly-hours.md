# Monthly Payout And Weekly Hours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hourly payout and raw hours logic with monthly payout defaults and weekly-hours monthlyized totals across employees, invoices, adjustments, PDF, and tests.

**Architecture:** Update the schema and types first, then switch the core billing formula in the domain layer, then update the employee and invoice UIs to use `Payout $/month` and `Hrs per week`. Finish with PDF alignment and an E2E flow that proves the new monthlyized total math works end to end.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Supabase, Vitest, Playwright

---

### Task 1: Add schema update SQL and data reset SQL

**Files:**
- Create: `D:\Eassyonboard invoice genrator and company dashboard\supabase\migrations\2026-04-08-monthly-payout-weekly-hours.sql`
- Create: `D:\Eassyonboard invoice genrator and company dashboard\supabase\reset-data-keep-tables.sql`

- [ ] Write the schema update SQL for monthly payout and weekly hours columns.
- [ ] Write the delete-all-data SQL in dependency-safe order while preserving tables.
- [ ] Review both files for dependency order and column consistency.

### Task 2: Update billing types and domain math

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\types.ts`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\domain.ts`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\domain.test.ts`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\adjustments.ts`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\adjustments.test.ts`

- [ ] Write failing tests for monthlyized weekly-hours total calculation.
- [ ] Run the focused tests and verify they fail.
- [ ] Replace the old `rate × hours` logic with `(rate × hrs/week × 52) / 12`.
- [ ] Re-run the focused tests and verify they pass.

### Task 3: Update persistence layer and snapshots

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\store.ts`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\actions.ts`

- [ ] Switch employee creation to monthly payout and weekly hours fields.
- [ ] Switch invoice line items and adjustments to store `hrs_per_week`.
- [ ] Update snapshots to store monthly payout fields where needed.
- [ ] Re-run unit tests.

### Task 4: Update employee UI

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\app\employees\page.tsx`

- [ ] Change `Payout $/hr` to `Payout $/month`.
- [ ] Add `Hrs per week` field to the employee form.
- [ ] Update employee cards to show monthly payout and weekly hours.

### Task 5: Update invoice draft team rows and adjustments UI

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\app\invoices\drafts\[id]\page.tsx`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\app\invoices\drafts\[id]\adjustment-forms.tsx`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\tests\e2e\invoice-feedback.spec.ts`

- [ ] Update line-item editing labels from `Hours` to `Hrs per week`.
- [ ] Update line-item totals to use the monthlyized formula.
- [ ] Update hour-based adjustments from `Hours` to `Hrs per week`.
- [ ] Update the browser test to assert weekly-hours labels and total math.
- [ ] Run the focused Playwright test and verify it fails before UI changes if needed.
- [ ] Re-run the Playwright test and verify it passes after the UI changes.

### Task 6: Update PDF mapping

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\pdf.ts`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\pdf.test.ts`

- [ ] Add failing PDF assertions for weekly-hours totals and labels if needed.
- [ ] Update PDF row rendering to show `Hrs per week` and monthlyized totals.
- [ ] Re-run the focused PDF test and verify it passes.

### Task 7: Full verification

**Files:**
- Modify only if needed during cleanup.

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `npx playwright test tests/e2e/invoice-feedback.spec.ts`.
- [ ] Stage only the relevant files, commit, and push.
