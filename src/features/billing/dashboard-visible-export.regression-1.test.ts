import { describe, expect, it } from "vitest";

import {
  buildDashboardEmployeeTable,
  buildDashboardPeriodTable,
} from "./dashboard-export";
import type { PnDashboardData, PnEmployeeEditableRow, PnPeriodRow } from "./types";

// Regression: ISSUE-006 - dashboard exports included hidden legacy columns
// Found by /qa on 2026-08-03
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-08-03.md

const employeeRow = {
  payoutId: "pay_1",
  invoiceId: "inv_1",
  invoiceNumber: "INV-1",
  year: 2026,
  month: 7,
  daysWorked: 31,
  daysInMonth: 31,
  dollarInwardUsdCents: 1_000_00,
  baseDollarInwardUsdCents: 1_000_00,
  onboardingAdvanceUsdCents: 0,
  reimbursementUsdCents: 0,
  reimbursementLabelsText: "",
  reimbursementInrCents: 0,
  appraisalAdvanceUsdCents: 0,
  appraisalAdvanceInrCents: 0,
  offboardingDeductionUsdCents: 0,
  effectiveDollarInwardUsdCents: 1_000_00,
  cashInInrCents: 86_000_00,
  cashoutUsdInrRate: 86,
  paidUsdInrRate: 84,
  monthlyPaidInrCents: 1_00_000_00,
  actualPaidInrCents: 1_00_000_00,
  pfInrCents: 3_600_00,
  tdsInrCents: 10_000_00,
  salaryPaidInrCents: 86_400_00,
  fxCommissionInrCents: 2_000_00,
  totalCommissionUsdCents: 1_000_00,
  commissionEarnedInrCents: 70_000_00,
  grossEarningsInrCents: 72_000_00,
  netProfitInrCents: 72_000_00,
  isSecurityDepositMonth: false,
} satisfies PnEmployeeEditableRow;

const periodRow = {
  ...employeeRow,
  advancesInrCents: 0,
  expensesInrCents: 0,
  companyReimbursementUsdCents: 0,
  companyReimbursementInrCents: 0,
  netPlInrCents: 72_000_00,
} satisfies PnPeriodRow;

const data: PnDashboardData = {
  companyId: "company_1",
  employeeSections: [],
  employeeEditableSections: [
    {
      employeeId: "emp_1",
      employeeName: "Aisha Rao",
      totalGrossEarningsInrCents: employeeRow.grossEarningsInrCents,
      totalNetProfitInrCents: employeeRow.netProfitInrCents,
      rows: [employeeRow],
    },
  ],
  periodRows: [periodRow],
};

describe("visible dashboard exports", () => {
  it("exports only selected employee columns in screen order", () => {
    const table = buildDashboardEmployeeTable(data, {
      includeAdvances: true,
      columns: ["effectiveDollarInward", "cashoutRate", "salaryPaid", "netProfit"],
    });

    expect(table.headers).toEqual([
      "Employee",
      "Month",
      "Effective dollar inward USD",
      "Received / exchanged rate",
      "Salary paid INR",
      "Net P/L INR",
    ]);
    expect(table.rows.every((row) => row.length === table.headers.length)).toBe(true);
  });

  it("exports only selected period columns in screen order", () => {
    const table = buildDashboardPeriodTable(data, "monthly", {
      includeExpenses: true,
      includeAdvances: true,
      includeReimbursements: true,
      columns: ["effectiveDollarInward", "cashoutRate", "salaryPaid", "expenses", "netPl"],
    });

    expect(table.headers).toEqual([
      "Period",
      "Effective dollar inward USD",
      "Received / exchanged rate",
      "Salary paid INR",
      "Expenses INR",
      "Net P/L INR",
    ]);
    expect(table.rows.every((row) => row.length === table.headers.length)).toBe(true);
  });
});
