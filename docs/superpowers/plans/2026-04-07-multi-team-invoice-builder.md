# Multi-Team Invoice Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable company team selection to invoice drafting, support multi-team invoice creation, and auto-import team members into invoice snapshots.

**Architecture:** Introduce a lightweight company-scoped `teams` catalog while keeping employee `defaultTeam` text for compatibility. The invoice flow will read available teams from the catalog plus employee defaults, then bulk-create invoice teams and line items when teams are selected.

**Tech Stack:** Next.js App Router, React, Supabase Postgres, Server Actions, Vitest

---

### Task 1: Team Catalog Helpers

**Files:**
- Create: `src/features/billing/team-catalog.ts`
- Create: `src/features/billing/team-catalog.test.ts`

- [ ] Add pure helpers for team-name normalization, catalog merging, and employee matching.
- [ ] Verify the helper tests fail first.
- [ ] Implement the minimal helper logic.
- [ ] Re-run helper tests and confirm they pass.

### Task 2: Store Support For Master Teams And Bulk Invoice Import

**Files:**
- Modify: `src/features/billing/types.ts`
- Modify: `src/features/billing/store.ts`
- Modify: `supabase/schema.sql`

- [ ] Add a `Team` type and the `teams` table schema.
- [ ] Add store functions to list available team names and create master teams.
- [ ] Update invoice creation so selected teams can be pre-added.
- [ ] Update invoice team creation to auto-import matching employees.
- [ ] Add member removal support for invoice line items.

### Task 3: Server Actions

**Files:**
- Modify: `src/features/billing/actions.ts`

- [ ] Extend `createInvoiceDraftAction` to accept multiple selected team names.
- [ ] Replace manual free-text add-team behavior with existing-team and create-team flows.
- [ ] Add an action for deleting a single invoice member row.

### Task 4: Create Invoice UI

**Files:**
- Create: `app/invoices/create/create-invoice-form.tsx`
- Modify: `app/invoices/create/page.tsx`

- [ ] Add a client form that reacts to company selection.
- [ ] Show available company team options and allow multiple selection.
- [ ] Submit selected teams with draft creation.

### Task 5: Draft Editor UI

**Files:**
- Modify: `app/invoices/drafts/[id]/page.tsx`

- [ ] Replace selected-team workspace with all-team invoice sections.
- [ ] Add existing-team dropdown and inline create-team controls.
- [ ] Remove the manual add-candidate section.
- [ ] Add per-member remove buttons inside each invoice team section.

### Task 6: Verification

**Files:**
- Verify only

- [ ] Run `npm test`
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Smoke-check `/invoices/create` and one draft invoice route
