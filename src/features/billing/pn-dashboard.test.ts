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
    dollarInwardUsdCents: 115000,
    reimbursementUsdCents: 10000,
    reimbursementLabelsText: "Laptop",
    appraisalAdvanceUsdCents: 5000,
    employeeMonthlyUsdCents: 70000,
    cashoutUsdInrRate: 83.2,
    paidUsdInrRate: 82.1,
    pfInrCents: 120000,
    tdsInrCents: 60000,
    actualPaidInrCents: 550000,
    fxCommissionInrCents: 50000,
    totalCommissionUsdCents: 30000,
    commissionEarnedInrCents: 150000,
    cashInInrCents: 9568000,
    salaryPaidInrCents: 5747000,
    netProfitInrCents: 3821000,
  },
  {
    employeeId: "emp_1",
    employeeName: "Asha",
    year: 2026,
    month: 2,
    daysWorked: 28,
    daysInMonth: 28,
    dollarInwardUsdCents: 120000,
    reimbursementUsdCents: 0,
    reimbursementLabelsText: "",
    appraisalAdvanceUsdCents: 0,
    employeeMonthlyUsdCents: 70000,
    cashoutUsdInrRate: 83.5,
    paidUsdInrRate: 82.4,
    pfInrCents: 120000,
    tdsInrCents: 65000,
    actualPaidInrCents: 560000,
    fxCommissionInrCents: 52000,
    totalCommissionUsdCents: 50000,
    commissionEarnedInrCents: 170000,
    cashInInrCents: 10020000,
    salaryPaidInrCents: 5768000,
    netProfitInrCents: 4252000,
  },
  {
    employeeId: "emp_2",
    employeeName: "Ravi",
    year: 2026,
    month: 2,
    daysWorked: 21,
    daysInMonth: 28,
    dollarInwardUsdCents: 97500,
    reimbursementUsdCents: 5000,
    reimbursementLabelsText: "Signing bonus",
    appraisalAdvanceUsdCents: 2500,
    employeeMonthlyUsdCents: 75000,
    cashoutUsdInrRate: 83.5,
    paidUsdInrRate: 82.8,
    pfInrCents: 110000,
    tdsInrCents: 55000,
    actualPaidInrCents: 540000,
    fxCommissionInrCents: 30000,
    totalCommissionUsdCents: 15000,
    commissionEarnedInrCents: 110000,
    cashInInrCents: 8141250,
    salaryPaidInrCents: 6210000,
    netProfitInrCents: 1931250,
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
    reimbursementUsdCents: 10000,
    reimbursementLabelsText: "Laptop",
    appraisalAdvanceUsdCents: 5000,
    offboardingDeductionUsdCents: 0,
    effectiveDollarInwardUsdCents: 135000,
    cashInInrCents: 11232000,
    dollarInwardUsdCents: 135000,
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
    netProfitInrCents: 5485000,
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
    reimbursementUsdCents: 5000,
    reimbursementLabelsText: "Signing bonus",
    appraisalAdvanceUsdCents: 2500,
    offboardingDeductionUsdCents: 0,
    effectiveDollarInwardUsdCents: 97500,
    cashInInrCents: 8141250,
    dollarInwardUsdCents: 97500,
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
    netProfitInrCents: 2373250,
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
      companyLevelReimbursementUsdByKey: new Map([
        ["2026-01", 10000],
        ["2026-02", 5000],
      ]),
    });

    expect(monthly).toHaveLength(2);
    expect(monthly[0].month).toBe(1);
    expect(monthly[0].grossEarningsInrCents).toBe(200000);
    expect(monthly[0].reimbursementUsdCents).toBe(20000);
    expect(monthly[0].reimbursementInrCents).toBe(1664000);
    expect(monthly[0].appraisalAdvanceUsdCents).toBe(5000);
    expect(monthly[0].appraisalAdvanceInrCents).toBe(416000);
    expect(monthly[0].netPlInrCents).toBe(5851000);

    expect(monthly[1].month).toBe(2);
    expect(monthly[1].grossEarningsInrCents).toBe(362000);
    expect(monthly[1].reimbursementUsdCents).toBe(10000);
    expect(monthly[1].reimbursementInrCents).toBe(835000);
    expect(monthly[1].appraisalAdvanceUsdCents).toBe(2500);
    expect(monthly[1].appraisalAdvanceInrCents).toBe(208750);
    expect(monthly[1].netPlInrCents).toBe(7137000);
  });

  it("builds yearly period rows from cash-flow net profit even without outflow", () => {
    const yearly = buildPnPeriodRows({
      rows: [
        {
          ...sampleRows[0],
          year: 2027,
          month: 1,
          cashInInrCents: 900000,
          salaryPaidInrCents: 0,
          netProfitInrCents: 900000,
          fxCommissionInrCents: 0,
          totalCommissionUsdCents: 0,
          commissionEarnedInrCents: 0,
        },
      ],
      periodType: "yearly",
      expenseByKey: new Map(),
      companyLevelReimbursementUsdByKey: new Map([["2027", 10000]]),
    });

    expect(yearly).toHaveLength(1);
    expect(yearly[0]).toMatchObject({
      year: 2027,
      month: undefined,
      reimbursementUsdCents: 20000,
      reimbursementInrCents: 1664000,
      appraisalAdvanceUsdCents: 5000,
      appraisalAdvanceInrCents: 416000,
      grossEarningsInrCents: 0,
      netPlInrCents: 2980000,
    });
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
      reimbursementUsdCents: 10000,
      appraisalAdvanceUsdCents: 5000,
    });
  });

  it("builds editable dashboard rows with cash-flow display fields and employee net totals", () => {
    const sections = buildPnEmployeeEditableSections(editableSampleRows);

    expect(sections[0]?.rows[0]).toMatchObject({
      baseDollarInwardUsdCents: 100000,
      onboardingAdvanceUsdCents: 20000,
      reimbursementUsdCents: 10000,
      reimbursementLabelsText: "Laptop",
      reimbursementInrCents: 832000,
      appraisalAdvanceUsdCents: 5000,
      appraisalAdvanceInrCents: 416000,
      offboardingDeductionUsdCents: 0,
      effectiveDollarInwardUsdCents: 135000,
      cashInInrCents: 11232000,
      salaryPaidInrCents: 5747000,
      netProfitInrCents: 5485000,
    });
    expect(sections[0]?.totalNetProfitInrCents).toBe(7858250);
  });

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
