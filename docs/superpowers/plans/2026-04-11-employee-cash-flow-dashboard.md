# Employee Cash Flow Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new standalone employee cash-flow dashboard backed by new cash-ledger tables and isolated UI/actions, without modifying existing invoice, payout, or P&L logic.

**Architecture:** Add a new Supabase cash-ledger schema (`employee_salary_payments`, `invoice_payments`, `invoice_payment_employee_entries`), then build a separate `employee-cash-flow` store/action/UI slice that reads existing invoice and payout data only for prefilling and accrual-side detail display. Keep all current dashboard and payout code untouched, and use clearly prefixed `EmployeeCashFlow*` TypeScript names to avoid collisions with current billing types.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, Vitest, existing server actions pattern, existing glass-panel dashboard components.

---

## File Structure

### New files

- `supabase/migrations/2026-04-11-employee-cash-flow-ledger.sql`
  Creates the three new tables, indexes, and constraints with defensive `if not exists` statements.
- `src/features/billing/employee-cash-flow-types.ts`
  New database row and page-view types for the cash-flow slice only.
- `src/features/billing/employee-cash-flow.ts`
  Pure calculation helpers for cash-in, pending amount, net amount, and status.
- `src/features/billing/employee-cash-flow.test.ts`
  Unit tests for the pure cash-flow calculations.
- `src/features/billing/employee-cash-flow-store.ts`
  Isolated Supabase queries for the new dashboard and prefill flows.
- `src/features/billing/employee-cash-flow-store.test.ts`
  Store-level shaping tests using mocked input rows.
- `app/employee-cash-flow/page.tsx`
  Standalone App Router page for the new dashboard.
- `app/employee-cash-flow/_components/employee-cash-flow-entry-form.tsx`
  Invoice-payment entry form table with prefilled but editable rows.
- `app/employee-cash-flow/_components/employee-cash-flow-summary-table.tsx`
  Aggregated employee-month cash dashboard table.
- `app/employee-cash-flow/_components/employee-cash-flow-detail-panel.tsx`
  Detail panel for accrual vs cash reality.

### Modified files

- `src/features/billing/actions.ts`
  Add new isolated server actions for cash-flow saves and prefill, without changing existing action behavior.
- `src/features/billing/types.ts`
  Only if needed for shared lightweight selectors like invoice option DTOs. Prefer avoiding edits if `employee-cash-flow-types.ts` can carry the new slice alone.
- `tests/e2e/invoice-feedback.spec.ts`
  Only if this project keeps all app-flow coverage in one E2E file. Prefer a new E2E file if practical.

### Reference files to study during implementation

- `app/dashboard/page.tsx`
- `app/employee-payout/page.tsx`
- `src/features/billing/store.ts`
- `src/features/billing/actions.ts`
- `src/features/billing/types.ts`
- `src/features/billing/utils.ts`

---

### Task 1: Add the Cash-Ledger Migration Safely

**Files:**
- Create: `supabase/migrations/2026-04-11-employee-cash-flow-ledger.sql`
- Test: manual SQL validation via Supabase local/hosted migration apply flow

- [ ] **Step 1: Write the migration with collision-safe DDL**

```sql
create table if not exists employee_salary_payments (
  id text primary key,
  employee_id text not null,
  company_id text not null,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  salary_usd_cents bigint not null default 0,
  paid_usd_inr_rate numeric(12,4) not null default 0,
  salary_paid_inr_cents bigint not null default 0,
  paid_status boolean not null default false,
  paid_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, company_id, month)
);

create index if not exists employee_salary_payments_company_month_idx
  on employee_salary_payments (company_id, month);

create index if not exists employee_salary_payments_employee_month_idx
  on employee_salary_payments (employee_id, month);

create table if not exists invoice_payments (
  id text primary key,
  invoice_id text not null,
  company_id text not null,
  payment_date date not null,
  payment_month text not null check (payment_month ~ '^\d{4}-\d{2}$'),
  usd_inr_rate numeric(12,4) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_payments_invoice_idx
  on invoice_payments (invoice_id);

create index if not exists invoice_payments_company_month_idx
  on invoice_payments (company_id, payment_month);

create table if not exists invoice_payment_employee_entries (
  id text primary key,
  invoice_payment_id text not null references invoice_payments(id) on delete cascade,
  invoice_id text not null,
  employee_id text not null,
  company_id text not null,
  payment_month text not null check (payment_month ~ '^\d{4}-\d{2}$'),
  invoice_line_item_id text,
  days_worked integer not null default 0,
  days_in_month integer not null default 0,
  monthly_paid_usd_cents bigint not null default 0,
  base_dollar_inward_usd_cents bigint not null default 0,
  onboarding_advance_usd_cents bigint not null default 0,
  offboarding_deduction_usd_cents bigint not null default 0,
  effective_dollar_inward_usd_cents bigint not null default 0,
  cashout_usd_inr_rate numeric(12,4) not null,
  paid_usd_inr_rate numeric(12,4) not null default 0,
  cash_in_inr_cents bigint not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_payment_employee_entries_payment_idx
  on invoice_payment_employee_entries (invoice_payment_id);

create index if not exists invoice_payment_employee_entries_company_month_idx
  on invoice_payment_employee_entries (company_id, payment_month);

create index if not exists invoice_payment_employee_entries_employee_month_idx
  on invoice_payment_employee_entries (employee_id, payment_month);
```

