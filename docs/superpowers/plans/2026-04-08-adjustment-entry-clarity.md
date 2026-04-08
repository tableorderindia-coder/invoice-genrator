# Adjustment Entry Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unclear compact adjustment entry controls with a larger labeled form that clearly communicates what users should enter for each adjustment type.

**Architecture:** Keep the existing dropdown-driven adjustment logic, duplicate protection, pending state, and grouped saved lists intact. Limit the change to the client-side adjustment entry component and the E2E coverage that verifies visible labels, placeholders, and dynamic field switching.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Playwright

---

### Task 1: Strengthen browser expectations first

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\tests\e2e\invoice-feedback.spec.ts`

- [ ] Update the Playwright test to expect visible labels and placeholders for onboarding and reimbursement flows.
- [ ] Run `npx playwright test tests/e2e/invoice-feedback.spec.ts` and verify it fails against the current compact form.

### Task 2: Redesign the adjustment entry layout

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\app\invoices\drafts\[id]\adjustment-forms.tsx`

- [ ] Implement the larger labeled field layout for hour-based adjustments.
- [ ] Implement the larger labeled field layout for reimbursements.
- [ ] Keep existing add, duplicate, pending, and remove logic intact.
- [ ] Re-run `npx playwright test tests/e2e/invoice-feedback.spec.ts` and verify it passes.

### Task 3: Full verification and publish

**Files:**
- Modify only if needed during cleanup.

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Re-run `npx playwright test tests/e2e/invoice-feedback.spec.ts`.
- [ ] Stage only the relevant files, commit, and push.
