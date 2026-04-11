# Dashboard Employee Cash Flow Full Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the `/dashboard` employee view to show the full employee cash-flow column set, signed monthly net profit, and a per-employee total net profit footer while removing the invoice number column.

**Architecture:** Keep the dashboard page as a rendering layer and compute the widened cash-flow row model inside the existing dashboard aggregation helpers. Reuse existing cash-flow domain formulas so dashboard display values stay consistent with `/employee-cash-flow` and the dashboard update action continues to edit only the currently editable fields.

**Tech Stack:** Next.js App Router, TypeScript, Supabase-backed billing stores, Vitest, ESLint

---

### Task 1: Extend dashboard row models

**Files:**
- Modify: `src/features/billing/pn-dashboard.ts`
- Modify: `src/features/billing/store.ts`
- Test: `src/features/billing/pn-dashboard.test.ts`

- [ ] **Step 1: Write the failing aggregation test**

```ts
it("builds editable dashboard rows with cash-flow display fields and employee net totals", () => {
  const sections = buildPnEmployeeEditableSections([
    {
      rowId: "cash_1",
      invoiceId: "inv_1",
      invoiceNumber: "INV-001",
      employeeId: "emp_1",
      employeeName: "Asha",
      year: 2026,
      month: 4,
      daysWorked: 31,
      daysInMonth: 30,
      baseDollarInwardUsdCents: 100000,
      onboardingAdvanceUsdCents: 20000,
      offboardingDeductionUsdCents: 5000,
      effectiveDollarInwardUsdCents: 115000,
      cashInInrCents: 9568000,
      employeeMonthlyUsdCents: 70000,
      cashoutUsdInrRate: 83.2,
      paidUsdInrRate: 82.1,
      salaryPaidInrCents: 5747000,
      pfInrCents: 120000,
      tdsInrCents: 60000,
      actualPaidInrCents: 550000,
      fxCommissionInrCents: 50000,
      totalCommissionUsdCents: 45000,
      commissionEarnedInrCents: 140000,
      grossEarningsInrCents: 190000,
      netProfitInrCents: 3821000,
    },
  ]);

  expect(sections[0]?.rows[0]).toMatchObject({
    onboardingAdvanceUsdCents: 20000,
    offboardingDeductionUsdCents: 5000,
    effectiveDollarInwardUsdCents: 115000,
    cashInInrCents: 9568000,
    salaryPaidInrCents: 5747000,
    netProfitInrCents: 3821000,
  });
  expect(sections[0]?.totalNetProfitInrCents).toBe(3821000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/billing/pn-dashboard.test.ts`
Expected: FAIL because the editable row model does not yet expose the new cash-flow fields.

- [ ] **Step 3: Extend the dashboard editable types**

```ts
export type PnEditableSourceRow = {
  rowId: string;
  invoiceId: string;
  invoiceNumber: string;
  employeeId: string;
  employeeName: string;
  year: number;
  month: number;
  daysWorked: number;
  daysInMonth: number;
  baseDollarInwardUsdCents: number;
  onboardingAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
  effectiveDollarInwardUsdCents: number;
  cashInInrCents: number;
  employeeMonthlyUsdCents: number;
  cashoutUsdInrRate: number;
  paidUsdInrRate: number;
  salaryPaidInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
  actualPaidInrCents: number;
  fxCommissionInrCents: number;
  totalCommissionUsdCents: number;
  commissionEarnedInrCents: number;
  grossEarningsInrCents: number;
  netProfitInrCents: number;
};

export type PnEmployeeEditableSection = {
  employeeId: string;
  employeeName: string;
  rows: PnEmployeeEditableRow[];
  totalGrossEarningsInrCents: number;
  totalNetProfitInrCents: number;
};
```

- [ ] **Step 4: Populate widened source rows from cash-flow entries**

```ts
const editableSourceRows: PnEditableSourceRow[] = entries
  .map((row) => ({
    rowId: row.id,
    invoiceId: row.invoice_id,
    invoiceNumber: period.invoiceNumber,
    employeeId: row.employee_id,
    employeeName: row.employee_name_snapshot,
    year,
    month,
    daysWorked: row.days_worked,
    daysInMonth: row.days_in_month,
    baseDollarInwardUsdCents: row.base_dollar_inward_usd_cents,
    onboardingAdvanceUsdCents: row.onboarding_advance_usd_cents,
    offboardingDeductionUsdCents: row.offboarding_deduction_usd_cents,
    effectiveDollarInwardUsdCents: row.effective_dollar_inward_usd_cents,
    cashInInrCents: row.cash_in_inr_cents,
    employeeMonthlyUsdCents: row.monthly_paid_usd_cents,
    cashoutUsdInrRate: row.cashout_usd_inr_rate,
    paidUsdInrRate: row.paid_usd_inr_rate,
    salaryPaidInrCents: Math.round(row.monthly_paid_usd_cents * row.paid_usd_inr_rate),
    pfInrCents: row.pf_inr_cents,
    tdsInrCents: row.tds_inr_cents,
    actualPaidInrCents: row.actual_paid_inr_cents,
    fxCommissionInrCents: row.fx_commission_inr_cents,
    totalCommissionUsdCents: row.total_commission_usd_cents,
    commissionEarnedInrCents: row.commission_earned_inr_cents,
    grossEarningsInrCents: row.gross_earnings_inr_cents,
    netProfitInrCents: row.cash_in_inr_cents - Math.round(row.monthly_paid_usd_cents * row.paid_usd_inr_rate),
  }))
  .filter(Boolean) as PnEditableSourceRow[];
```

