import { describe, expect, it } from "vitest";

import {
  buildDefaultPayslip,
  calculatePayslipTotals,
  formatPayslipAmountInWords,
} from "./payslip";
import type { Employee } from "./types";
import type { MonthlyPayrollRow } from "./payroll";

const employee: Employee = {
  id: "emp_1",
  companyId: "company_1",
  fullName: "Beesetti Kiran Suresh",
  panNumber: "GLWPS3874M",
  pfUan: "100200300400",
  phoneNumber: "7584928285",
  designation: "Senior Data Engineer",
  defaultTeam: "Data Engineering",
  billingRateUsdCents: 1000,
  defaultPaidUsdInrRate: 86,
  defaultActualPaidInrCents: 83_334_00,
  defaultPfInrCents: 0,
  defaultTdsInrCents: 0,
  hrsPerWeek: 20,
  activeFrom: "2026-04-01",
  isActive: true,
  createdAt: "2026-04-01T00:00:00.000Z",
};

const payrollRow: MonthlyPayrollRow = {
  employeeId: "emp_1",
  companyId: "company_1",
  month: "2026-04",
  employeeName: "Beesetti Kiran Suresh",
  source: "monthly-payroll",
  paidUsdInrRate: 86,
  salaryPaidInrCents: 83_334_00,
  pfInrCents: 1_800_00,
  tdsInrCents: 4_200_00,
  paidStatus: true,
  paidDate: "2026-04-30",
  status: "verified",
};

describe("payslip model", () => {
  it("builds a default editable payslip from employee template and saved salary row", () => {
    const payslip = buildDefaultPayslip({
      companyId: "company_1",
      month: "2026-04",
      employee,
      payrollRow,
      template: {
        earnings: [
          { label: "BASIC", kind: "percentage", value: 40, sortOrder: 1 },
          { label: "SPECIAL ALLOWANCE", kind: "percentage", value: 60, sortOrder: 2 },
          { label: "INSURANCE", kind: "fixed", valueInrCents: 0, sortOrder: 3 },
        ],
        deductions: [{ label: "PF", source: "pf", sortOrder: 1 }],
        tdsIncomeTaxDeductions: [
          { label: "Standard Deduction", amountInrCents: 75_000_00, sortOrder: 1 },
        ],
      },
      previousTaxPaidByMonth: new Map([
        ["2026-04", 4_200_00],
        ["2026-05", 2_000_00],
      ]),
    });

    expect(payslip.employeeName).toBe("Beesetti Kiran Suresh");
    expect(payslip.panNumber).toBe("GLWPS3874M");
    expect(payslip.pfUan).toBe("100200300400");
    expect(payslip.joiningDate).toBe("2026-04-01");
    expect(payslip.effectiveWorkDays).toBe(30);
    expect(payslip.earnings.map((row) => [row.label, row.amountInrCents])).toEqual([
      ["BASIC", 33_334_00],
      ["SPECIAL ALLOWANCE", 50_000_00],
      ["INSURANCE", 0],
    ]);
    expect(payslip.deductions.map((row) => [row.label, row.amountInrCents])).toEqual([
      ["PF", 1_800_00],
      ["INCOME TAX", 4_200_00],
    ]);
    expect(payslip.tdsEarnings.map((row) => [row.label, row.grossInrCents, row.taxableInrCents])).toEqual([
      ["BASIC", 400_008_00, 400_008_00],
      ["SPECIAL ALLOWANCE", 600_000_00, 600_000_00],
      ["INSURANCE", 0, 0],
    ]);
    expect(payslip.tdsIncomeTaxDeductions).toEqual([
      { label: "Income after Section 10 Exemption", amountInrCents: 1_000_008_00, sortOrder: 1 },
      { label: "Profession Tax", amountInrCents: 0, sortOrder: 2 },
      { label: "Standard Deduction", amountInrCents: 75_000_00, sortOrder: 3 },
      { label: "Taxable Income", amountInrCents: 925_008_00, sortOrder: 4 },
      { label: "Total Tax", amountInrCents: 0, sortOrder: 5 },
      { label: "Education Cess", amountInrCents: 0, sortOrder: 6 },
      { label: "Tax Deducted (Previous Employer)", amountInrCents: 0, sortOrder: 7 },
      { label: "Tax Deducted Till Date", amountInrCents: 6_200_00, sortOrder: 8 },
      { label: "Tax to be Deducted", amountInrCents: 0, sortOrder: 9 },
      { label: "Monthly Projected Tax", amountInrCents: 4_200_00, sortOrder: 10 },
    ]);
    expect(payslip.taxPaidMonths.map((row) => [row.monthCode, row.amountInrCents])).toEqual([
      ["APR", 4_200_00],
      ["MAY", 2_000_00],
      ["JUN", 0],
      ["JUL", 0],
      ["AUG", 0],
      ["SEP", 0],
      ["OCT", 0],
      ["NOV", 0],
      ["DEC", 0],
      ["JAN", 0],
      ["FEB", 0],
      ["MAR", 0],
    ]);
  });

  it("calculates totals and Indian rupee words from edited payslip rows", () => {
    const totals = calculatePayslipTotals({
      earnings: [
        { label: "BASIC", amountInrCents: 33_334_00, sortOrder: 1 },
        { label: "SPECIAL ALLOWANCE", amountInrCents: 50_000_00, sortOrder: 2 },
      ],
      deductions: [
        { label: "PF", amountInrCents: 1_800_00, sortOrder: 1 },
        { label: "INCOME TAX", amountInrCents: 4_200_00, sortOrder: 2 },
      ],
    });

    expect(totals.totalEarningsInrCents).toBe(83_334_00);
    expect(totals.totalDeductionsInrCents).toBe(6_000_00);
    expect(totals.netPayInrCents).toBe(77_334_00);
    expect(formatPayslipAmountInWords(totals.netPayInrCents)).toBe(
      "Rupees Seventy Seven Thousand Three Hundred and Thirty Four Only",
    );
  });
});
