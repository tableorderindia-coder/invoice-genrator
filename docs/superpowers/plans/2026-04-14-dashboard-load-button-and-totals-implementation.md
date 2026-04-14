# Dashboard Load Button And Totals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit employee/month `Load` behavior to both company dashboard views and render aligned totals rows across all dashboard tables.

**Architecture:** Keep the existing server-rendered URL/form contract in `app/dashboard/page.tsx`, but separate filter-apply forms from view/period-switch buttons so checklist selections only apply on `Load`. Move totals math into small billing helpers and let `app/dashboard/dashboard-tables.tsx` render footer rows from the visible column definitions and current client-side toggle state.

**Tech Stack:** Next.js 16 App Router, React 19 client components, TypeScript, Vitest

---

## File Structure

- Create: `src/features/billing/dashboard-table-totals.ts`
  - Focused helper module for employee-table totals, period-table totals, weighted-rate aggregates, and cell metadata.
- Create: `src/features/billing/dashboard-table-totals.test.ts`
  - Unit tests for sums, weighted averages, and period-view net P/L totals with toggle state.
- Modify: `app/dashboard/page.tsx`
  - Add employee/month `Load` filter form to period view and preserve current filter selections across view/period toggles.
- Modify: `app/dashboard/dashboard-tables.tsx`
  - Reuse totals helpers and render footer rows aligned with visible columns in employee and period views.
- Modify: `src/features/billing/pn-dashboard.test.ts`
  - Add or extend tests if helper inputs require better fixture coverage for period data assumptions.
- Create or Modify: `src/features/billing/dashboard-tables-render.test.tsx`
  - Rendering test confirming totals row column alignment and presence in both dashboard modes.

### Task 1: Add Totals Helper Coverage First

