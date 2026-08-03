# Employee Advance Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct dashboard accounting order, support employee-month Advance INR overrides that affect only Advances and Net P&L, and make shared SaaS dropdown and control surfaces readable.

**Architecture:** Store an optional override beside the employee cash-flow row and centralize effective-advance selection in the existing billing calculation helper. Propagate that nullable field through the established load/update/export paths, then replace hardcoded legacy-dark surface colors with mode-aware CSS classes so SaaS and Legacy retain distinct presentations.

**Tech Stack:** Next.js, React, TypeScript, Supabase/PostgreSQL, Vitest, Testing Library, CSS custom properties.

---

### Task 1: Lock Dashboard Column Order

**Files:**
- Modify: `src/features/billing/dashboard-column-visibility.test.ts`
- Modify: `src/features/billing/filter-selection.test.ts`
- Modify: `src/features/billing/dashboard-column-options.ts`
- Modify: `src/features/billing/dashboard-export.test.ts`
- Modify: `src/features/billing/dashboard-export.ts`

- [ ] **Step 1: Write failing assertions for Salary Paid, PF, TDS order**

Assert both option registries and exported employee/period headings place `salaryPaid` before `pf` before `tds`.

- [ ] **Step 2: Run focused tests and verify the current PF, TDS, Salary Paid order fails**

Run: `npm test -- src/features/billing/dashboard-column-visibility.test.ts src/features/billing/filter-selection.test.ts src/features/billing/dashboard-export.test.ts`

Expected: FAIL on the canonical ordering assertions.

- [ ] **Step 3: Reorder the canonical option and export definitions**

Move the Salary Paid entries ahead of PF and TDS without changing keys, labels, visibility semantics, or URL parsing.

- [ ] **Step 4: Re-run focused tests**

Expected: PASS.

### Task 2: Define Effective Advance Override Accounting

**Files:**
- Modify: `src/features/billing/pn-dashboard.test.ts`
- Modify: `src/features/billing/dashboard-table-totals.test.ts`
- Modify: `src/features/billing/types.ts`
- Modify: `src/features/billing/employee-cash-flow-types.ts`
- Modify: `src/features/billing/pn-dashboard.ts`
- Modify: `src/features/billing/dashboard-table-totals.ts`

- [ ] **Step 1: Add failing calculation tests**

Cover automatic conversion when the override is null, explicit INR override selection, unchanged Gross P&L, changed included Net P&L, and period totals that sum mixed automatic and overridden employee rows.

- [ ] **Step 2: Run focused calculation tests and verify failure**

Run: `npm test -- src/features/billing/pn-dashboard.test.ts src/features/billing/dashboard-table-totals.test.ts`

Expected: FAIL because the row types and helper do not expose the override.

- [ ] **Step 3: Add the nullable field and central fallback helper behavior**

Add `advanceOverrideInrCents: number | null` to persisted employee-month row shapes and `advanceOverrideInrCents?: number | null` to update inputs. Implement `calculatePnEmployeeAdvanceInrCents(row)` as override-null-coalescing-derived-value.

- [ ] **Step 4: Re-run focused calculation tests**

Expected: PASS with unchanged non-advance calculations.

### Task 3: Persist Overrides Through Supabase And Actions

**Files:**
- Create: `supabase/migrations/20260803120000_employee_advance_inr_override.sql`
- Modify: `src/features/billing/employee-cash-flow-store.test.ts`
- Modify: `src/features/billing/employee-cash-flow-store.ts`
- Modify: `src/features/billing/pn-summary-store.test.ts`
- Modify: `src/features/billing/pn-summary-store.ts`
- Modify: `src/features/billing/actions.test.ts`
- Modify: `src/features/billing/actions.ts`

- [ ] **Step 1: Add failing row-mapping and validation tests**

Test load mapping of null and numeric overrides, updates that set or clear the value, bulk validation rejecting negative/non-integer values, and summary rows carrying the override into period aggregation.

- [ ] **Step 2: Run focused persistence tests and verify failure**

Run: `npm test -- src/features/billing/employee-cash-flow-store.test.ts src/features/billing/pn-summary-store.test.ts src/features/billing/actions.test.ts`

Expected: FAIL because the database mapping and update payload omit the column.

- [ ] **Step 3: Add the additive migration and persistence plumbing**

Use `alter table ... add column if not exists advance_override_inr_cents bigint null` with a non-negative check that permits null. Include the field in all relevant selects, maps, single-row updates, and bulk update validation.

