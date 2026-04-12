# Multi-Invoice Employee Cash Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow multiple invoices to be loaded into Employee Cash Flow for one month while keeping one editable row per employee plus invoice and aggregating only in dashboard monthly views.

**Architecture:** Preserve `invoice_payment_employee_entries` as invoice-level source data. Replace single-invoice page loading with multi-invoice loading, remove editor-side employee aggregation, and keep dashboard aggregation at the employee-month layer.

**Tech Stack:** Next.js App Router, React server/client components, TypeScript, Supabase, Vitest

---

### Task 1: Update Employee Cash Flow Selection Model

**Files:**
- Modify: `app/employee-cash-flow/page.tsx`
- Modify: `src/features/billing/employee-cash-flow-page-state.ts`
- Modify: `src/features/billing/employee-cash-flow-types.ts`
- Test: `src/features/billing/employee-cash-flow-page-state.test.ts`

- [ ] Replace single `invoiceId` query handling with repeated or comma-separated invoice ids
- [ ] Add page-state helpers to parse, normalize, and serialize multiple invoice ids
- [ ] Update tests to cover empty, single, and multi-invoice selection

### Task 2: Load and Preserve Invoice-Level Rows

**Files:**
- Modify: `src/features/billing/employee-cash-flow-store.ts`
- Modify: `app/employee-cash-flow/page.tsx`
- Modify: `src/features/billing/employee-cash-flow-entry-aggregation.ts`
- Test: `src/features/billing/employee-cash-flow-entry-aggregation.test.ts`
- Test: `src/features/billing/employee-cash-flow-store.test.ts`

- [ ] Add a store read path that loads prefill data for multiple invoices in one month
- [ ] Keep output rows separated by invoice instead of collapsing by employee
- [ ] Adjust adjustment-only row generation so it stays invoice-scoped
- [ ] Add regression tests proving same employee across multiple invoices yields multiple editable rows

### Task 3: Update Employee Cash Flow UI

**Files:**
- Modify: `app/employee-cash-flow/page.tsx`
- Modify: `app/employee-cash-flow/_components/employee-cash-flow-entry-form.tsx`

- [ ] Replace the single invoice `<select>` with a multi-select invoice control
- [ ] Show invoice identity on each editable row
- [ ] Preserve current save, add-row, and remove-row behavior

### Task 4: Keep Dashboard Aggregation Correct

**Files:**
- Modify: `src/features/billing/pn-dashboard.ts`
- Modify: `src/features/billing/store.ts`
- Test: `src/features/billing/pn-dashboard.test.ts`

- [ ] Confirm employee-section aggregation groups by employee plus month across all invoice rows
- [ ] Sum reimbursement, onboarding, appraisal, inward, and profit values across same-month invoice rows
- [ ] Join reimbursement labels without losing invoice-level contributions
- [ ] Add regression tests for one employee split across multiple invoices in one month

### Task 5: Verify End to End

**Files:**
- Test: `src/features/billing/employee-cash-flow-page-state.test.ts`
- Test: `src/features/billing/employee-cash-flow-entry-aggregation.test.ts`
- Test: `src/features/billing/employee-cash-flow-store.test.ts`
- Test: `src/features/billing/pn-dashboard.test.ts`

- [ ] Run focused Vitest coverage for page-state, aggregation, store, and dashboard
- [ ] Run lint
- [ ] Smoke-check the employee cash-flow page flow if needed