**Files:**
- Create: `src/features/billing/dashboard-table-totals.ts`
- Create: `src/features/billing/dashboard-table-totals.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import type { PnEmployeeEditableRow, PnPeriodRow } from "./types";
import {
  buildEmployeeSectionTotals,
  buildPeriodTotals,
} from "./dashboard-table-totals";

const employeeRows: PnEmployeeEditableRow[] = [
  {
    payoutId: "p1",
    invoiceId: "inv1",
    invoiceNumber: "INV-1",
    year: 2026,
    month: 4,
    daysWorked: 10,
    daysInMonth: 30,
    dollarInwardUsdCents: 100_00,
    baseDollarInwardUsdCents: 100_00,
    onboardingAdvanceUsdCents: 5_00,
    reimbursementUsdCents: 2_00,
    reimbursementLabelsText: "Taxi",
    reimbursementInrCents: 160_00,
    appraisalAdvanceUsdCents: 1_00,
    appraisalAdvanceInrCents: 80_00,
    offboardingDeductionUsdCents: 0,
    effectiveDollarInwardUsdCents: 98_00,
    cashInInrCents: 8_000_00,
    employeeMonthlyUsdCents: 20_000,
    cashoutUsdInrRate: 80,
    paidUsdInrRate: 75,
    salaryPaidInrCents: 14_500_00,
    pfInrCents: 500_00,
    tdsInrCents: 200_00,
    actualPaidInrCents: 15_200_00,
    fxCommissionInrCents: 1_000_00,
    totalCommissionUsdCents: 10_00,
    commissionEarnedInrCents: 2_000_00,
    grossEarningsInrCents: 3_000_00,
    netProfitInrCents: 12_000_00,
    isSecurityDepositMonth: false,
  },
  {
    payoutId: "p2",
    invoiceId: "inv2",
    invoiceNumber: "INV-2",
    year: 2026,
    month: 5,
    daysWorked: 20,
    daysInMonth: 31,
    dollarInwardUsdCents: 200_00,
    baseDollarInwardUsdCents: 200_00,
    onboardingAdvanceUsdCents: 0,
    reimbursementUsdCents: 3_00,
    reimbursementLabelsText: "Food",
    reimbursementInrCents: 240_00,
    appraisalAdvanceUsdCents: 0,
    appraisalAdvanceInrCents: 0,
    offboardingDeductionUsdCents: 1_00,
    effectiveDollarInwardUsdCents: 199_00,
    cashInInrCents: 16_000_00,
    employeeMonthlyUsdCents: 10_000,
    cashoutUsdInrRate: 82,
    paidUsdInrRate: 78,
    salaryPaidInrCents: 7_500_00,
    pfInrCents: 300_00,
    tdsInrCents: 100_00,
    actualPaidInrCents: 7_900_00,
    fxCommissionInrCents: 800_00,
    totalCommissionUsdCents: 8_00,
    commissionEarnedInrCents: 1_600_00,
    grossEarningsInrCents: 2_400_00,
    netProfitInrCents: 9_000_00,
    isSecurityDepositMonth: false,
  },
];

const periodRows: PnPeriodRow[] = [
  {
    year: 2026,
    month: 4,
    dollarInwardUsdCents: 100_00,
    onboardingAdvanceUsdCents: 5_00,
    reimbursementUsdCents: 4_00,
    reimbursementLabelsText: "Taxi",
    reimbursementInrCents: 320_00,
    appraisalAdvanceUsdCents: 1_00,
    appraisalAdvanceInrCents: 80_00,
    offboardingDeductionUsdCents: 0,
    effectiveDollarInwardUsdCents: 99_00,
    cashoutUsdInrRate: 80,
    cashInInrCents: 8_000_00,
    employeeMonthlyUsdCents: 20_000,
    paidUsdInrRate: 75,
    monthlyPaidInrCents: 15_000_00,
    pfInrCents: 500_00,
    tdsInrCents: 200_00,
    actualPaidInrCents: 15_200_00,
    salaryPaidInrCents: 14_500_00,
    fxCommissionInrCents: 1_000_00,
    totalCommissionUsdCents: 10_00,
    commissionEarnedInrCents: 2_000_00,
    grossEarningsInrCents: 3_000_00,
    expensesInrCents: 1_000_00,
    companyReimbursementUsdCents: 2_00,
    companyReimbursementInrCents: 160_00,
    netPlInrCents: 12_000_00,
  },
  {
    year: 2026,
    month: 5,
    dollarInwardUsdCents: 200_00,
    onboardingAdvanceUsdCents: 0,
    reimbursementUsdCents: 3_00,
    reimbursementLabelsText: "Food",
    reimbursementInrCents: 240_00,
    appraisalAdvanceUsdCents: 0,
    appraisalAdvanceInrCents: 0,
    offboardingDeductionUsdCents: 1_00,
    effectiveDollarInwardUsdCents: 199_00,
    cashoutUsdInrRate: 82,
    cashInInrCents: 16_000_00,
    employeeMonthlyUsdCents: 10_000,
    paidUsdInrRate: 78,
    monthlyPaidInrCents: 7_800_00,
    pfInrCents: 300_00,
    tdsInrCents: 100_00,
    actualPaidInrCents: 7_900_00,
    salaryPaidInrCents: 7_500_00,
    fxCommissionInrCents: 800_00,
    totalCommissionUsdCents: 8_00,
    commissionEarnedInrCents: 1_600_00,
    grossEarningsInrCents: 2_400_00,
    expensesInrCents: 500_00,
    companyReimbursementUsdCents: 1_00,
    companyReimbursementInrCents: 80_00,
    netPlInrCents: 9_000_00,
  },
];

describe("dashboard table totals", () => {
  it("sums employee totals and computes weighted rates", () => {
    const totals = buildEmployeeSectionTotals(employeeRows);

    expect(totals.daysWorked).toBe(30);
    expect(totals.actualPaidInrCents).toBe(23_100_00);
    expect(totals.netProfitInrCents).toBe(21_000_00);
    expect(totals.cashoutUsdInrRate).toBeCloseTo(80.6667, 3);
    expect(totals.paidUsdInrRate).toBeCloseTo(76, 3);
  });

  it("computes period totals and respects P/L toggles", () => {
    const totals = buildPeriodTotals(periodRows, {
      includeExpenses: false,
      includeReimbursements: true,
    });

    expect(totals.expensesInrCents).toBe(1_500_00);
    expect(totals.companyReimbursementInrCents).toBe(240_00);
    expect(totals.netPlInrCents).toBe(21_240_00);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/billing/dashboard-table-totals.test.ts`
Expected: FAIL because the new totals helper module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { PnEmployeeEditableRow, PnPeriodRow } from "./types";