- [ ] **Step 5: Finish aggregation and run the focused test**

Run: `npx vitest run src/features/billing/pn-dashboard.test.ts`
Expected: PASS with the new editable row fields and employee net-profit total covered.

- [ ] **Step 6: Commit**

```bash
git add src/features/billing/pn-dashboard.ts src/features/billing/store.ts src/features/billing/pn-dashboard.test.ts
git commit -m "feat: expand dashboard cash flow row model"
```

### Task 2: Render the full employee table

**Files:**
- Modify: `app/dashboard/page.tsx`
- Test: `src/features/billing/pn-dashboard.test.ts`

- [ ] **Step 1: Add a formatting helper test for signed net profit output shape**

```ts
it("keeps negative and positive dashboard net profit values distinct", () => {
  const sections = buildPnEmployeeEditableSections([
    { ...sampleRow, rowId: "cash_1", netProfitInrCents: 250000, grossEarningsInrCents: 250000 },
    { ...sampleRow, rowId: "cash_2", month: 5, netProfitInrCents: -100000, grossEarningsInrCents: 90000 },
  ]);

  expect(sections[0]?.totalNetProfitInrCents).toBe(150000);
  expect(sections[0]?.rows.map((row) => row.netProfitInrCents)).toEqual([250000, -100000]);
});
```

- [ ] **Step 2: Run test to verify it fails or is incomplete**

Run: `npx vitest run src/features/billing/pn-dashboard.test.ts`
Expected: FAIL or missing coverage for the new net-profit total behavior.

- [ ] **Step 3: Replace the employee table columns in the dashboard page**

```tsx
<thead>
  <tr>
    <th>Month</th>
    <th>Days worked</th>
    <th>Dollar inward</th>
    <th>Onboarding advance</th>
    <th>Offboarding deduction</th>
    <th>Effective dollar inward</th>
    <th>Cashout rate</th>
    <th>Cash in (INR)</th>
    <th>Monthly $</th>
    <th>Paid rate</th>
    <th>Salary paid (INR)</th>
    <th>PF (INR)</th>
    <th>TDS (INR)</th>
    <th>Actual paid (INR)</th>
    <th>FX commission (INR)</th>
    <th>Total commission (USD)</th>
    <th>Commission earned (INR)</th>
    <th>Gross earnings (INR)</th>
    <th>Net Profit (INR)</th>
    <th>Actions</th>
  </tr>
</thead>
```

- [ ] **Step 4: Render derived display columns and the employee footer**

```tsx
<td>{formatUsd(row.onboardingAdvanceUsdCents)}</td>
<td>{formatUsd(row.offboardingDeductionUsdCents)}</td>
<td>{formatUsd(row.effectiveDollarInwardUsdCents)}</td>
<td>{formatInr(row.cashInInrCents)}</td>
<td>{formatInr(row.salaryPaidInrCents)}</td>
<td
  style={{
    color:
      row.netProfitInrCents < 0 ? "#fca5a5" : row.netProfitInrCents > 0 ? "#6ee7b7" : "var(--text-primary)",
  }}
>
  {formatSignedInr(row.netProfitInrCents)}
</td>

<tr>
  <td colSpan={18} className="text-right font-semibold">
    Total Net Profit
  </td>
  <td className="font-semibold">{formatSignedInr(section.totalNetProfitInrCents)}</td>
  <td />
</tr>
```

- [ ] **Step 5: Update the empty state copy**

```tsx
<p className="text-sm" style={{ color: "var(--text-muted)" }}>
  No employee cash flow records found for selected filters.
</p>
```

- [ ] **Step 6: Run the focused test**

Run: `npx vitest run src/features/billing/pn-dashboard.test.ts`
Expected: PASS with the employee net-profit total behavior covered.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/page.tsx src/features/billing/pn-dashboard.test.ts
git commit -m "feat: show full dashboard cash flow columns"
```

### Task 3: Validate the completed dashboard flow

**Files:**
- Modify: `src/features/billing/pn-dashboard.test.ts`
- Verify: `app/dashboard/page.tsx`
- Verify: `src/features/billing/store.ts`

- [ ] **Step 1: Add one regression test for employee total net profit across multiple months**

```ts
it("sums employee total net profit across monthly rows", () => {
  const sections = buildPnEmployeeEditableSections([
    { ...sampleEditableRow, rowId: "cash_1", month: 4, netProfitInrCents: 300000 },
    { ...sampleEditableRow, rowId: "cash_2", month: 5, netProfitInrCents: -50000 },
  ]);

  expect(sections[0]?.totalNetProfitInrCents).toBe(250000);
});
```

- [ ] **Step 2: Run focused tests**

Run: `npx vitest run src/features/billing/pn-dashboard.test.ts src/features/billing/employee-cash-flow-store.test.ts`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS except for the pre-existing `_invoiceNumbers` warning in `src/features/billing/employee-cash-flow-store.ts`

- [ ] **Step 4: Sanity-check the finished dashboard manually**

Run: `npm run dev`
Expected: `/dashboard` employee view shows no invoice column, includes the widened cash-flow fields, shows signed monthly net profit, and shows one total net profit row under each employee.

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/pn-dashboard.test.ts
git commit -m "test: cover dashboard net profit totals"
```
