import { describe, expect, it } from "vitest";

import {
  buildPnEmployeeEditableSections,
  buildPnEmployeeSections,
  buildPnPeriodRows,
  type PnEditableSourceRow,
  type PnSourceRow,
} from "./pn-dashboard";

const sampleRows: PnSourceRow[] = [
  {
    employeeId: "emp_1",
    employeeName: "Asha",
    year: 2026,
    month: 1,
    daysWorked: 31,
    daysInMonth: 31,
    dollarInwardUsdCents: 100000,
    employeeMonthlyUsdCents: 70000,
    cashoutUsdInrRate: 83.2,
    paidUsdInrRate: 82.1,
    pfInrCents: 120000,
    tdsInrCents: 60000,
    actualPaidInrCents: 550000,
    fxCommissionInrCents: 50000,
    totalCommissionUsdCents: 30000,
    commissionEarnedInrCents: 150000,
  },
  {
    employeeId: "emp_1",
    employeeName: "Asha",
    year: 2026,
    month: 2,
    daysWorked: 28,
    daysInMonth: 28,
    dollarInwardUsdCents: 120000,
    employeeMonthlyUsdCents: 70000,
    cashoutUsdInrRate: 83.5,
    paidUsdInrRate: 82.4,
    pfInrCents: 120000,
    tdsInrCents: 65000,
    actualPaidInrCents: 560000,
    fxCommissionInrCents: 52000,
    totalCommissionUsdCents: 50000,
    commissionEarnedInrCents: 170000,
  },
  {
    employeeId: "emp_2",
    employeeName: "Ravi",
    year: 2026,
    month: 2,
    daysWorked: 21,
    daysInMonth: 28,
    dollarInwardUsdCents: 90000,
    employeeMonthlyUsdCents: 75000,
    cashoutUsdInrRate: 83.5,
    paidUsdInrRate: 82.8,
    pfInrCents: 110000,
    tdsInrCents: 55000,
    actualPaidInrCents: 540000,
    fxCommissionInrCents: 30000,
    totalCommissionUsdCents: 15000,
    commissionEarnedInrCents: 110000,
  },
];

const editableSampleRows: PnEditableSourceRow[] = [
  {
    rowId: "cash_1",
    invoiceId: "inv_1",
    invoiceNumber: "INV-001",
    employeeId: "emp_1",
    employeeName: "Asha",
    year: 2026,
    month: 1,
    daysWorked: 31,
    daysInMonth: 31,
    baseDollarInwardUsdCents: 100000,
    onboardingAdvanceUsdCents: 20000,
    offboardingDeductionUsdCents: 0,
    effectiveDollarInwardUsdCents: 120000,
    cashInInrCents: 9984000,
    dollarInwardUsdCents: 120000,
    employeeMonthlyUsdCents: 70000,
    cashoutUsdInrRate: 83.2,
    paidUsdInrRate: 82.1,
    salaryPaidInrCents: 5747000,
    pfInrCents: 120000,
    tdsInrCents: 60000,
    actualPaidInrCents: 550000,
    fxCommissionInrCents: 50000,
    totalCommissionUsdCents: 50000,
    commissionEarnedInrCents: 150000,
    grossEarningsInrCents: 200000,
    netProfitInrCents: 4237000,
  },
  {
    rowId: "cash_2",
    invoiceId: "inv_2",
    invoiceNumber: "INV-002",
    employeeId: "emp_1",
    employeeName: "Asha",
    year: 2026,
    month: 2,
    daysWorked: 28,
    daysInMonth: 28,
    baseDollarInwardUsdCents: 90000,
    onboardingAdvanceUsdCents: 0,
    offboardingDeductionUsdCents: 0,
    effectiveDollarInwardUsdCents: 90000,
    cashInInrCents: 7515000,
    dollarInwardUsdCents: 90000,
    employeeMonthlyUsdCents: 70000,
    cashoutUsdInrRate: 83.5,
    paidUsdInrRate: 82.4,
    salaryPaidInrCents: 5768000,
    pfInrCents: 120000,
    tdsInrCents: 65000,
    actualPaidInrCents: 560000,
    fxCommissionInrCents: 52000,
    totalCommissionUsdCents: 20000,
    commissionEarnedInrCents: 170000,
    grossEarningsInrCents: 222000,
    netProfitInrCents: 1747000,
  },
];

describe("pn dashboard aggregations", () => {
  it("builds employee sections with gross totals per employee", () => {
    const sections = buildPnEmployeeSections(sampleRows);
    expect(sections).toHaveLength(2);
    expect(sections[0].employeeName).toBe("Asha");
    expect(sections[0].rows).toHaveLength(2);
    expect(sections[0].rows[0].grossEarningsInrCents).toBe(200000);
    expect(sections[0].totalGrossEarningsInrCents).toBe(422000);
  });

  it("builds monthly period rows and applies expenses/net p-l", () => {
    const monthly = buildPnPeriodRows({
      rows: sampleRows,
      periodType: "monthly",
      expenseByKey: new Map([
        ["2026-01", 50000],
        ["2026-02", 90000],
      ]),
    });

    expect(monthly).toHaveLength(2);
    expect(monthly[0].month).toBe(1);
    expect(monthly[0].grossEarningsInrCents).toBe(200000);
    expect(monthly[0].netPlInrCents).toBe(150000);

    expect(monthly[1].month).toBe(2);
    expect(monthly[1].grossEarningsInrCents).toBe(362000);
    expect(monthly[1].netPlInrCents).toBe(272000);
  });

  it("builds editable employee sections from cash flow rows", () => {
    const sections = buildPnEmployeeEditableSections(editableSampleRows);

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      employeeId: "emp_1",
      employeeName: "Asha",
      totalGrossEarningsInrCents: 422000,
    });
    expect(sections[0]?.rows[0]).toMatchObject({
      payoutId: "cash_1",
      invoiceNumber: "INV-001",
      dollarInwardUsdCents: 100000,
    });
  });

  it("builds editable dashboard rows with cash-flow display fields and employee net totals", () => {
    const sections = buildPnEmployeeEditableSections(editableSampleRows);

    expect(sections[0]?.rows[0]).toMatchObject({
      baseDollarInwardUsdCents: 100000,
      onboardingAdvanceUsdCents: 20000,
      offboardingDeductionUsdCents: 0,
      effectiveDollarInwardUsdCents: 120000,
      cashInInrCents: 9984000,
      salaryPaidInrCents: 5747000,
      netProfitInrCents: 4237000,
    });
    expect(sections[0]?.totalNetProfitInrCents).toBe(5984000);
  });

  it("keeps negative and positive dashboard net profit values distinct", () => {
    const sections = buildPnEmployeeEditableSections([
      {
        ...editableSampleRows[0],
        rowId: "cash_1",
        netProfitInrCents: 250000,
      },
      {
        ...editableSampleRows[1],
        rowId: "cash_2",
        month: 5,
        netProfitInrCents: -100000,
      },
    ]);

    expect(sections[0]?.rows.map((row) => row.netProfitInrCents)).toEqual([
      250000,
      -100000,
    ]);
    expect(sections[0]?.totalNetProfitInrCents).toBe(150000);
  });
});
