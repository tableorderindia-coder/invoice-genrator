# Adjustment Dropdown Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the adjustment entry system with one dropdown-driven manager that prevents duplicates, supports removal, and fixes PDF category rendering.

**Architecture:** Build a focused client adjustment manager for the draft invoice page and keep server actions responsible for final calculation and persistence. Add one shared adjustment helper for duplicate signatures and PDF category grouping so UI and PDF both use the same category logic.

**Tech Stack:** Next.js App Router, React client components, server actions, TypeScript, Vitest, Playwright, Supabase

---

### Task 1: Add shared adjustment helpers

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\adjustments.ts`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\adjustments.test.ts`

- [ ] Write failing tests for duplicate-signature normalization and category grouping totals.
- [ ] Run `npm test -- src/features/billing/adjustments.test.ts` and verify the new tests fail for missing helper behavior.
- [ ] Implement the minimal helper functions for duplicate signatures and category grouping.
- [ ] Re-run `npm test -- src/features/billing/adjustments.test.ts` and verify it passes.

### Task 2: Add removal support to persistence

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\store.ts`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\actions.ts`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\types.ts`

- [ ] Add a failing unit test if a pure helper is needed; otherwise rely on existing coverage and implement minimal delete adjustment support.
- [ ] Add store deletion and server action wiring for removing one invoice adjustment row.
- [ ] Re-run `npm test`.

### Task 3: Replace adjustment UI with one dropdown manager

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\app\invoices\drafts\[id]\page.tsx`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\app\invoices\drafts\[id]\adjustment-forms.tsx`

- [ ] Write or update the failing browser test to cover dropdown selection, duplicate blocking, and remove flow.
- [ ] Run `npx playwright test tests/e2e/invoice-feedback.spec.ts` and verify it fails.
- [ ] Implement the controlled dropdown form, field swapping, pending state, duplicate blocking, grouped lists, and remove button.
- [ ] Re-run `npx playwright test tests/e2e/invoice-feedback.spec.ts` and verify it passes.

### Task 4: Add create-invoice click lock

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\app\invoices\create\create-invoice-form.tsx`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\app\invoices\create\page.tsx` only if button composition needs it

- [ ] Add a pending submit state to the create-invoice form button.
- [ ] Verify the button shows `Creating...` while pending and prevents double submission.

### Task 5: Fix PDF category rendering

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\pdf.ts`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\pdf.test.ts`

- [ ] Write failing assertions for separate onboarding, appraisal, reimbursement, and offboarding sections.
- [ ] Run `npm test -- src/features/billing/pdf.test.ts` and verify it fails.
- [ ] Implement independent PDF grouping and formula generation.
- [ ] Re-run `npm test -- src/features/billing/pdf.test.ts` and verify it passes.

### Task 6: Full verification

**Files:**
- Modify only if needed during cleanup.

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `npx playwright test tests/e2e/invoice-feedback.spec.ts`.
- [ ] Stage only the relevant files, commit, and push.
