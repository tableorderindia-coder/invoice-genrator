# Employee-Linked Reimbursements And Appraisal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add employee-linked reimbursements and appraisal advances to invoice adjustments, then flow them through Employee Cash Flow and dashboard P/L while preserving company-level reimbursements.

**Architecture:** Extend the existing adjustment payload/model so reimbursement can optionally target an employee and appraisal is treated as an employee-linked positive adjustment. Then update the cash-flow shaping and dashboard aggregation layers to carry reimbursement/appraisal USD and INR columns separately while including them in effective inward and net P/L.

**Tech Stack:** Next.js App Router, Server Actions, TypeScript, Supabase, Vitest, Playwright

---

### Task 1: Extend adjustment parsing and validation rules

**Files:**
- Modify: `src/features/billing/adjustments.ts`
- Modify: `src/features/billing/adjustments.test.ts`

- [ ] **Step 1: Write the failing adjustment tests**

```ts
it("allows reimbursement payloads with an optional employee", () => {
  expect(
    buildInvoiceAdjustmentPayload({
      type: "reimbursement",
      label: "Laptop",
      employeeName: "Darshan Tukaram Bandache",
      amountUsdCents: 1_200_00,
    }),
  ).toMatchObject({
    type: "reimbursement",
    label: "Laptop",
    employeeName: "Darshan Tukaram Bandache",
    amountUsdCents: 1_200_00,
  });
});

it("requires an employee for appraisal advance", () => {
  expect(() =>
    buildInvoiceAdjustmentPayload({
      type: "appraisal",
      employeeName: "",
      rateUsdCents: 25_00,
      hrsPerWeek: 40,
      daysWorked: 30,
      amountUsdCents: 1_000_00,
    }),
  ).toThrow("Select an employee before adding appraisal advance.");
});
```

- [ ] **Step 2: Run the failing adjustment tests**

Run: `npx vitest run src/features/billing/adjustments.test.ts`
Expected: FAIL because reimbursement/appraisal payload rules do not yet match the new behavior.

- [ ] **Step 3: Implement the minimal adjustment rule changes**

```ts
if (input.type === "reimbursement") {
  const label = input.label.trim();
  if (!label) {
    throw new Error("Enter a reimbursement or expense label.");
  }

  return {
    type: "reimbursement" as const,
    label,
    employeeName: input.employeeName?.trim() || undefined,
    amountUsdCents: input.amountUsdCents,
    rateUsdCents: input.rateUsdCents ?? 0,
    hrsPerWeek: input.hrsPerWeek ?? 0,
    daysWorked: input.daysWorked ?? 0,
  };
}

if (input.type === "appraisal") {
  const employeeName = input.employeeName?.trim() || "";
  if (!employeeName) {
    throw new Error("Select an employee before adding appraisal advance.");
  }
}
```

- [ ] **Step 4: Re-run the adjustment tests**

Run: `npx vitest run src/features/billing/adjustments.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/adjustments.ts src/features/billing/adjustments.test.ts
git commit -m "feat: support employee-linked reimbursement payloads"
```

### Task 2: Carry reimbursement and appraisal fields through cash-flow shaping

**Files:**
- Modify: `src/features/billing/types.ts`
- Modify: `src/features/billing/employee-cash-flow.ts`
- Modify: `src/features/billing/employee-cash-flow-store.ts`
- Modify: `src/features/billing/employee-cash-flow-store.test.ts`
- Modify: `src/features/billing/employee-cash-flow-page-state.ts`
- Modify: `src/features/billing/employee-cash-flow-page-state.test.ts`

- [ ] **Step 1: Write the failing cash-flow tests**

```ts
it("adds employee-linked reimbursement and appraisal into effective inward", () => {
  const rows = buildEmployeeCashFlowMonthRows({
    paymentEntries: [
      {
        employeeId: "emp_1",
        paymentMonth: "2026-04",
        cashInInrCents: 0,
        effectiveDollarInwardUsdCents: 2_500_00,
        baseDollarInwardUsdCents: 0,
        onboardingAdvanceUsdCents: 500_00,
        reimbursementUsdCents: 1_000_00,
        appraisalAdvanceUsdCents: 1_000_00,
        offboardingDeductionUsdCents: 0,
        reimbursementLabels: ["Laptop"],
        monthlyPaidUsdCents: 1_000_00,
        daysWorked: 0,
        daysInMonth: 30,
        cashoutUsdInrRate: 85,
        paidUsdInrRate: 84,
        employeeName: "A",
        companyId: "comp_1",
        invoiceNumber: "INV-1",
      },
    ],
    salaryPayments: [],
    accrualByEmployeeMonth: [],
  });

  expect(rows[0]).toMatchObject({
    reimbursementUsdCents: 1_000_00,
    appraisalAdvanceUsdCents: 1_000_00,
    effectiveDollarInwardUsdCents: 2_500_00,
  });
});

it("keeps company-level reimbursements out of employee rows", () => {
  expect(
    appendMissingAdjustmentEntries({
      entries: [],
      availableEmployees: [],
      companyLevelReimbursementUsdCents: 500_00,
      paymentMonth: "2026-04",
      daysInMonth: 30,
      cashoutUsdInrRate: 84.5,
    }),
  ).toEqual([]);
});
```

