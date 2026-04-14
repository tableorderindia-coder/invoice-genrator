# Dashboard Employee Merge-by-Month Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge dashboard Employee rows by employee + month, summing values across multiple cash-flow entries.

**Architecture:** Aggregate `PnEditableSourceRow` records in `buildPnEmployeeEditableSections` by employee and month before mapping them into editable rows. Raw cash-flow entries remain unchanged.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Add failing test for employee-month merge

**Files:**
- Modify: `src/features/billing/pn-dashboard.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test after the existing editable-section tests:

```ts
it("merges editable rows by employee and month", () => {
  const sections = buildPnEmployeeEditableSections([
    {
      ...editableSampleRows[0],
      rowId: "cash_a",
      month: 1,
      daysWorked: 10,
      baseDollarInwardUsdCents: 50000,
      onboardingAdvanceUsdCents: 10000,
      reimbursementUsdCents: 2000,
      reimbursementLabelsText: "Laptop",
      appraisalAdvanceUsdCents: 0,
      offboardingDeductionUsdCents: 0,
      effectiveDollarInwardUsdCents: 62000,
      cashInInrCents: 5200000,
      employeeMonthlyUsdCents: 70000,
      cashoutUsdInrRate: 83.2,
      paidUsdInrRate: 82.1,
      pfInrCents: 10000,
      tdsInrCents: 5000,
      actualPaidInrCents: 300000,
      fxCommissionInrCents: 20000,
      totalCommissionUsdCents: 15000,
      commissionEarnedInrCents: 60000,
      grossEarningsInrCents: 80000,
      netProfitInrCents: 4900000,
      invoiceNumber: "INV-001",
    },
    {
      ...editableSampleRows[0],
      rowId: "cash_b",
      month: 1,
      daysWorked: 15,
      baseDollarInwardUsdCents: 40000,
      onboardingAdvanceUsdCents: 0,
      reimbursementUsdCents: 3000,
      reimbursementLabelsText: "Bonus",
      appraisalAdvanceUsdCents: 1000,
      offboardingDeductionUsdCents: 0,
      effectiveDollarInwardUsdCents: 44000,
      cashInInrCents: 3650000,
      employeeMonthlyUsdCents: 70000,
      cashoutUsdInrRate: 83.2,
      paidUsdInrRate: 82.1,
      pfInrCents: 12000,
      tdsInrCents: 8000,
      actualPaidInrCents: 200000,
      fxCommissionInrCents: 15000,
      totalCommissionUsdCents: 10000,
      commissionEarnedInrCents: 40000,
      grossEarningsInrCents: 55000,
      netProfitInrCents: 3450000,
      invoiceNumber: "INV-002",
    },
  ]);

  expect(sections).toHaveLength(1);
  expect(sections[0]?.rows).toHaveLength(1);
  expect(sections[0]?.rows[0]).toMatchObject({
    month: 1,
    daysWorked: 25,
    baseDollarInwardUsdCents: 90000,
    reimbursementUsdCents: 5000,
    appraisalAdvanceUsdCents: 1000,
    cashInInrCents: 8850000,
    actualPaidInrCents: 500000,
    pfInrCents: 22000,
    tdsInrCents: 13000,
    totalCommissionUsdCents: 25000,
    commissionEarnedInrCents: 100000,
    grossEarningsInrCents: 135000,
  });
  expect(sections[0]?.rows[0]?.invoiceNumber).toBe("INV-001, INV-002");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/billing/pn-dashboard.test.ts`
Expected: FAIL (rows length should be 1 but will be 2).

---

### Task 2: Implement employee-month merge in dashboard editable rows

**Files:**
- Modify: `src/features/billing/pn-dashboard.ts`

- [ ] **Step 1: Add helper to merge rows**

Add a reducer that groups by `employeeId + month` and sums numeric fields, while:
- concatenating unique reimbursement labels
- joining unique invoice numbers
- selecting `cashoutUsdInrRate`, `paidUsdInrRate`, and `daysInMonth` from the last row in the group

Sketch:

```ts
const mergeEditableRowsByMonth = (rows: PnEditableSourceRow[]) => {
  const grouped = new Map<string, PnEditableSourceRow[]>();
  for (const row of rows) {
    const key = `${row.employeeId}:${row.year}-${row.month}`;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  return [...grouped.values()].map((bucket) => {
    const last = bucket[bucket.length - 1];
    const labels = new Set<string>();
    const invoiceNumbers = new Set<string>();
    for (const row of bucket) {
      row.reimbursementLabelsText
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean)
        .forEach((label) => labels.add(label));
      invoiceNumbers.add(row.invoiceNumber);
    }

    return {
      ...last,
      rowId: last.rowId,
      invoiceNumber: [...invoiceNumbers].sort().join(", "),
      daysWorked: sumBy(bucket, "daysWorked"),
      daysInMonth: last.daysInMonth,
      baseDollarInwardUsdCents: sumBy(bucket, "baseDollarInwardUsdCents"),
      onboardingAdvanceUsdCents: sumBy(bucket, "onboardingAdvanceUsdCents"),
      reimbursementUsdCents: sumBy(bucket, "reimbursementUsdCents"),
      reimbursementLabelsText: [...labels].join(", "),
      appraisalAdvanceUsdCents: sumBy(bucket, "appraisalAdvanceUsdCents"),
      offboardingDeductionUsdCents: sumBy(bucket, "offboardingDeductionUsdCents"),
      effectiveDollarInwardUsdCents: sumBy(bucket, "effectiveDollarInwardUsdCents"),
      cashInInrCents: sumBy(bucket, "cashInInrCents"),
      employeeMonthlyUsdCents: sumBy(bucket, "employeeMonthlyUsdCents"),
      cashoutUsdInrRate: last.cashoutUsdInrRate,
      paidUsdInrRate: last.paidUsdInrRate,
      salaryPaidInrCents: sumBy(bucket, "salaryPaidInrCents"),
      pfInrCents: sumBy(bucket, "pfInrCents"),
      tdsInrCents: sumBy(bucket, "tdsInrCents"),
      actualPaidInrCents: sumBy(bucket, "actualPaidInrCents"),
      fxCommissionInrCents: sumBy(bucket, "fxCommissionInrCents"),
      totalCommissionUsdCents: sumBy(bucket, "totalCommissionUsdCents"),
      commissionEarnedInrCents: sumBy(bucket, "commissionEarnedInrCents"),
      grossEarningsInrCents: sumBy(bucket, "grossEarningsInrCents"),
      netProfitInrCents: sumBy(bucket, "netProfitInrCents"),
    };
  });
};
```

- [ ] **Step 2: Use merged rows in buildPnEmployeeEditableSections**

Call the helper at the top of `buildPnEmployeeEditableSections` and iterate over the merged rows instead of the raw input rows.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/billing/pn-dashboard.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/billing/pn-dashboard.ts src/features/billing/pn-dashboard.test.ts
git commit -m "fix: merge dashboard employee rows by month"
```

---

### Task 3: Verify and push

**Files:**
- None

- [ ] **Step 1: Run focused tests**

Run: `npx vitest run src/features/billing/pn-dashboard.test.ts`
Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS (existing warnings unchanged).

- [ ] **Step 3: Push**

```bash
git push origin main
```