function sumBy<T>(rows: T[], pick: (row: T) => number) {
  return rows.reduce((sum, row) => sum + pick(row), 0);
}

function weightedAverage<T>(rows: T[], value: (row: T) => number, weight: (row: T) => number) {
  const weightedTotal = rows.reduce((sum, row) => sum + value(row) * weight(row), 0);
  const totalWeight = rows.reduce((sum, row) => sum + weight(row), 0);
  if (totalWeight <= 0) return null;
  return weightedTotal / totalWeight;
}

export function buildEmployeeSectionTotals(rows: PnEmployeeEditableRow[]) {
  return {
    daysWorked: sumBy(rows, (row) => row.daysWorked),
    dollarInwardUsdCents: sumBy(rows, (row) => row.dollarInwardUsdCents),
    onboardingAdvanceUsdCents: sumBy(rows, (row) => row.onboardingAdvanceUsdCents),
    reimbursementUsdCents: sumBy(rows, (row) => row.reimbursementUsdCents),
    reimbursementInrCents: sumBy(rows, (row) => row.reimbursementInrCents),
    appraisalAdvanceUsdCents: sumBy(rows, (row) => row.appraisalAdvanceUsdCents),
    appraisalAdvanceInrCents: sumBy(rows, (row) => row.appraisalAdvanceInrCents),
    offboardingDeductionUsdCents: sumBy(rows, (row) => row.offboardingDeductionUsdCents),
    effectiveDollarInwardUsdCents: sumBy(rows, (row) => row.effectiveDollarInwardUsdCents),
    cashInInrCents: sumBy(rows, (row) => row.cashInInrCents),
    employeeMonthlyUsdCents: sumBy(rows, (row) => row.employeeMonthlyUsdCents),
    cashoutUsdInrRate:
      weightedAverage(rows, (row) => row.cashoutUsdInrRate, (row) => row.employeeMonthlyUsdCents) ??
      null,
    paidUsdInrRate:
      weightedAverage(
        rows.filter((row) => row.paidUsdInrRate > 0),
        (row) => row.paidUsdInrRate,
        (row) => row.employeeMonthlyUsdCents,
      ) ?? null,
    monthlyPaidInrCents: sumBy(rows, (row) =>
      Math.round(row.employeeMonthlyUsdCents * row.paidUsdInrRate),
    ),
    actualPaidInrCents: sumBy(rows, (row) => row.actualPaidInrCents),
    pfInrCents: sumBy(rows, (row) => row.pfInrCents),
    tdsInrCents: sumBy(rows, (row) => row.tdsInrCents),
    salaryPaidInrCents: sumBy(rows, (row) => row.salaryPaidInrCents),
    fxCommissionInrCents: sumBy(rows, (row) => row.fxCommissionInrCents),
    totalCommissionUsdCents: sumBy(rows, (row) => row.totalCommissionUsdCents),
    commissionEarnedInrCents: sumBy(rows, (row) => row.commissionEarnedInrCents),
    grossEarningsInrCents: sumBy(rows, (row) => row.grossEarningsInrCents),
    netProfitInrCents: sumBy(rows, (row) => row.netProfitInrCents),
  };
}

