# Employee Cash Flow Batches And Row Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add row-level updates, integer-friendly paid inputs, derived actual-paid math, a saved-rows management tab, and duplicate invoice batches to Employee Cash Flow.

**Architecture:** Reuse `invoice_payments` as the saved batch identity for Employee Cash Flow so the same invoice can be loaded multiple times without a new top-level table. Keep raw rows in `invoice_payment_employee_entries`, add client/server batch metadata to row state, derive actual-paid INR from the working inputs, and add a saved-rows view grouped by employee and month without aggregating rows together.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Supabase, Vitest

---

### Task 1: Extend cash-flow row state for saved-batch identity and derived actual-paid math

**Files:**
- Modify: `src/features/billing/employee-cash-flow-types.ts`
- Modify: `src/features/billing/employee-cash-flow.ts`
- Modify: `src/features/billing/employee-cash-flow-page-state.ts`
- Test: `src/features/billing/employee-cash-flow-page-state.test.ts`
- Test: `src/features/billing/employee-cash-flow.test.ts`

- [ ] Add row-level batch metadata (`invoicePaymentId`, client batch id, batch label) to cash-flow write input
- [ ] Add helper for derived actual paid INR from days worked, monthly paid USD, and paid USD/INR
- [ ] Update row-builder helpers so new rows prefill monthly paid USD and batch metadata correctly
- [ ] Add focused tests for actual-paid derivation and state-building

### Task 2: Support duplicate invoice batches in compose mode

**Files:**
- Modify: `app/employee-cash-flow/page.tsx`
- Modify: `app/employee-cash-flow/_components/employee-cash-flow-entry-form.tsx`
- Modify: `src/features/billing/employee-cash-flow-entry-aggregation.ts`
- Test: `src/features/billing/employee-cash-flow-entry-aggregation.test.ts`

- [ ] Keep selected invoice instances as separate client batches, even when the same invoice is added twice
- [ ] Add UI control to duplicate a selected invoice into a new compose batch
- [ ] Ensure visible compose rows remain separate by employee plus batch
- [ ] Add tests proving duplicate invoice instances stay separate

### Task 3: Save and update rows per batch and per row

**Files:**
- Modify: `src/features/billing/actions.ts`
- Modify: `src/features/billing/employee-cash-flow-store.ts`
- Test: `src/features/billing/employee-cash-flow-store.test.ts`

- [ ] Save compose rows grouped by batch using `invoice_payments` as the persisted batch identity
- [ ] Add row-level update action for a single saved employee cash-flow row
- [ ] Add row-level delete action for a single saved employee cash-flow row
- [ ] Persist derived actual-paid INR instead of manual input
- [ ] Add regression coverage for duplicate batches and row-level save/update/delete

### Task 4: Build the saved-rows tab

**Files:**
- Modify: `app/employee-cash-flow/page.tsx`
- Create or Modify: `app/employee-cash-flow/_components/employee-cash-flow-saved-rows.tsx`
- Modify: `src/features/billing/employee-cash-flow-store.ts`
- Modify: `src/features/billing/employee-cash-flow-types.ts`
- Test: `src/features/billing/employee-cash-flow-store.test.ts`

- [ ] Add a `Saved Rows` tab beside compose
- [ ] Load saved entries for selected company and month
- [ ] Group saved rows by employee and month while keeping each saved entry on its own line
- [ ] Add per-row edit, update, and remove behavior
- [ ] Ensure invoice number and batch label are visible for duplicate invoice rows

### Task 5: Verify dashboard aggregation still combines saved rows correctly

**Files:**
- Modify: `src/features/billing/pn-dashboard.ts`
- Modify: `src/features/billing/store.ts`
- Test: `src/features/billing/pn-dashboard.test.ts`

- [ ] Confirm dashboard ignores batch boundaries and still aggregates by employee plus month
- [ ] Add test case where the same invoice is saved twice in separate batches for one employee/month

### Task 6: Final verification and data cleanup

**Files:**
- Modify: `docs/superpowers/specs/2026-04-12-employee-cash-flow-batches-and-row-editing-design.md`
- Modify: `docs/superpowers/plans/2026-04-12-employee-cash-flow-batches-and-row-editing.md`

- [ ] Run focused Vitest coverage for cash-flow state, compose batching, store, and dashboard
- [ ] Run `npx tsc --noEmit`
- [ ] Run `npm run lint`
- [ ] Push to `main`
- [ ] Delete any non-Arena companies from Supabase after code is verified and pushed
