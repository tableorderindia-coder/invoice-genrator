# Adjustment Line Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic invoice adjustment form with four structured adjustment entry blocks and persist the new person-based adjustment detail.

**Architecture:** Extend the billing adjustment model first so onboarding, offboarding, appraisal, and reimbursement can be represented cleanly in one store path. Then update the draft invoice page to render purpose-built forms with live total previews while keeping server-side calculation as the final source of truth.

**Tech Stack:** Next.js App Router, React Server Components with server actions, TypeScript, Vitest, Playwright, Supabase

---

### Task 1: Extend adjustment model and store shape

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\types.ts`
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\store.ts`
- Test: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\adjustments.test.ts`

- [ ] Write failing tests for appraisal and person-based adjustment persistence.
- [ ] Run the focused test file and verify it fails for missing fields/types.
- [ ] Implement the minimal type and store changes.
- [ ] Re-run the focused test file and verify it passes.

### Task 2: Update server action payload handling

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\actions.ts`
- Test: `D:\Eassyonboard invoice genrator and company dashboard\src\features\billing\adjustments.test.ts`

- [ ] Add failing tests for server-side normalization of onboarding, offboarding, appraisal, and reimbursement payloads.
- [ ] Run the focused test file and verify it fails for missing action normalization helpers.
- [ ] Implement the minimal parsing and normalization logic.
- [ ] Re-run the focused test file and verify it passes.

### Task 3: Replace generic draft-page adjustment UI

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\app\invoices\drafts\[id]\page.tsx`
- Test: `D:\Eassyonboard invoice genrator and company dashboard\tests\e2e\invoice-feedback.spec.ts`

- [ ] Add a failing browser test or assertion for the new onboarding adjustment flow.
- [ ] Run the focused Playwright test and verify it fails.
- [ ] Replace the generic adjustment form with four dedicated sections and live read-only totals.
- [ ] Re-run the focused browser test and verify it passes.

### Task 4: Verify the integrated flow

**Files:**
- Modify only if needed during cleanup.

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run the focused Playwright test for the adjustment feedback flow.