export function buildPeriodTotals(
  rows: PnPeriodRow[],
  options: { includeExpenses: boolean; includeReimbursements: boolean },
) {
  const baseNet = sumBy(rows, (row) => row.netPlInrCents);
  const reimbursement = sumBy(rows, (row) => row.companyReimbursementInrCents);
  const expenses = sumBy(rows, (row) => row.expensesInrCents);

  return {
    daysWorked: null,
    dollarInwardUsdCents: sumBy(rows, (row) => row.dollarInwardUsdCents),
    onboardingAdvanceUsdCents: sumBy(rows, (row) => row.onboardingAdvanceUsdCents),
    reimbursementUsdCents: sumBy(rows, (row) => row.reimbursementUsdCents),
    reimbursementInrCents: sumBy(rows, (row) => row.reimbursementInrCents),
    appraisalAdvanceUsdCents: sumBy(rows, (row) => row.appraisalAdvanceUsdCents),
    appraisalAdvanceInrCents: sumBy(rows, (row) => row.appraisalAdvanceInrCents),
    offboardingDeductionUsdCents: sumBy(rows, (row) => row.offboardingDeductionUsdCents),
    effectiveDollarInwardUsdCents: sumBy(rows, (row) => row.effectiveDollarInwardUsdCents),
    cashoutUsdInrRate:
      weightedAverage(rows, (row) => row.cashoutUsdInrRate, (row) => row.employeeMonthlyUsdCents) ??
      null,
    cashInInrCents: sumBy(rows, (row) => row.cashInInrCents),
    employeeMonthlyUsdCents: sumBy(rows, (row) => row.employeeMonthlyUsdCents),
    paidUsdInrRate:
      weightedAverage(
        rows.filter((row) => row.paidUsdInrRate > 0),
        (row) => row.paidUsdInrRate,
        (row) => row.employeeMonthlyUsdCents,
      ) ?? null,
    monthlyPaidInrCents: sumBy(rows, (row) => row.monthlyPaidInrCents),
    actualPaidInrCents: sumBy(rows, (row) => row.actualPaidInrCents),
    pfInrCents: sumBy(rows, (row) => row.pfInrCents),
    tdsInrCents: sumBy(rows, (row) => row.tdsInrCents),
    salaryPaidInrCents: sumBy(rows, (row) => row.salaryPaidInrCents),
    fxCommissionInrCents: sumBy(rows, (row) => row.fxCommissionInrCents),
    totalCommissionUsdCents: sumBy(rows, (row) => row.totalCommissionUsdCents),
    commissionEarnedInrCents: sumBy(rows, (row) => row.commissionEarnedInrCents),
    grossEarningsInrCents: sumBy(rows, (row) => row.grossEarningsInrCents),
    expensesInrCents: expenses,
    companyReimbursementUsdCents: sumBy(rows, (row) => row.companyReimbursementUsdCents),
    companyReimbursementInrCents: reimbursement,
    netPlInrCents:
      baseNet +
      (options.includeReimbursements ? reimbursement : 0) -
      (options.includeExpenses ? expenses : 0),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/billing/dashboard-table-totals.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/dashboard-table-totals.ts src/features/billing/dashboard-table-totals.test.ts
git commit -m "feat: add dashboard totals helpers"
```

### Task 2: Add Dashboard Filter Load Flow To Period View

**Files:**
- Modify: `app/dashboard/page.tsx`
- Test: `src/features/billing/filter-selection.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { buildDashboardFilterFieldEntries } from "./filter-selection";

describe("dashboard filter field entries", () => {
  it("can omit all-selected flags for filter load submissions", () => {
    expect(
      buildDashboardFilterFieldEntries({
        employeeIds: ["emp_1", "emp_2"],
        paymentMonths: ["2026-04"],
        includeAllEmployees: false,
        includeAllMonths: false,
      }),
    ).toEqual([
      ["employeeIds", "emp_1"],
      ["employeeIds", "emp_2"],
      ["paymentMonths", "2026-04"],
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/billing/filter-selection.test.ts`
Expected: FAIL if the helper does not yet cover the exact field combination needed by the new period-view `Load` form.

- [ ] **Step 3: Write minimal implementation**

```tsx
const periodFilterFields = buildDashboardFilterFieldEntries({
  employeeIds: effectiveEmployeeIds,
  paymentMonths: effectivePaymentMonths,
  includeAllEmployees: false,
  includeAllMonths: false,
});

<form action="/dashboard" className="mb-4 space-y-3">
  <input type="hidden" name="companyId" value={selectedCompanyId} />
  <input type="hidden" name="view" value={view} />
  <input type="hidden" name="periodType" value={periodType} />
  <ChecklistFilterDropdown
    name="employeeIds"
    label="Employees"
    options={employeeOptions}
    defaultSelectedValues={effectiveEmployeeIds}
    includeSelectAll
  />
  <ChecklistFilterDropdown
    name="paymentMonths"
    label="Months"
    options={monthOptions}
    defaultSelectedValues={effectivePaymentMonths}
    includeSelectAll
  />
  <PendingSubmitButton
    className="btn-outline"
    defaultText="Load"
    pendingText="Loading..."
  />
</form>

<form action="/dashboard" className="mb-4 flex flex-wrap items-center gap-2">
  <input type="hidden" name="companyId" value={selectedCompanyId} />
  <input type="hidden" name="view" value={view} />
  {periodFilterFields.map(([name, value], index) => (
    <input key={`${name}-${value}-${index}`} type="hidden" name={name} value={value} />
  ))}
  <PendingSubmitButton name="periodType" value="monthly" ... />
  <PendingSubmitButton name="periodType" value="yearly" ... />
</form>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/billing/filter-selection.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/page.tsx src/features/billing/filter-selection.test.ts
git commit -m "feat: add dashboard filter load forms"
```

### Task 3: Render Employee Dashboard Totals Rows

**Files:**
- Modify: `app/dashboard/dashboard-tables.tsx`
- Create or Modify: `src/features/billing/dashboard-tables-render.test.tsx`
- Test: `src/features/billing/dashboard-table-totals.test.ts`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardTables } from "@/app/dashboard/dashboard-tables";

describe("dashboard tables employee totals", () => {
  it("renders a totals row aligned to the visible employee columns", () => {
    render(
      <DashboardTables
        view="employee"
        periodType="monthly"
        data={{
          companyId: "company_1",
          employeeSections: [],
          periodRows: [],
          employeeEditableSections: [
            {
              employeeId: "emp_1",
              employeeName: "Alice",
              totalGrossEarningsInrCents: 0,
              totalNetProfitInrCents: 21_000_00,
              rows: [/* one or two fixture rows */],
            },
          ],
        }}
        selectedCompanyId="company_1"
        returnTo="/dashboard"
        updateDashboardEmployeeCashFlowEntryAction={vi.fn(async () => {})}
      />,
    );

    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    const totalsRow = within(table).getByText("Totals").closest("tr");

    expect(totalsRow).not.toBeNull();
    expect(within(totalsRow!).getAllByRole("cell")).toHaveLength(headers.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/billing/dashboard-tables-render.test.tsx`
Expected: FAIL because employee tables still render only the legacy net-profit tail row.

- [ ] **Step 3: Write minimal implementation**

```tsx
const employeeTotals = buildEmployeeSectionTotals(section.rows);

const renderEmployeeTotalsCell = (column: Column<PnEmployeeEditableRow>) => {
  switch (column.key) {
    case "month":
      return "Totals";
    case "daysWorked":
      return employeeTotals.daysWorked;
    case "cashoutRate":
      return employeeTotals.cashoutUsdInrRate === null
        ? "-"
        : employeeTotals.cashoutUsdInrRate.toFixed(4);
    case "paidRate":
      return employeeTotals.paidUsdInrRate === null
        ? "-"
        : employeeTotals.paidUsdInrRate.toFixed(4);
    case "cashIn":
      return formatInr(employeeTotals.cashInInrCents);
    case "monthlyUsd":
      return formatUsd(employeeTotals.employeeMonthlyUsdCents);
    case "monthlyPaidInr":
      return formatInr(employeeTotals.monthlyPaidInrCents);
    case "actualPaid":
      return formatInr(employeeTotals.actualPaidInrCents);
    case "pf":
      return formatInr(employeeTotals.pfInrCents);
    case "tds":
      return formatInr(employeeTotals.tdsInrCents);
    case "salaryPaid":
      return formatInr(employeeTotals.salaryPaidInrCents);
    case "fxCommission":
      return formatInr(employeeTotals.fxCommissionInrCents);
    case "totalCommission":
      return formatUsd(employeeTotals.totalCommissionUsdCents);
    case "commissionEarned":
      return formatInr(employeeTotals.commissionEarnedInrCents);
    case "grossEarnings":
      return formatInr(employeeTotals.grossEarningsInrCents);
    case "netProfit":
      return (
        <span style={{ color: netProfitColor(employeeTotals.netProfitInrCents) }}>
          {formatSignedInr(employeeTotals.netProfitInrCents)}
        </span>
      );
    case "actions":
    case "reimbursementLabels":
      return "";
    default:
      return "-";
  }
};

<tr>
  {columns.map((column) => (
    <td key={`total-${column.key}`} className="text-sm font-semibold">
      {renderEmployeeTotalsCell(column)}
    </td>
  ))}
</tr>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/billing/dashboard-tables-render.test.tsx src/features/billing/dashboard-table-totals.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/dashboard-tables.tsx src/features/billing/dashboard-tables-render.test.tsx
git commit -m "feat: render employee dashboard totals rows"
```

### Task 4: Render Period Dashboard Totals Rows With Toggle-Aware Net P/L

**Files:**
- Modify: `app/dashboard/dashboard-tables.tsx`
- Modify: `src/features/billing/dashboard-tables-render.test.tsx`
- Test: `src/features/billing/dashboard-table-totals.test.ts`

- [ ] **Step 1: Write the failing test**

```tsx
it("updates the period totals net p/l when expenses are excluded", async () => {
  render(
    <DashboardTables
      view="period"
      periodType="monthly"
      data={periodFixtureData}
      selectedCompanyId="company_1"
      returnTo="/dashboard"
      updateDashboardEmployeeCashFlowEntryAction={vi.fn(async () => {})}
    />,
  );

  expect(screen.getByText("+₹21,240.00")).toBeInTheDocument();

  await userEvent.click(screen.getAllByRole("checkbox")[0]);

  expect(screen.getByText("+₹22,740.00")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/billing/dashboard-tables-render.test.tsx`
Expected: FAIL because period tables do not yet render a totals footer tied to current toggle state.

- [ ] **Step 3: Write minimal implementation**

```tsx
const periodTotals = buildPeriodTotals(data.periodRows, {
  includeExpenses,
  includeReimbursements,
});

const renderPeriodTotalsCell = (column: Column<PnPeriodRow>) => {
  switch (column.key) {
    case "period":
      return "Totals";
    case "cashoutRate":
      return periodTotals.cashoutUsdInrRate === null
        ? "-"
        : periodTotals.cashoutUsdInrRate.toFixed(4);
    case "paidRate":
      return periodTotals.paidUsdInrRate === null
        ? "-"
        : periodTotals.paidUsdInrRate.toFixed(4);
    case "dollarInward":
      return formatUsd(periodTotals.dollarInwardUsdCents);
    case "actualPaid":
      return formatInr(periodTotals.actualPaidInrCents);
    case "expenses":
      return formatInr(periodTotals.expensesInrCents);
    case "companyReimbursementUsd":
      return formatUsd(periodTotals.companyReimbursementUsdCents);
    case "companyReimbursementInr":
      return formatInr(periodTotals.companyReimbursementInrCents);
    case "netPl":
      return (
        <span style={{ color: netProfitColor(periodTotals.netPlInrCents), fontWeight: 600 }}>
          {formatSignedInr(periodTotals.netPlInrCents)}
        </span>
      );
    default:
      return resolveFormattedPeriodTotal(column.key, periodTotals);
  }
};

{data.periodRows.length > 0 ? (
  <tr>
    {columns.map((column) => (
      <td key={`period-total-${column.key}`} className="text-sm font-semibold">
        {renderPeriodTotalsCell(column)}
      </td>
    ))}
  </tr>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/billing/dashboard-tables-render.test.tsx src/features/billing/dashboard-table-totals.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/dashboard-tables.tsx src/features/billing/dashboard-tables-render.test.tsx
git commit -m "feat: add period dashboard totals row"
```

### Task 5: Verify The Follow-Up End To End

**Files:**
- Modify: none unless a bug is found
- Test: `src/features/billing/dashboard-table-totals.test.ts`
- Test: `src/features/billing/dashboard-tables-render.test.tsx`
- Test: `src/features/billing/filter-selection.test.ts`

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/features/billing/dashboard-table-totals.test.ts src/features/billing/dashboard-tables-render.test.tsx src/features/billing/filter-selection.test.ts`
Expected: PASS

- [ ] **Step 2: Run broader billing tests**

Run: `npm test -- src/features/billing`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS with no new errors

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Manually verify dashboard behavior**

Run:

```bash
npm run dev
```

Check:

- `http://localhost:3000/dashboard`

Expected:

- employee view has employee/month dropdown filters and `Load`
- monthly/yearly view has employee/month dropdown filters and `Load`
- changing period view does not overwrite current loaded employee/month selections
- employee tables show a footer totals row aligned to visible headers
- monthly tables show a footer totals row aligned to visible headers
- yearly tables show a footer totals row aligned to visible headers
- toggling `Expenses` or `Reimb.` updates the visible total net P/L in period view

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add dashboard load controls and totals rows"
```
