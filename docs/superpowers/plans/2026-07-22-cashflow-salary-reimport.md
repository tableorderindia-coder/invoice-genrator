# Cashflow Salary Reimport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Employee Cash Flow compose reload latest saved Salary details when admin loads company/month/invoices again, while removing paid checkbox and paid date from cashflow UI.

**Architecture:** Keep saved cashflow rows unchanged until admin clicks Save. Compose prefill reads latest salary rows for the selected payment month and overlays salary amounts onto newly loaded draft rows. The write path stops accepting visible paid status/date fields and stores unpaid/null defaults.

**Tech Stack:** Next.js App Router, Supabase store helpers, React client components, Vitest tests.

---

### Task 1: Salary Prefill Precedence

**Files:**
- Modify: `src/features/billing/employee-cash-flow-store.test.ts`
- Modify: `src/features/billing/employee-cash-flow-store.ts`

- [x] **Step 1: Write failing tests**

Add tests proving `buildInvoiceCashFlowFallbackEntries` prefers salary rows over employee defaults for `actualPaidInrCents`, `pfInrCents`, `tdsInrCents`, `daysWorked`, and `daysInMonth` when a salary payment for `employeeId + month` exists.

- [x] **Step 2: Run focused tests and verify RED**

Run:

```powershell
npm test -- --run src/features/billing/employee-cash-flow-store.test.ts
```

Expected: new salary prefill test fails because current fallback does not apply all saved salary details.

- [x] **Step 3: Implement salary overlay**

Update the prefill shaping helper so loaded compose entries use latest salary rows for the selected month. Do not mutate saved cashflow rows unless admin submits Save.

- [x] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
npm test -- --run src/features/billing/employee-cash-flow-store.test.ts
```

Expected: all tests in the file pass.

### Task 2: Remove Paid Controls From Cashflow UI

**Files:**
- Modify: `src/features/billing/employee-cash-flow-page-state.test.ts`
- Modify: `src/features/billing/employee-cash-flow-saved-rows-render.test.ts`
- Modify: `app/employee-cash-flow/_components/employee-cash-flow-entry-form.tsx`
- Modify: `app/employee-cash-flow/_components/employee-cash-flow-saved-rows.tsx`
- Modify: `app/employee-cash-flow/page.tsx`

- [x] **Step 1: Write failing tests**

Add render/source tests proving compose no longer renders `Paid date` or `Mark as paid`, saved rows do not render paid status/date controls, and page no longer defaults paid date into compose entries.

- [x] **Step 2: Run focused tests and verify RED**

Run:

```powershell
npm test -- --run src/features/billing/employee-cash-flow-page-state.test.ts src/features/billing/employee-cash-flow-saved-rows-render.test.ts
```

Expected: tests fail while old paid controls remain.

- [x] **Step 3: Remove visible paid controls**

Remove paid date and paid checkbox UI from compose and saved rows. Keep type fields and DB columns for compatibility.

- [x] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
npm test -- --run src/features/billing/employee-cash-flow-page-state.test.ts src/features/billing/employee-cash-flow-saved-rows-render.test.ts
```

Expected: focused tests pass.

### Task 3: Save Defaults And Verification

**Files:**
- Modify: `src/features/billing/actions.test.ts`
- Modify: `src/features/billing/actions.ts`

- [x] **Step 1: Write failing action test**

Add a test proving `saveEmployeeCashFlowEntriesAction` does not require or preserve visible paid status/date from submitted entries and sends `paidStatus: false`, `paidDate: undefined`.

- [x] **Step 2: Implement write normalization**

Normalize cashflow save payload entries so paid status/date are not user-controlled from Employee Cash Flow.

- [x] **Step 3: Verify all**

Run:

```powershell
npm test
npm run lint
$env:NEXT_PUBLIC_SUPABASE_URL='https://juptllfdavrdxxdsxvxw.supabase.co'; $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_oMV2zjS_sxuQRId3kSbJqg_WW27SR6D'; npm run build
```

Expected: all commands pass.