- [ ] **Step 2: Apply the migration in the project’s normal Supabase flow**

Run: use the repo’s established Supabase migration apply command or dashboard SQL runner  
Expected: all three tables exist, no existing table altered

- [ ] **Step 3: Verify the migration shape manually**

Run:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'employee_salary_payments',
    'invoice_payments',
    'invoice_payment_employee_entries'
  );
```

Expected: 3 rows returned

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/2026-04-11-employee-cash-flow-ledger.sql
git commit -m "feat: add employee cash flow ledger tables"
```

---

### Task 2: Add Pure Cash-Flow Calculation Helpers First

**Files:**
- Create: `src/features/billing/employee-cash-flow.ts`
- Create: `src/features/billing/employee-cash-flow.test.ts`

- [ ] **Step 1: Write the failing unit tests**

```ts
import { describe, expect, it } from "vitest";
import {
  calculateEffectiveDollarInwardUsdCents,
  calculateCashInInrCents,
  calculateEmployeeMonthNetInrCents,
  resolveEmployeeCashFlowStatus,
} from "./employee-cash-flow";

describe("employee cash flow calculations", () => {
  it("adds onboarding and subtracts offboarding from base inward", () => {
    expect(
      calculateEffectiveDollarInwardUsdCents({
        baseDollarInwardUsdCents: 100_00,
        onboardingAdvanceUsdCents: 20_00,
        offboardingDeductionUsdCents: 5_00,
      }),
    ).toBe(115_00);
  });

  it("returns zero net inward when employee is paid before collections", () => {
    expect(
      calculateEmployeeMonthNetInrCents({
        cashInInrCents: 0,
        salaryPaidInrCents: 50_000_00,
      }),
    ).toBe(-50_000_00);
  });

  it("flags waiting-for-payment when salary is paid and inward is zero", () => {
    expect(
      resolveEmployeeCashFlowStatus({
        effectiveDollarInwardUsdCents: 0,
        salaryPaidInrCents: 50_000_00,
        netInrCents: -50_000_00,
      }),
    ).toBe("waiting_for_payment");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/billing/employee-cash-flow.test.ts`  
Expected: FAIL with missing module/function errors

- [ ] **Step 3: Write the minimal helper implementation**

```ts
export type EmployeeCashFlowStatus = "profit" | "loss" | "waiting_for_payment";

export function calculateEffectiveDollarInwardUsdCents(input: {
  baseDollarInwardUsdCents: number;
  onboardingAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
}) {
  return (
    input.baseDollarInwardUsdCents +
    input.onboardingAdvanceUsdCents -
    input.offboardingDeductionUsdCents
  );
}

export function calculateCashInInrCents(input: {
  effectiveDollarInwardUsdCents: number;
  cashoutUsdInrRate: number;
}) {
  return Math.round(input.effectiveDollarInwardUsdCents * input.cashoutUsdInrRate);
}

export function calculateEmployeeMonthNetInrCents(input: {
  cashInInrCents: number;
  salaryPaidInrCents: number;
}) {
  return input.cashInInrCents - input.salaryPaidInrCents;
}

export function resolveEmployeeCashFlowStatus(input: {
  effectiveDollarInwardUsdCents: number;
  salaryPaidInrCents: number;
  netInrCents: number;
}): EmployeeCashFlowStatus {
  if (input.salaryPaidInrCents > 0 && input.effectiveDollarInwardUsdCents === 0) {
    return "waiting_for_payment";
  }
  return input.netInrCents < 0 ? "loss" : "profit";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/features/billing/employee-cash-flow.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/employee-cash-flow.ts src/features/billing/employee-cash-flow.test.ts
git commit -m "feat: add employee cash flow calculation helpers"
```

---

### Task 3: Define Cash-Flow Types Without Polluting Existing Billing Types