- [ ] **Step 4: Re-run focused persistence tests**

Expected: PASS.

### Task 4: Make Employee Advances Editable In Both Presentations

**Files:**
- Modify: `src/features/billing/dashboard-tables-render.test.ts`
- Modify: `app/dashboard/unified-employee-table.tsx`
- Modify: `app/dashboard/dashboard-tables.tsx`

- [ ] **Step 1: Add failing interaction tests**

In SaaS and Legacy employee tables, assert that Edit mode exposes an Advances INR numeric input for persisted rows, entering an override updates Advances and Net P&L live, Effective Dollar Inward and Gross P&L remain unchanged, and clearing restores the automatic value.

- [ ] **Step 2: Run the render tests and verify failure**

Run: `npm test -- src/features/billing/dashboard-tables-render.test.ts`

Expected: FAIL because Advances is read-only and absent from bulk updates.

- [ ] **Step 3: Add the nullable field to draft construction and editable-cell rendering**

Use the shared `NumericInput` with INR precision. Save entered values as paise, preserve an empty raw value as null, and keep salary-only rows read-only. Recalculate with existing helpers and include the field in single-row and bulk payloads.

- [ ] **Step 4: Re-run the render tests**

Expected: PASS, including keyboard editing and dirty-row behavior.

### Task 5: Align Overview And Visible Exports

**Files:**
- Modify: `src/features/billing/dashboard-export.test.ts`
- Modify: `src/features/billing/overview-pnl-summary.test.ts`
- Modify: `src/features/billing/dashboard-export.ts`
- Modify: `src/features/billing/overview-pnl-summary.ts`

- [ ] **Step 1: Add failing integration assertions**

Build employee rows with explicit overrides and assert employee CSV/PDF models, period CSV/PDF models, and Overview rows all display and deduct the effective override while retaining the same Gross P&L.

- [ ] **Step 2: Run focused integration tests and verify failure**

Run: `npm test -- src/features/billing/dashboard-export.test.ts src/features/billing/overview-pnl-summary.test.ts`

Expected: FAIL where derived advance values are still used.

- [ ] **Step 3: Route all consumers through effective employee advances**

Use `calculatePnEmployeeAdvanceInrCents` before aggregation and retain current Expenses, reimbursements, and inclusion-toggle semantics.

- [ ] **Step 4: Re-run focused integration tests**

Expected: PASS.

### Task 6: Fix Mode-Aware Dropdown And SaaS Surfaces

**Files:**
- Modify: `src/features/ui/checklist-filter-dropdown.test.tsx`
- Modify: `app/_components/checklist-filter-dropdown.tsx`
- Modify: `app/globals.css`
- Modify: affected SaaS-rendered components identified by the hardcoded legacy-background audit

- [ ] **Step 1: Add failing semantic-class and mode-style tests**

Assert the checklist panel and options use shared surface classes rather than a hardcoded dark inline background, and that SaaS CSS defines white/dark-readable values while Legacy CSS retains the dark panel.

- [ ] **Step 2: Run the focused UI test and verify failure**

Run: `npm test -- src/features/ui/checklist-filter-dropdown.test.tsx`

Expected: FAIL because the panel currently hardcodes `rgba(15, 17, 24, 0.98)`.

- [ ] **Step 3: Introduce semantic surface classes and complete the scoped audit**

Apply mode-aware classes to checklist panels, rows, and shared popovers. Replace hardcoded translucent legacy backgrounds in SaaS-rendered controls with CSS variables or SaaS overrides while preserving status colors and Legacy presentation.

- [ ] **Step 4: Re-run focused UI tests**

Expected: PASS with accessible text and hover/focus contrast.

### Task 7: Full Verification And Pull Request

**Files:**
- Verify all modified files and generated migration only.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run lint and production build**

Run: `npm run lint`

Run: `npm run build`

Expected: both commands exit successfully without new warnings.

- [ ] **Step 3: Inspect the Supabase-backed production UI**

Start the production server on an available port, inspect desktop and mobile dashboard dropdowns, verify column order, and enter/cancel an advance override without saving live financial data.

- [ ] **Step 4: Review the final diff and commit**

Confirm only the approved accounting override, ordering, migration, tests, and mode-aware styling are present. Commit with a focused message.

- [ ] **Step 5: Push and open the stacked pull request**

Push `codex/editable-employee-advances` and create a PR targeting `codex/automatic-filter-loading`, summarizing the nullable fallback and the fact that Gross P&L is unchanged.
