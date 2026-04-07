# Invoice Editor Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the invoice detail page into a selected-team workspace where teams are managed separately and candidates are added into the currently active team.

**Architecture:** Keep invoice creation on `/invoices/new`, add a server action for deleting teams and their line items, and drive selected-team state on `/invoices/[id]` with `searchParams`. The invoice detail page will render one active team table at a time while the candidate form binds to that active team.

**Tech Stack:** Next.js App Router, Server Actions, Supabase-backed store layer, Vitest

---

### Task 1: Team selection helpers

**Files:**
- Create: `src/features/billing/invoice-editor.ts`
- Create: `src/features/billing/invoice-editor.test.ts`

- [ ] Add pure helpers for selected-team fallback and empty-state resolution.
- [ ] Test requested-team match, invalid-team fallback, and no-team behavior.

### Task 2: Team deletion mutation

**Files:**
- Modify: `src/features/billing/store.ts`
- Modify: `src/features/billing/actions.ts`

- [ ] Add a store function that deletes an invoice team and all its line items.
- [ ] Add a server action for team deletion and revalidation.
- [ ] Make sure invoice totals are recomputed after deletion.

### Task 3: Invoice detail page redesign

**Files:**
- Modify: `app/invoices/[id]/page.tsx`

- [ ] Read selected team from `searchParams`.
- [ ] Render team cards with active state and switch links.
- [ ] Add remove-team control for the selected team.
- [ ] Remove the team dropdown from the add-candidate form.
- [ ] Show only the selected team’s candidate table.
- [ ] Disable candidate form when there is no selected team.

### Task 4: Verification

**Files:**
- Modify if needed: `app/invoices/[id]/page.tsx`
- Modify if needed: `src/features/billing/invoice-editor.ts`

- [ ] Run targeted tests.
- [ ] Run full test suite.
- [ ] Run build and smoke-check the invoice page behavior.
- [ ] Commit and push only the workflow changes.
