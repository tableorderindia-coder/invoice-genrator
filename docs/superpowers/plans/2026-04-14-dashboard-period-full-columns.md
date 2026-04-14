# Dashboard Period Full Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Monthly/Yearly dashboard tables to show the full cash‑flow column set and aggregate by fiscal year (Apr–Mar) for yearly rows.

**Architecture:** Extend period aggregation in `pn-dashboard.ts` to compute all required columns from cash‑flow rows and company expenses, then update the dashboard UI to render the expanded column set. Fiscal year grouping is computed in the aggregation layer.

**Tech Stack:** TypeScript, Vitest, Next.js App Router

---

### Task 1: Add failing tests for fiscal-year grouping and full period fields

**Files:**
- Modify: `src/features/billing/pn-dashboard.test.ts`

- [ ] **Step 1: Write failing tests**

Add a test that groups Apr–Mar into a fiscal year and expects the label bucket key:

```ts
it("groups yearly rows into Apr–Mar fiscal years", () => {
  const rows: PnSourceRow[] = [
    { ...sampleRows[0], year: 2025, month: 4, cashInInrCents: 1000, netProfitInrCents: 1000 },
    { ...sampleRows[0], year: 2026, month: 3, cashInInrCents: 2000, netProfitInrCents: 2000 },
  ];
  const yearly = buildPnPeriodRows({
    rows,
    periodType: "yearly",
    expenseByKey: new Map([["2025-2026", 0]]),
    companyLevelReimbursementUsdByKey: new Map(),
  });
  expect(yearly).toHaveLength(1);
  expect(yearly[0]).toMatchObject({
    year: 2025,
    fiscalLabel: "Apr 2025–Mar 2026",
    cashInInrCents: 3000,
  });
});
```

Add a test that ensures the period row exposes all new fields (use existing sample rows to assert non‑zero values):

```ts
it("builds period rows with full cash-flow columns", () => {
  const monthly = buildPnPeriodRows({
    rows: sampleRows,
    periodType: "monthly",
    expenseByKey: new Map(),
    companyLevelReimbursementUsdByKey: new Map(),
  });
  expect(monthly[0]).toMatchObject({
    dollarInwardUsdCents: expect.any(Number),
    onboardingAdvanceUsdCents: expect.any(Number),
    reimbursementUsdCents: expect.any(Number),
    reimbursementLabelsText: expect.any(String),
    reimbursementInrCents: expect.any(Number),
    appraisalAdvanceUsdCents: expect.any(Number),
    appraisalAdvanceInrCents: expect.any(Number),
    offboardingDeductionUsdCents: expect.any(Number),
    effectiveDollarInwardUsdCents: expect.any(Number),
    cashoutUsdInrRate: expect.any(Number),
    cashInInrCents: expect.any(Number),
    employeeMonthlyUsdCents: expect.any(Number),
    paidUsdInrRate: expect.any(Number),
    monthlyPaidInrCents: expect.any(Number),
    actualPaidInrCents: expect.any(Number),
    pfInrCents: expect.any(Number),
    tdsInrCents: expect.any(Number),
    salaryPaidInrCents: expect.any(Number),
    fxCommissionInrCents: expect.any(Number),
    totalCommissionUsdCents: expect.any(Number),
    commissionEarnedInrCents: expect.any(Number),
    grossEarningsInrCents: expect.any(Number),
    expensesInrCents: expect.any(Number),
    netPlInrCents: expect.any(Number),
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/billing/pn-dashboard.test.ts`  
Expected: FAIL (missing fields and fiscal grouping).

---

### Task 2: Extend period aggregation for full columns + fiscal years

**Files:**
- Modify: `src/features/billing/pn-dashboard.ts`

- [ ] **Step 1: Add fiscal-year helper**

Add a helper to compute a fiscal-year key and label:

```ts
const fiscalYearKey = (year: number, month: number) =>
  month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

const fiscalYearLabel = (year: number, month: number) => {
  const startYear = month >= 4 ? year : year - 1;
  return `Apr ${startYear}–Mar ${startYear + 1}`;
};
```

- [ ] **Step 2: Extend PnPeriodRow**

Add fields to `PnPeriodRow`:
- onboardingAdvanceUsdCents
- reimbursementLabelsText
- offboardingDeductionUsdCents
- effectiveDollarInwardUsdCents
- cashInInrCents
- employeeMonthlyUsdCents
- paidUsdInrRate
- monthlyPaidInrCents
- salaryPaidInrCents
- fiscalLabel (only for yearly rows)

- [ ] **Step 3: Aggregate monthly/yearly buckets**

Inside `buildPnPeriodRows`, group by:
- monthly: `YYYY-MM`
- yearly: `fiscalYearKey(year, month)`

Compute sums for all numeric fields and unique label joins for reimbursement labels.  
For rates (`cashoutUsdInrRate`, `paidUsdInrRate`) use average of positive values.  
Monthly paid INR = `employeeMonthlyUsdCents * paidUsdInrRate`.  
Salary paid = `actualPaidInrCents - pfInrCents - tdsInrCents`.  
Net profit logic unchanged.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/billing/pn-dashboard.test.ts`  
Expected: PASS.

---

### Task 3: Update Monthly/Yearly dashboard UI

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Update table headers and rows**

Replace the Monthly/Yearly table columns with the full list from the spec.  
Use the same formatting helpers as the Employee tab (`formatUsd`, `formatInr`, `formatSignedInr`).

- [ ] **Step 2: Add fiscal-year label**

When `periodType === "yearly"`, render the `fiscalLabel` column instead of month name.

- [ ] **Step 3: Preserve Expenses save**

Keep the existing inline expense input and save button, but place it under the `Expenses (INR)` column.

- [ ] **Step 4: Run lint + tests**

Run: `npm run lint`  
Run: `npx vitest run src/features/billing/pn-dashboard.test.ts`

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/page.tsx src/features/billing/pn-dashboard.ts src/features/billing/pn-dashboard.test.ts
git commit -m "feat: expand dashboard period columns and fiscal years"
```

---

### Task 4: Verify and push

- [ ] **Step 1: Run focused tests**

Run: `npx vitest run src/features/billing/pn-dashboard.test.ts`

- [ ] **Step 2: Run lint**

Run: `npm run lint`

- [ ] **Step 3: Push**

```bash
git push origin main
```
