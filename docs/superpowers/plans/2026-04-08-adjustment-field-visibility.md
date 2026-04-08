# Adjustment Field Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make hour-based adjustment fields easier to read by stacking `Rate`, `Hours`, and `Total` into larger full-width rows.

**Architecture:** Keep the current adjustment logic and only change the client-side hour-based field layout plus the browser expectations that verify visibility.

**Tech Stack:** Next.js App Router, React client components, Playwright

---

### Task 1: Update browser expectations

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\tests\e2e\invoice-feedback.spec.ts`

- [ ] Tighten the browser assertions to reflect the stacked field layout.
- [ ] Run `npx playwright test tests/e2e/invoice-feedback.spec.ts` and verify current layout does not yet satisfy the intended visibility.

### Task 2: Implement stacked hour-based fields

**Files:**
- Modify: `D:\Eassyonboard invoice genrator and company dashboard\app\invoices\drafts\[id]\adjustment-forms.tsx`

- [ ] Change hour-based adjustment fields so `Rate`, `Hours`, and `Total` render as separate full-width rows.
- [ ] Keep labels, placeholders, total calculation, and submit behavior unchanged.
- [ ] Re-run `npx playwright test tests/e2e/invoice-feedback.spec.ts` and verify it passes.

### Task 3: Verify and publish

**Files:**
- Modify only if needed during cleanup.

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Stage only the relevant files, commit, and push.
