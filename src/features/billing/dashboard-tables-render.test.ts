// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardTables } from "../../../app/dashboard/dashboard-tables";
import type { PnDashboardData, PnEmployeeEditableRow, PnPeriodRow } from "./types";

const employeeRow: PnEmployeeEditableRow = {
  payoutId: "payout_1",
  invoiceId: "inv_1",
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
};

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

const baseData: PnDashboardData = {
  companyId: "comp_1",
  employeeSections: [],
  employeeEditableSections: [
    {
      employeeId: "emp_1",
      employeeName: "Alice",
      totalGrossEarningsInrCents: 3_000_00,
      totalNetProfitInrCents: 12_000_00,
      rows: [employeeRow],
    },
  ],
  periodRows,
};

describe("dashboard tables rendering", () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders a totals row aligned to the visible employee columns", () => {
    render(
      createElement(DashboardTables, {
        view: "employee",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard",
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    const totalsRow = within(table).getByText("Totals").closest("tr");

    expect(totalsRow).not.toBeNull();
    expect(within(totalsRow as HTMLElement).getAllByRole("cell")).toHaveLength(headers.length);
  });

  it("updates the period totals net p/l when expenses are excluded", () => {
    render(
      createElement(DashboardTables, {
        view: "period",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard",
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    expect(screen.getByText("Expenses: in P/L")).not.toBeNull();
    expect(screen.getByText("+ ₹19,740.00")).not.toBeNull();

    fireEvent.click(screen.getAllByRole("checkbox")[0] as HTMLInputElement);

    expect(screen.getByText("+ ₹21,240.00")).not.toBeNull();
  });

  it("renders monthly period columns in the requested order after effective dollar inward", () => {
    render(
      createElement(DashboardTables, {
        view: "period",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard",
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    const headerTexts = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.replace(/\s+/g, " ").trim() ?? "");

    expect(headerTexts).toEqual([
      "Period",
      "Dollar inward",
      "Effective dollar inward",
      "Actual paid (INR)",
      "PF (INR)",
      "TDS (INR)",
      "Salary paid (INR)",
      "FX commission (INR)",
      "Total commission (USD)",
      "Commission earned (INR)",
      "Gross earnings (INR)",
      "In P/LExpenses (INR)",
      "In P/LReimb. (USD)",
      "In P/LReimb. (INR)",
      "Net P/L (INR)",
    ]);
  });
});
