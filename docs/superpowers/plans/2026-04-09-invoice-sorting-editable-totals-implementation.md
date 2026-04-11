# Invoice Sorting and Editable Totals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement team-partitioned invoice sorting by billed rate and editable line/team/grand totals across invoice screens and PDF, plus an Edit Employee tab.

**Architecture:** Add manual override fields in billing store/types and keep a single recomputation pipeline that resolves effective totals and invalidates overrides on downstream mutations. Centralize team line-item sorting in shared billing logic so all UI and PDF consumers use the same order.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, Server Actions, Vitest.

---

### Task 1: Add Data Model and Type Support for Manual Totals

**Files:**
- Modify: `src/features/billing/types.ts`
- Modify: `src/features/billing/store.ts`
- Create: `supabase/migrations/2026-04-09-invoice-manual-totals.sql`
- Test: `src/features/billing/domain.test.ts`

- [ ] **Step 1: Write failing test for effective total precedence**
- [ ] **Step 2: Run `npx vitest run src/features/billing/domain.test.ts` and confirm fail**
- [ ] **Step 3: Add manual override fields and effective total helpers in billing domain/store**
- [ ] **Step 4: Add migration columns (`manual_total_usd_cents` on line/team, `manual_grand_total_usd_cents` on invoice)**
- [ ] **Step 5: Run `npx vitest run src/features/billing/domain.test.ts` and confirm pass**

### Task 2: Implement Override Invalidation and Recompute Pipeline

**Files:**
- Modify: `src/features/billing/store.ts`
- Modify: `src/features/billing/actions.ts`
- Test: `src/features/billing/invoice-editor.test.ts`

- [ ] **Step 1: Write failing tests for invalidation rules (line reset on rate/hours, team/grand reset on line/adjustment mutations)**
- [ ] **Step 2: Run `npx vitest run src/features/billing/invoice-editor.test.ts` and confirm fail**
- [ ] **Step 3: Implement recompute helpers and call them in update/add/delete line and adjustments**
- [ ] **Step 4: Add actions for editing line manual total, team manual total, and grand total**
- [ ] **Step 5: Run `npx vitest run src/features/billing/invoice-editor.test.ts` and confirm pass**

### Task 3: Centralize Team-Partitioned Sorting

**Files:**
- Modify: `src/features/billing/store.ts`
- Modify: `src/features/billing/pdf.ts`
- Test: `src/features/billing/pdf.test.ts`
- Test: `src/features/billing/invoice-workflow.test.ts`

- [ ] **Step 1: Write failing tests for team sorting (`billingRate desc`, `effective total desc`, `name asc`)**
- [ ] **Step 2: Run targeted tests and confirm fail**
- [ ] **Step 3: Implement shared sorting function in billing store and apply before returning invoice details**
- [ ] **Step 4: Ensure PDF model consumes already-sorted line items**
- [ ] **Step 5: Run tests and confirm pass**

### Task 4: Make Totals Editable on Invoice Screens

**Files:**
- Modify: `app/invoices/drafts/[id]/page.tsx`
- Modify: `app/invoices/[id]/page.tsx`
- Modify: `src/features/billing/actions.ts`
- Modify: `src/features/billing/store.ts`

- [ ] **Step 1: Add editable inputs and forms for line total, team total, grand total on draft page**
- [ ] **Step 2: Add same edit controls to non-draft invoice route (replace redirect-only behavior with detail render)**
- [ ] **Step 3: Wire forms to new server actions and recalc rules**
- [ ] **Step 4: Verify values propagate to listing and PDF route**

### Task 5: Make Adjustments Amounts Editable

**Files:**
- Modify: `app/invoices/drafts/[id]/adjustment-forms.tsx`
- Modify: `src/features/billing/actions.ts`
- Modify: `src/features/billing/store.ts`
- Test: `src/features/billing/adjustments.test.ts`

- [ ] **Step 1: Write failing test for updating adjustment amount and recomputed invoice totals**
- [ ] **Step 2: Add update adjustment action/store method**
- [ ] **Step 3: Add per-adjustment amount edit controls in adjustment UI**
- [ ] **Step 4: Run tests and confirm pass**

### Task 6: Add Employees Edit Tab

**Files:**
- Modify: `app/employees/page.tsx`
- Modify: `src/features/billing/actions.ts`
- Modify: `src/features/billing/store.ts`
- Test: `src/features/billing/member-assignment.test.ts`

- [ ] **Step 1: Add failing test for employee update flow**
- [ ] **Step 2: Add store update method and action for full employee edit**
- [ ] **Step 3: Add tab UI (`Add Employee`, `Edit Employee`) with edit form**
- [ ] **Step 4: Run tests and confirm pass**

### Task 7: Final Verification

**Files:**
- Modify: `src/features/billing/pdf.test.ts`
- Modify: `src/features/billing/invoice-workflow.test.ts`
- Modify: `README.md` (if needed for new edit workflow notes)

- [ ] **Step 1: Run targeted vitest suites for billing domain/store/pdf/workflow**
- [ ] **Step 2: Run `npm run build`**
- [ ] **Step 3: Manually verify draft invoice edits, non-draft invoice edits, and employee edit tab**
- [ ] **Step 4: Commit with scoped message**