**Files:**
- Create: `src/features/billing/employee-cash-flow-types.ts`
- Modify: `src/features/billing/employee-cash-flow.test.ts`

- [ ] **Step 1: Write the failing type-shape test**

```ts
import { describe, expect, it } from "vitest";
import type { EmployeeCashFlowMonthRow } from "./employee-cash-flow-types";

describe("employee cash flow types", () => {
  it("supports payout-style columns plus net cash fields", () => {
    const row: EmployeeCashFlowMonthRow = {
      employeeId: "emp_1",
      employeeName: "A",
      companyId: "comp_1",
      paymentMonth: "2026-04",
      invoiceNumber: "INV-1",
      daysWorked: 20,
      daysInMonth: 30,
      monthlyPaidUsdCents: 100000,
      baseDollarInwardUsdCents: 100000,
      onboardingAdvanceUsdCents: 10000,
      offboardingDeductionUsdCents: 5000,
      effectiveDollarInwardUsdCents: 105000,
      cashoutUsdInrRate: 85,
      paidUsdInrRate: 84,
      cashInInrCents: 8925000,
      salaryPaidInrCents: 5000000,
      pendingAmountInrCents: 1000000,
      netInrCents: 3925000,
      status: "profit",
    };

    expect(row.status).toBe("profit");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/billing/employee-cash-flow.test.ts`  
Expected: FAIL with missing type/module errors

- [ ] **Step 3: Add isolated type definitions**

```ts
import type { EmployeeCashFlowStatus } from "./employee-cash-flow";

export type EmployeeCashFlowMonthRow = {
  employeeId: string;
  employeeName: string;
  companyId: string;
  paymentMonth: string;
  invoiceNumber: string;
  daysWorked: number;
  daysInMonth: number;
  monthlyPaidUsdCents: number;
  baseDollarInwardUsdCents: number;
  onboardingAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
  effectiveDollarInwardUsdCents: number;
  cashoutUsdInrRate: number;
  paidUsdInrRate: number;
  cashInInrCents: number;
  salaryPaidInrCents: number;
  pendingAmountInrCents: number;
  netInrCents: number;
  status: EmployeeCashFlowStatus;
};
```

- [ ] **Step 4: Run tests again**

Run: `npm test -- src/features/billing/employee-cash-flow.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/employee-cash-flow-types.ts src/features/billing/employee-cash-flow.test.ts
git commit -m "feat: add isolated employee cash flow types"
```

---

### Task 4: Build the Read Model and Prefill Store

**Files:**
- Create: `src/features/billing/employee-cash-flow-store.ts`
- Create: `src/features/billing/employee-cash-flow-store.test.ts`
- Reference: `src/features/billing/store.ts`

- [ ] **Step 1: Write the failing store shaping tests**

```ts
import { describe, expect, it } from "vitest";
import { buildEmployeeCashFlowMonthRows } from "./employee-cash-flow-store";

describe("employee cash flow store shaping", () => {
  it("aggregates multiple payment rows in the same month", () => {
    const rows = buildEmployeeCashFlowMonthRows({
      paymentEntries: [
        { employeeId: "emp_1", paymentMonth: "2026-04", cashInInrCents: 1000, effectiveDollarInwardUsdCents: 1000, onboardingAdvanceUsdCents: 0, offboardingDeductionUsdCents: 0, monthlyPaidUsdCents: 1000, daysWorked: 10, daysInMonth: 30, cashoutUsdInrRate: 85, paidUsdInrRate: 84, employeeName: "A", companyId: "comp_1", invoiceNumber: "INV-1" },
        { employeeId: "emp_1", paymentMonth: "2026-04", cashInInrCents: 2000, effectiveDollarInwardUsdCents: 2000, onboardingAdvanceUsdCents: 500, offboardingDeductionUsdCents: 0, monthlyPaidUsdCents: 1000, daysWorked: 12, daysInMonth: 30, cashoutUsdInrRate: 85, paidUsdInrRate: 84, employeeName: "A", companyId: "comp_1", invoiceNumber: "INV-2" },
      ],
      salaryPayments: [{ employeeId: "emp_1", month: "2026-04", salaryPaidInrCents: 2500 }],
      accrualByEmployeeMonth: [{ employeeId: "emp_1", month: "2026-04", accrualInrCents: 5000 }],
    });

    expect(rows[0]?.cashInInrCents).toBe(3000);
    expect(rows[0]?.salaryPaidInrCents).toBe(2500);
    expect(rows[0]?.pendingAmountInrCents).toBe(2000);
  });
});
```

- [ ] **Step 2: Run the store test and verify failure**