- [ ] **Step 2: Run the failing cash-flow tests**

Run: `npx vitest run src/features/billing/employee-cash-flow-store.test.ts src/features/billing/employee-cash-flow-page-state.test.ts`
Expected: FAIL because reimbursement/appraisal fields are not yet part of the shaping logic.

- [ ] **Step 3: Implement the minimal cash-flow changes**

```ts
type EmployeeAdjustmentTotals = {
  onboardingAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
  reimbursementUsdCents: number;
  appraisalAdvanceUsdCents: number;
  reimbursementLabels: string[];
};

const effectiveDollarInwardUsdCents =
  baseDollarInwardUsdCents +
  onboardingAdvanceUsdCents +
  reimbursementUsdCents +
  appraisalAdvanceUsdCents -
  offboardingDeductionUsdCents;
```

```ts
availableEmployees.push({
  ...employee,
  onboardingAdvanceUsdCents,
  offboardingDeductionUsdCents,
  reimbursementUsdCents,
  appraisalAdvanceUsdCents,
  reimbursementLabels,
});
```

- [ ] **Step 4: Re-run the cash-flow tests**

Run: `npx vitest run src/features/billing/employee-cash-flow-store.test.ts src/features/billing/employee-cash-flow-page-state.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/types.ts src/features/billing/employee-cash-flow.ts src/features/billing/employee-cash-flow-store.ts src/features/billing/employee-cash-flow-store.test.ts src/features/billing/employee-cash-flow-page-state.ts src/features/billing/employee-cash-flow-page-state.test.ts
git commit -m "feat: carry reimbursement and appraisal through cash flow"
```

### Task 3: Extend dashboard rows and P/L calculations

**Files:**
- Modify: `src/features/billing/pn-dashboard.ts`
- Modify: `src/features/billing/pn-dashboard.test.ts`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Write the failing dashboard tests**

```ts
it("includes reimbursement and appraisal INR in employee net profit", () => {
  const sections = buildPnEmployeeEditableSections([
    {
      employeeId: "emp_1",
      employeeName: "A",
      reimbursementUsdCents: 500_00,
      appraisalAdvanceUsdCents: 250_00,
      cashoutUsdInrRate: 84,
      netProfitInrCents: 0,
    },
  ]);

  expect(sections[0]?.rows[0]).toMatchObject({
    reimbursementInrCents: 4_200_000,
    appraisalAdvanceInrCents: 2_100_000,
  });
});

it("includes company-level reimbursement and appraisal in period net p/l", () => {
  const rows = buildPnPeriodRows({
    sourceRows: [
      {
        year: 2026,
        month: 4,
        reimbursementUsdCents: 500_00,
        appraisalAdvanceUsdCents: 250_00,
        reimbursementInrCents: 4_200_000,
        appraisalAdvanceInrCents: 2_100_000,
      },
    ],
    periodType: "monthly",
    expensesByPeriod: new Map(),
    companyLevelReimbursementsByPeriod: new Map([["2026-04", 1_000_000]]),
  });

  expect(rows[0]?.netPlInrCents).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the failing dashboard tests**

Run: `npx vitest run src/features/billing/pn-dashboard.test.ts`
Expected: FAIL because the new reimbursement/appraisal fields are not yet modeled in dashboard aggregation.

- [ ] **Step 3: Implement the minimal dashboard changes**

```ts
const reimbursementInrCents = Math.round((row.reimbursementUsdCents / 100) * row.cashoutUsdInrRate * 100);
const appraisalAdvanceInrCents = Math.round((row.appraisalAdvanceUsdCents / 100) * row.cashoutUsdInrRate * 100);

const netProfitInrCents =
  row.cashInInrCents +
  reimbursementInrCents +
  appraisalAdvanceInrCents -
  row.salaryPaidInrCents -
  row.pfInrCents -
  row.tdsInrCents;
