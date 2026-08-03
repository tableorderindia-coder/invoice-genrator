# Filter Editor State Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every automatically applied filter immediately refreshes the editable values shown for the newly selected company, employee, period, invoice scope, or dashboard dataset.

**Architecture:** Keep Next.js client-side `router.replace` navigation and use React identity boundaries to remount stateful or uncontrolled editors whenever their underlying dataset changes. Reconcile the shared checklist dropdown with new server defaults while it is closed, preserving in-progress selections while open.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library

---

### Task 1: Capture Editor Identity Contracts

**Files:**
- Modify: `src/features/ui/auto-apply-page-wiring.test.ts`
- Modify: `app/companies/page.tsx`
- Modify: `app/employees/page.tsx`
- Modify: `app/salary/page.tsx`
- Modify: `app/employee-statements/page.tsx`
- Modify: `app/employee-cash-flow/page.tsx`
- Modify: `app/expenses/page.tsx`
- Modify: `app/dashboard/page.tsx`

- [x] Add failing source-wiring assertions for canonical editor keys.
- [x] Run the focused test and confirm the assertions fail because the keys are absent.
- [x] Add keys for company, employee, salary month, statement range, cash-flow compose/saved scopes, expense target month, and dashboard employee dataset.
- [x] Re-run the focused test and confirm it passes.

### Task 2: Synchronize Checklist Defaults

**Files:**
- Modify: `src/features/ui/checklist-filter-dropdown.test.tsx`
- Modify: `app/_components/checklist-filter-dropdown.tsx`

- [x] Add a failing rerender test showing that closed checklist selections must follow new defaults and options.
- [x] Add a failing test showing that an open checklist preserves the user's in-progress selection until it closes.
- [x] Reconcile normalized defaults while the popover is closed without effect-driven state updates.
- [x] Run the checklist tests and confirm they pass.

### Task 3: Verify And Ship

**Files:**
- Modify: `docs/superpowers/plans/2026-08-03-filter-editor-state-sync.md`

- [x] Run all Vitest tests.
- [x] Run ESLint.
- [x] Run the Next.js production build.
- [x] Review the complete diff against `origin/main` for regressions and scope drift.
- [ ] Mark this plan complete, commit the coherent fix, push `codex/edit-form-selection-sync`, and create a PR targeting `main`.