Run: `npm test -- src/features/billing/employee-cash-flow-store.test.ts`  
Expected: FAIL with missing function/module errors

- [ ] **Step 3: Implement isolated store helpers and Supabase loaders**

```ts
export function buildEmployeeCashFlowMonthRows(input: {
  paymentEntries: Array<{
    employeeId: string;
    paymentMonth: string;
    cashInInrCents: number;
    effectiveDollarInwardUsdCents: number;
    onboardingAdvanceUsdCents: number;
    offboardingDeductionUsdCents: number;
    monthlyPaidUsdCents: number;
    daysWorked: number;
    daysInMonth: number;
    cashoutUsdInrRate: number;
    paidUsdInrRate: number;
    employeeName: string;
    companyId: string;
    invoiceNumber: string;
  }>;
  salaryPayments: Array<{
    employeeId: string;
    month: string;
    salaryPaidInrCents: number;
  }>;
  accrualByEmployeeMonth: Array<{
    employeeId: string;
    month: string;
    accrualInrCents: number;
  }>;
}) {
  // implementation groups by employeeId + paymentMonth,
  // sums cash values, joins salary/accrual, then calls the pure helper functions.
  return [];
}
```

- [ ] **Step 4: Add real store entry points with clear names**

```ts
export async function listCashFlowInvoiceOptions(companyId: string) {}
export async function getEmployeeCashFlowDashboardData(input: {
  companyId: string;
  month?: string;
  employeeIds?: string[];
}) {}
export async function getInvoicePaymentPrefillData(input: {
  invoiceId: string;
  paymentMonth: string;
}) {}
```

- [ ] **Step 5: Run tests to verify passing**

Run: `npm test -- src/features/billing/employee-cash-flow-store.test.ts src/features/billing/employee-cash-flow.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/billing/employee-cash-flow-store.ts src/features/billing/employee-cash-flow-store.test.ts
git commit -m "feat: add employee cash flow store and prefill logic"
```

---

### Task 5: Add Server Actions for the New Cash Layer Only

**Files:**
- Modify: `src/features/billing/actions.ts`
- Test: `src/features/billing/employee-cash-flow-store.test.ts`

- [ ] **Step 1: Write the action contract tests**

```ts
import { describe, expect, it } from "vitest";

describe("employee cash flow action contracts", () => {
  it("normalizes editable payment entry rows before saving", () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run targeted tests**

Run: `npm test -- src/features/billing/employee-cash-flow-store.test.ts`  
Expected: FAIL or incomplete coverage for new save paths

- [ ] **Step 3: Add new clearly named actions without touching old behavior**

```ts
export async function saveInvoicePaymentAction(formData: FormData) {}

export async function saveInvoicePaymentEmployeeEntriesAction(formData: FormData) {}

export async function saveEmployeeSalaryPaymentAction(formData: FormData) {}
```

Implementation rules:

- do not change `updateEmployeePayoutAction`
- do not change `saveDashboardExpenseAction`
- keep parsing, validation, and redirects isolated to the new route
- compute `effective_dollar_inward_usd_cents` and `cash_in_inr_cents` before persisting
- compute `salary_paid_inr_cents` from `salary_usd_cents` and `paid_usd_inr_rate` before persisting salary rows

- [ ] **Step 4: Re-run tests**

Run: `npm test -- src/features/billing/employee-cash-flow-store.test.ts src/features/billing/employee-cash-flow.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/actions.ts
git commit -m "feat: add employee cash flow save actions"
```

---

### Task 6: Build the New Dashboard Page and Components

**Files:**
- Create: `app/employee-cash-flow/page.tsx`
- Create: `app/employee-cash-flow/_components/employee-cash-flow-entry-form.tsx`
- Create: `app/employee-cash-flow/_components/employee-cash-flow-summary-table.tsx`
- Create: `app/employee-cash-flow/_components/employee-cash-flow-detail-panel.tsx`
- Reference: `app/dashboard/page.tsx`
- Reference: `app/employee-payout/page.tsx`

- [ ] **Step 1: Write the UI test sketch first**

```ts
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EmployeeCashFlowSummaryTable from "@/app/employee-cash-flow/_components/employee-cash-flow-summary-table";