```

```tsx
<th>Reimbursements / Expenses (USD)</th>
<th>Reimbursements / Expenses (INR)</th>
<th>Appraisal Advance (USD)</th>
<th>Appraisal Advance (INR)</th>
```

- [ ] **Step 4: Re-run the dashboard tests**

Run: `npx vitest run src/features/billing/pn-dashboard.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/pn-dashboard.ts src/features/billing/pn-dashboard.test.ts app/dashboard/page.tsx
git commit -m "feat: show reimbursement and appraisal in dashboard"
```

### Task 4: Update invoice editor reimbursement/appraisal UI

**Files:**
- Modify: `app/invoices/drafts/[id]/adjustment-forms.tsx`
- Modify: `src/features/billing/actions.ts`
- Modify: `src/features/billing/store.ts`
- Modify: `tests/e2e/invoice-feedback.spec.ts`

- [ ] **Step 1: Write the failing E2E assertions**

```ts
await page.locator('select[name="type"]').selectOption("reimbursement");
await expect(page.getByLabel("Employee")).toBeVisible();
await page.getByLabel("Employee").selectOption({ label: employeeName });
await page.getByLabel("Type / Label").fill("Laptop");
await page.getByLabel("Total").fill("1200");
await page.getByRole("button", { name: "Add / Update" }).click();
await expect(page.getByText(`${employeeName} · Laptop · $1200`)).toBeVisible();

await page.locator('select[name="type"]').selectOption("appraisal");
await expect(page.getByLabel("Employee")).toBeVisible();
```

- [ ] **Step 2: Run the failing E2E test**

Run: `npx playwright test tests/e2e/invoice-feedback.spec.ts`
Expected: FAIL because reimbursement/appraisal employee selection is not fully wired in the UI.

- [ ] **Step 3: Implement the minimal UI and action/store changes**

```tsx
{selectedType === "reimbursement" ? (
  <>
    <SelectField name="employeeName" label="Employee" required={false} />
    <TextField name="label" label="Type / Label" />
    <CurrencyField name="amountUsd" label="Total" />
  </>
) : null}

{selectedType === "appraisal" ? (
  <>
    <SelectField name="employeeName" label="Employee" required />
    <CurrencyField name="amountUsd" label="Total" />
  </>
) : null}
```

```ts
const payload =
  type === "reimbursement"
    ? buildInvoiceAdjustmentPayload({
        type,
        employeeName: getString(formData, "employeeName"),
        label: getString(formData, "label"),
        amountUsdCents: wholeUsdCentsFromInput(getString(formData, "amountUsd")),
      })
    : buildInvoiceAdjustmentPayload({
        type,
        employeeName: getString(formData, "employeeName"),
        rateUsdCents: centsFromUsd(getString(formData, "rateUsd")),
        hrsPerWeek: Number.parseFloat(getString(formData, "hrsPerWeek") || "0"),
        daysWorked: Number.parseInt(getString(formData, "daysWorked") || "0", 10),
        amountUsdCents: wholeUsdCentsFromInput(getString(formData, "amountUsd")),
      });
```

- [ ] **Step 4: Re-run the E2E test**

Run: `npx playwright test tests/e2e/invoice-feedback.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/invoices/drafts/[id]/adjustment-forms.tsx src/features/billing/actions.ts src/features/billing/store.ts tests/e2e/invoice-feedback.spec.ts
git commit -m "feat: add employee-linked reimbursement inputs"
```

### Task 5: Run focused verification, push, and then clean the database if connected

**Files:**
- Modify: none

- [ ] **Step 1: Run focused unit coverage**

Run: `npx vitest run src/features/billing/adjustments.test.ts src/features/billing/employee-cash-flow-store.test.ts src/features/billing/employee-cash-flow-page-state.test.ts src/features/billing/pn-dashboard.test.ts src/features/billing/invoice-editor.test.ts`
Expected: PASS

- [ ] **Step 2: Run the invoice draft E2E flow**

Run: `npx playwright test tests/e2e/invoice-feedback.spec.ts`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS, or only the existing known warning for `_invoiceNumbers` in `src/features/billing/employee-cash-flow-store.ts`

- [ ] **Step 4: Push to `main`**

```bash
git push origin main
```

- [ ] **Step 5: Verify whether Supabase deletion is executable from this workspace**

```bash
Get-ChildItem supabase
Get-Content .env.local
Select-String -Path .env* -Pattern "SUPABASE|DATABASE_URL"
```

Expected: Either the project is linked/configured enough to perform the deletion safely, or there is not enough connection information and the deletion must stop.

- [ ] **Step 6: If connected, delete all companies except `The Arena Platform, Inc.` and dependent rows**

```sql
delete from companies
where name <> 'The Arena Platform, Inc.';
```

Expected: Only `The Arena Platform, Inc.` remains, with all other company data removed through direct deletes or cascading foreign keys.
