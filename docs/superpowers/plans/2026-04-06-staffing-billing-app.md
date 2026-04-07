# Staffing Billing App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Supabase-backed internal web app for staffing-company invoice generation, PDF export, cash-out, and realized USD profit tracking.

**Architecture:** Use a Next.js App Router frontend with a local domain layer for invoice calculations and snapshot rules. Persist data in Supabase Postgres, generate PDFs from saved invoice snapshots, and calculate realized profit only after cash-out.

**Tech Stack:** Next.js, TypeScript, React, Supabase, Vitest, Tailwind CSS, pdfkit

---

### Task 1: Scaffold the application

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `app/`
- Create: `src/`
- Create: `tests/`

- [ ] Initialize a Next.js TypeScript app in the current workspace.
- [ ] Install runtime dependencies for Supabase, PDF generation, and styling.
- [ ] Install dev dependencies for Vitest, Testing Library, and TypeScript support.
- [ ] Add base scripts for `dev`, `build`, `lint`, and `test`.

### Task 2: Add billing domain tests and logic

**Files:**
- Create: `src/features/billing/domain.ts`
- Create: `src/features/billing/domain.test.ts`

- [ ] Write failing tests for invoice line totals, adjustment totals, invoice grand totals, and cash-out realized profit.
- [ ] Run the billing tests and confirm they fail first.
- [ ] Implement the minimal pure functions to pass the tests.
- [ ] Re-run the billing tests and confirm they pass.

### Task 3: Add typed data models and seed data

**Files:**
- Create: `src/features/billing/types.ts`
- Create: `src/features/billing/mock-data.ts`
- Create: `src/features/billing/store.ts`

- [ ] Define the core entities for companies, employees, invoices, teams, line items, adjustments, and realizations.
- [ ] Add mock in-memory seed data shaped like the future Supabase tables.
- [ ] Create store helpers for listing companies, employees, invoices, invoice details, and dashboard metrics.

### Task 4: Build invoice creation and duplicate-last-month flow

**Files:**
- Create: `app/invoices/new/page.tsx`
- Create: `app/invoices/[id]/page.tsx`
- Create: `src/features/billing/actions.ts`
- Create: `src/features/billing/forms/`

- [ ] Build a create-invoice flow that starts from company, month, year, invoice number, billing date, and due date.
- [ ] Support duplicating the previous invoice structure into a new draft.
- [ ] Prefill employee snapshot data while allowing per-invoice overrides.
- [ ] Recalculate totals on the server-side action before saving.

### Task 5: Build supporting admin pages

**Files:**
- Create: `app/page.tsx`
- Create: `app/companies/page.tsx`
- Create: `app/employees/page.tsx`
- Create: `app/dashboard/page.tsx`
- Create: `src/components/`

- [ ] Build a homepage that links to the main workflows.
- [ ] Build company and employee pages from the shared store.
- [ ] Build a dashboard showing realized profit, pending cash-out, and invoice status summaries.

### Task 6: Add PDF rendering and cash-out flow

**Files:**
- Create: `src/features/billing/pdf.ts`
- Create: `app/api/invoices/[id]/pdf/route.ts`
- Modify: `app/invoices/[id]/page.tsx`

- [ ] Generate a PDF from the saved invoice snapshot only.
- [ ] Add a cash-out action that creates one realization record per invoice.
- [ ] Prevent double cash-out in the domain layer and UI.

### Task 7: Verification

**Files:**
- Modify: `README.md`

- [ ] Run the billing tests.
- [ ] Run the full test suite.
- [ ] Run the production build.
- [ ] Document local setup, current mock-data limitation, and the next Supabase migration step in the README.