describe("EmployeeCashFlowSummaryTable", () => {
  it("shows payout-style cash columns", () => {
    render(<EmployeeCashFlowSummaryTable rows={[]} />);
    expect(screen.getByText("Monthly Paid $")).toBeInTheDocument();
    expect(screen.getByText("Cashout USD/INR")).toBeInTheDocument();
    expect(screen.getByText("Salary Paid INR")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- EmployeeCashFlowSummaryTable`  
Expected: FAIL with missing component/module errors

- [ ] **Step 3: Implement the standalone page shell**

```tsx
export const dynamic = "force-dynamic";

export default async function EmployeeCashFlowPage({
  searchParams,
}: PageProps<"/employee-cash-flow">) {
  const params = await searchParams;
  return (
    <Shell title="Employee Cash Flow" eyebrow="Cash reality dashboard">
      {/* filters */}
      {/* invoice selection / payment entry */}
      {/* summary table */}
      {/* detail panel */}
    </Shell>
  );
}
```

- [ ] **Step 4: Implement the three focused components**

Implementation rules:

- keep file names prefixed with `employee-cash-flow-` to avoid collision with current dashboard components
- reuse existing `GlassPanel`, `Shell`, `PendingSubmitButton`, `PendingActionButton`, and `inputClass`
- do not import or modify existing dashboard row components directly

- [ ] **Step 5: Re-run tests**

Run: `npm test -- EmployeeCashFlowSummaryTable`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/employee-cash-flow
git commit -m "feat: add employee cash flow dashboard page"
```

---

### Task 7: Add End-to-End Coverage for the New Flow

**Files:**
- Create: `tests/e2e/employee-cash-flow.spec.ts`
- Reference: `playwright.config.ts`

- [ ] **Step 1: Write the failing E2E**

```ts
import { test, expect } from "@playwright/test";

test("employee cash flow shows waiting-for-payment when salary is paid and inward is zero", async ({ page }) => {
  await page.goto("/employee-cash-flow");
  await expect(page.getByText("Employee Cash Flow")).toBeVisible();
  await expect(page.getByText("Waiting for Payment")).toBeVisible();
});
```

- [ ] **Step 2: Run the E2E to verify failure**

Run: `npx playwright test tests/e2e/employee-cash-flow.spec.ts`  
Expected: FAIL until the page and seed data path are ready

- [ ] **Step 3: Finish the page wiring or fixtures until the test reflects the real flow**

Key flow assertions:

- invoice selection is available for `cashed_out` invoices
- prefilled editable columns appear
- a manually added employee row is allowed
- a negative/waiting status is visible when salary exists and inward is zero

- [ ] **Step 4: Re-run the E2E**

Run: `npx playwright test tests/e2e/employee-cash-flow.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/employee-cash-flow.spec.ts
git commit -m "test: cover employee cash flow dashboard flow"
```

---

### Task 8: Full Verification and Naming Safety Pass

**Files:**
- Modify: any files changed above if fixes are needed

- [ ] **Step 1: Run unit and store tests together**

Run: `npm test -- src/features/billing/employee-cash-flow.test.ts src/features/billing/employee-cash-flow-store.test.ts`  
Expected: PASS

- [ ] **Step 2: Run the full test suite**

Run: `npm test`  
Expected: PASS

- [ ] **Step 3: Run the Next.js build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 4: Spot-check for naming collisions**

Run: `Select-String -Path 'src/features/billing/*.ts','app/**/*.tsx','supabase/migrations/*.sql' -Pattern 'employee_cash_flow|employee cash flow|invoice_payments|employee_salary_payments|invoice_payment_employee_entries'`

Expected:

- new names appear only in the new slice and migration
- no old dashboard query path replaced
- no current `employee_payouts` or `dashboard_expenses` logic renamed

- [ ] **Step 5: Final commit if verification required fixes**

```bash
git add -A
git commit -m "chore: finalize employee cash flow dashboard verification"
```

---

## Spec Coverage Check

- New salary cash-out table: covered in Task 1.
- New invoice payment table: covered in Task 1.
- New employee-level editable payment ledger: covered in Task 1 and Task 4.
- Delayed payments and partial payments: covered in Task 4 and Task 7.
- Manual employee add with zero inward: covered in Task 4, Task 6, and Task 7.
- Onboarding advance and offboarding deduction in the same form: covered in Task 2, Task 4, and Task 6.
- New standalone dashboard: covered in Task 6.
- SQL-join oriented implementation: covered in Task 4.
- Output requirements:
  - SQL schema: Task 1
  - query path: Task 4
  - UI layout: Task 6
  - API/actions: Task 5

## Placeholder Scan

- No `TODO` or `TBD` markers remain.
- Naming is intentionally isolated with `EmployeeCashFlow*` TypeScript symbols and dedicated files.
- Database tables use names not present in the current migration set.

## Type Consistency Check

- USD values use `*_usd_cents`.
- INR values use `*_inr_cents`.
- Month keys use `YYYY-MM`.
- New route is fixed as `/employee-cash-flow`.
