# P&L Data Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make persisted employee and company P&L summaries match the portal's default fully included accounting while repairing the audited stale rate and commission fields.

**Architecture:** Keep the existing dynamic inclusion helpers for interactive views and exports. Make summary writers persist the same helpers' default results, then use an idempotent SQL migration to normalize existing source and summary rows without changing user-entered financial inputs.

**Tech Stack:** TypeScript, Vitest, Next.js 16, Supabase PostgreSQL

---

### Task 1: Canonical persisted calculations

**Files:**
- Modify: `src/features/billing/pn-dashboard.ts`
- Test: `src/features/billing/pn-dashboard.test.ts`

- [x] Add failing tests proving employee stored Net P&L deducts salary, PF, TDS, and effective advances, and company stored Net P&L deducts expenses and advances while adding company reimbursements.
- [x] Run `npm test -- src/features/billing/pn-dashboard.test.ts` and confirm the new assertions fail against legacy persisted values.
- [x] Set employee and period `netProfitInrCents` / `netPlInrCents` from the existing canonical calculation helpers.
- [x] Re-run the focused tests and confirm they pass.

### Task 2: Existing-data migration

**Files:**
- Create: `supabase/migrations/20260803170000_canonical_pn_summary_net_pl.sql`
- Test: `src/features/billing/pn-summary-store.test.ts`

- [x] Add failing source-contract tests for raw FX/Operating/Gross normalization, weighted company Peg Rate, canonical employee Net P&L, canonical company Net P&L, and column documentation.
- [x] Run the focused summary-store test and confirm it fails because the migration is absent.
- [x] Add an idempotent set-based migration using the current portal formulas and document the canonical columns.
- [x] Re-run focused tests and confirm they pass.

### Task 3: Verification and controlled Supabase repair

**Files:**
- No additional source files.

- [x] Run `npm test`, `npm run lint`, and `npm run build`.
- [x] Apply the migration to the configured Supabase project.
- [x] Re-run the read-only audit and confirm source derivations, employee summaries, company summaries, weighted rates, and canonical stored Net P&L values match.
- [x] Review `git diff` and report the result without pushing unless requested.
