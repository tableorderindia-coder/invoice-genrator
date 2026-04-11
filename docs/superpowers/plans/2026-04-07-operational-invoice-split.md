# Operational Invoice Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split invoice creation, draft editing, issued-invoice operations, and cashout into separate pages.

**Architecture:** Keep draft editing in its own route, move issued invoices to an operational list, and move cashout to a dedicated settlement page. Use small workflow helpers for status filtering and keep status transitions simple: draft editor generates, invoice list sends, cashout page realizes.

**Tech Stack:** Next.js App Router, Server Components, Server Actions, Supabase store layer, Vitest

---

### Task 1: Status workflow helpers

**Files:**
- Create: `src/features/billing/invoice-workflow.ts`
- Create: `src/features/billing/invoice-workflow.test.ts`

- [ ] Add pure helpers for draft-only, issued-only, and cashout-eligible invoice filtering.
- [ ] Test the status routing assumptions before page refactors.

### Task 2: Route split

**Files:**
- Create: `app/invoices/create/page.tsx`
- Create: `app/invoices/drafts/[id]/page.tsx`
- Create: `app/cashout/page.tsx`
- Modify: `app/invoices/new/page.tsx`
- Modify: `app/invoices/[id]/page.tsx`

- [ ] Move create form to `/invoices/create`.
- [ ] Move draft editor to `/invoices/drafts/[id]`.
- [ ] Redirect old compatibility routes into the new route structure.

### Task 3: UI responsibilities

**Files:**
- Modify: `app/_components/shell.tsx`
- Modify: `app/invoices/page.tsx`
- Modify: `app/invoices/drafts/[id]/page.tsx`

- [ ] Add nav entries for `Create Invoice` and `Cashout`.
- [ ] Remove profit and cashout UI from draft editor.
- [ ] Keep only the generate action in draft editor.
- [ ] Make invoices page show operational issued invoices and allow mark-sent.

### Task 4: Cashout page

**Files:**
- Modify: `app/cashout/page.tsx`
- Reuse: `src/features/billing/actions.ts`
- Reuse: `src/features/billing/store.ts`

- [ ] List cashout-eligible invoices.
- [ ] Add open-PDF and cashout action.
- [ ] Exclude drafts and already-cashed-out invoices.

### Task 5: Verification and ship

**Files:**
- Modify if needed: route pages and helpers above

- [ ] Run targeted tests.
- [ ] Run full test suite.
- [ ] Run lint and build.
- [ ] Smoke-check draft editor, invoices page, and cashout page.
- [ ] Commit and push the workflow split.
