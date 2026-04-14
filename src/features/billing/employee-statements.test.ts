import { describe, expect, it } from "vitest";

import {
  applySavedEmployeeStatementOverrides,
  buildEmployeeStatementSection,
  buildEmployeeStatementSavePayload,
  groupEmployeeStatementRows,
  parseEmployeeStatementFilters,
  toEmployeeStatementMonthKey,
} from "./employee-statements";

describe("employee statements helpers", () => {
  it("parses explicit employee and month-range filters", () => {
    expect(
      parseEmployeeStatementFilters({
        companyId: "comp_1",
        employeeIds: ["emp_1", "emp_2"],
        startMonth: "2026-01",
        endMonth: "2026-03",
      }),
    ).toEqual({
      companyId: "comp_1",
      employeeIds: ["emp_1", "emp_2"],
      startMonth: "2026-01",
      endMonth: "2026-03",
    });
  });

  it("groups employee statement rows by month in chronological order", () => {
    const grouped = groupEmployeeStatementRows([
      { invoiceId: "inv_2", monthKey: "2026-02", invoiceNumber: "002" },
      { invoiceId: "inv_1", monthKey: "2026-01", invoiceNumber: "001" },
    ]);

    expect(grouped.map((group) => group.monthKey)).toEqual(["2026-01", "2026-02"]);
  });

  it("creates month keys from invoice month and year", () => {
    expect(toEmployeeStatementMonthKey({ year: 2026, month: 4 })).toBe("2026-04");
  });

  it("builds month summary defaults from employee payout monthly amount and invoice rows", () => {
    const section = buildEmployeeStatementSection({
      employee: {
        id: "emp_1",
        fullName: "Asha",
        payoutMonthlyUsdCents: 250000,
      },
      rows: [
        {
          employeeId: "emp_1",
          employeeName: "Asha",
          invoiceId: "inv_1",
          invoiceNumber: "2026/001",
          monthKey: "2026-04",
          monthLabel: "April 2026",
          dollarInwardUsdCents: 100000,
          onboardingAdvanceUsdCents: 20000,
          reimbursementUsdCents: 5000,
          reimbursementLabelsText: "Laptop",
          offboardingDeductionUsdCents: 1000,
        },
        {
          employeeId: "emp_1",
          employeeName: "Asha",
          invoiceId: "inv_2",
          invoiceNumber: "2026/002",
          monthKey: "2026-04",
          monthLabel: "April 2026",
          dollarInwardUsdCents: 40000,
          onboardingAdvanceUsdCents: 0,
          reimbursementUsdCents: 0,
          reimbursementLabelsText: "",
          offboardingDeductionUsdCents: 0,
        },
      ],
    });

    expect(section.months[0]?.monthlyDollarPaidUsdCents).toBe(250000);
    expect(section.months[0]?.effectiveDollarInwardUsdCents).toBe(164000);
  });

  it("serializes invoice-row edits and month-summary edits separately", () => {
    const payload = buildEmployeeStatementSavePayload({
      employeeId: "emp_1",
      invoiceRows: [
        {
          employeeId: "emp_1",
          employeeName: "Asha",
          invoiceId: "inv_1",
          invoiceNumber: "2026/001",
          monthKey: "2026-04",
          monthLabel: "April 2026",
          dollarInwardUsdCents: 120000,
          onboardingAdvanceUsdCents: 10000,
          reimbursementUsdCents: 5000,
          reimbursementLabelsText: "Laptop",
          offboardingDeductionUsdCents: 1000,
        },
      ],
      monthSummaries: [
        {
          employeeId: "emp_1",
          monthKey: "2026-04",
          monthLabel: "April 2026",
          effectiveDollarInwardUsdCents: 134000,
          monthlyDollarPaidUsdCents: 250000,
        },
      ],
    });

    expect(payload.invoiceRows).toHaveLength(1);
    expect(payload.monthSummaries).toHaveLength(1);
  });

  it("prefers saved statement values over derived defaults while keeping invoice identity", () => {
    const section = buildEmployeeStatementSection({
      employee: {
        id: "emp_1",
        fullName: "Asha",
        payoutMonthlyUsdCents: 250000,
      },
      rows: [
        {
          employeeId: "emp_1",
          employeeName: "Asha",
          invoiceId: "inv_1",
          invoiceNumber: "2026/001",
          monthKey: "2026-04",
          monthLabel: "April 2026",
          dollarInwardUsdCents: 100000,
          onboardingAdvanceUsdCents: 20000,
          reimbursementUsdCents: 5000,
          reimbursementLabelsText: "Default",
          offboardingDeductionUsdCents: 1000,
        },
      ],
    });

    const overridden = applySavedEmployeeStatementOverrides(section, {
      invoiceRows: [
        {
          employeeId: "emp_1",
          employeeName: "Asha",
          invoiceId: "inv_1",
          invoiceNumber: "old-number",
          monthKey: "2026-04",
          monthLabel: "Old month",
          dollarInwardUsdCents: 222000,
          onboardingAdvanceUsdCents: 1000,
          reimbursementUsdCents: 2000,
          reimbursementLabelsText: "Saved label",
          offboardingDeductionUsdCents: 300,
        },
      ],
      monthSummaries: [
        {
          employeeId: "emp_1",
          monthKey: "2026-04",
          monthLabel: "April 2026",
          effectiveDollarInwardUsdCents: 555000,
          monthlyDollarPaidUsdCents: 333000,
        },
      ],
    });

    expect(overridden.months[0]?.rows[0]).toMatchObject({
      invoiceId: "inv_1",
      invoiceNumber: "2026/001",
      monthLabel: "April 2026",
      dollarInwardUsdCents: 222000,
      reimbursementLabelsText: "Saved label",
    });
    expect(overridden.months[0]?.effectiveDollarInwardUsdCents).toBe(555000);
    expect(overridden.months[0]?.monthlyDollarPaidUsdCents).toBe(333000);
  });
});
