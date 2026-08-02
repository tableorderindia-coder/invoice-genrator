import { describe, expect, it, vi } from "vitest";
import PDFDocument from "pdfkit";

import {
  buildDashboardCompanyCsv,
  buildDashboardCompanyTable,
  buildDashboardEmployeeCsv,
  buildDashboardEmployeeTable,
  buildDashboardExportPdf,
  buildDashboardPeriodCsv,
  buildDashboardPeriodTable,
} from "./dashboard-export";
import {
  buildOverviewCompanySummaryRows,
  type OverviewPnlSummaryRow,
} from "./overview-pnl-summary";
import type { PnDashboardData } from "./types";

const dashboardData: PnDashboardData = {
  companyId: "company_1",
  employeeSections: [],
  employeeEditableSections: [
    {
      employeeId: "emp_1",
      employeeName: "Ankit Singh",
      totalGrossEarningsInrCents: 0,
      totalNetProfitInrCents: 0,
      rows: [
        {
          payoutId: "payout_1",
          invoiceId: "invoice_1",
          invoiceNumber: "INV-1",
          year: 2026,
          month: 7,
          daysWorked: 15.5,
          daysInMonth: 31,
          dollarInwardUsdCents: 100000,
          baseDollarInwardUsdCents: 100000,
          onboardingAdvanceUsdCents: 10000,
          reimbursementUsdCents: 5000,
          reimbursementLabelsText: "Laptop",
          reimbursementInrCents: 420000,
          appraisalAdvanceUsdCents: 2000,
          appraisalAdvanceInrCents: 168000,
          offboardingDeductionUsdCents: 1000,
          effectiveDollarInwardUsdCents: 116000,
          cashInInrCents: 9744000,
          cashoutUsdInrRate: 84,
          paidUsdInrRate: 82,
          monthlyPaidInrCents: 18000000,
          actualPaidInrCents: 9000000,
          pfInrCents: 180000,
          tdsInrCents: 250000,
          salaryPaidInrCents: 8570000,
          fxCommissionInrCents: 232000,
          totalCommissionUsdCents: 11000,
          commissionEarnedInrCents: 902000,
          grossEarningsInrCents: 1134000,
          netProfitInrCents: 1000000,
          isSecurityDepositMonth: false,
        },
      ],
    },
  ],
  periodRows: [
    {
      year: 2026,
      month: 7,
      dollarInwardUsdCents: 100000,
      onboardingAdvanceUsdCents: 10000,
      advancesInrCents: 840000,
      reimbursementUsdCents: 5000,
      reimbursementLabelsText: "Laptop",
      reimbursementInrCents: 420000,
      appraisalAdvanceUsdCents: 2000,
      appraisalAdvanceInrCents: 168000,
      offboardingDeductionUsdCents: 1000,
      effectiveDollarInwardUsdCents: 116000,
      cashoutUsdInrRate: 84,
      cashInInrCents: 9744000,
      paidUsdInrRate: 82,
      monthlyPaidInrCents: 18000000,
      actualPaidInrCents: 9000000,
      pfInrCents: 180000,
      tdsInrCents: 250000,
      salaryPaidInrCents: 8570000,
      fxCommissionInrCents: 232000,
      totalCommissionUsdCents: 11000,
      commissionEarnedInrCents: 902000,
      grossEarningsInrCents: 1134000,
      expensesInrCents: 300000,
      companyReimbursementUsdCents: 10000,
      companyReimbursementInrCents: 840000,
      netPlInrCents: 700000,
    },
  ],
};

const companyRows: OverviewPnlSummaryRow[] = [
  {
    companyId: "company_1",
    companyName: "Arena",
    periodLabel: "July 2026",
    sourcePeriodRows: dashboardData.periodRows,
    totals: {
      daysWorked: null,
      dollarInwardUsdCents: 100000,
      onboardingAdvanceUsdCents: 10000,
      advancesInrCents: 840000,
      reimbursementUsdCents: 5000,
      reimbursementInrCents: 420000,
      appraisalAdvanceUsdCents: 2000,
      appraisalAdvanceInrCents: 168000,
      offboardingDeductionUsdCents: 1000,
      effectiveDollarInwardUsdCents: 116000,
      cashoutUsdInrRate: 84,
      cashInInrCents: 9744000,
      paidUsdInrRate: 82,
      monthlyPaidInrCents: 18000000,
      actualPaidInrCents: 9000000,
      pfInrCents: 180000,
      tdsInrCents: 250000,
      salaryPaidInrCents: 8570000,
      fxCommissionInrCents: 232000,
      totalCommissionUsdCents: 11000,
      commissionEarnedInrCents: 902000,
      grossEarningsInrCents: 1134000,
      expensesInrCents: 300000,
      companyReimbursementUsdCents: 10000,
      companyReimbursementInrCents: 840000,
      netPlInrCents: 1240000,
    },
  },
];

describe("dashboard export", () => {
  it("exports employee view with all dashboard columns and totals", () => {
    const csv = buildDashboardEmployeeCsv(dashboardData, { includeAdvances: true });

    expect(csv).toContain("Employee,Month,Invoice");
    expect(csv).toContain("Total commission USD");
    expect(csv).toContain("Advances INR,Net P/L INR");
    expect(csv).toContain("- ₹960.00");
    expect(csv).toContain('"Ankit Singh","July 2026","INV-1"');
    expect(csv).toContain('"Totals","",""');
  });

  it("matches employee export Net P/L to the advance inclusion state", () => {
    const included = buildDashboardEmployeeTable(dashboardData, {
      includeAdvances: true,
    });
    const excluded = buildDashboardEmployeeTable(dashboardData, {
      includeAdvances: false,
    });

    expect(included.rows[0]?.at(-1)).toBe("- ₹960.00");
    expect(included.rows[1]?.at(-1)).toBe("- ₹960.00");
    expect(excluded.rows[0]?.at(-1)).toBe("+ ₹7,440.00");
    expect(excluded.rows[1]?.at(-1)).toBe("+ ₹7,440.00");
  });

  it("exports period view with all period columns and totals", () => {
    const csv = buildDashboardPeriodCsv(dashboardData, "monthly", {
      includeExpenses: true,
      includeAdvances: true,
      includeReimbursements: true,
    });

    expect(csv).toContain("Period,Dollar inward USD");
    expect(csv).toContain("Expenses INR,Advances INR,Company reimbursements USD,Company reimbursements INR,Net P/L INR");
    expect(csv).toContain("+ ₹8,340.00");
    expect(csv).toContain('"July 2026"');
    expect(csv).toContain('"Totals"');
  });

  it("exports company-level overview rows", () => {
    const csv = buildDashboardCompanyCsv(companyRows);

    expect(csv).toContain("Company,Period,Total dollar inward");
    expect(csv).toContain('"Arena","July 2026"');
    expect(csv).toContain("Net P/L INR");
    expect(csv).toContain("Advances INR");
  });

  it.each([
    { includeExpenses: false, includeAdvances: false, includeReimbursements: false, net: "+ ₹11,340.00" },
    { includeExpenses: false, includeAdvances: false, includeReimbursements: true, net: "+ ₹19,740.00" },
    { includeExpenses: false, includeAdvances: true, includeReimbursements: false, net: "+ ₹2,940.00" },
    { includeExpenses: false, includeAdvances: true, includeReimbursements: true, net: "+ ₹11,340.00" },
    { includeExpenses: true, includeAdvances: false, includeReimbursements: false, net: "+ ₹8,340.00" },
    { includeExpenses: true, includeAdvances: false, includeReimbursements: true, net: "+ ₹16,740.00" },
    { includeExpenses: true, includeAdvances: true, includeReimbursements: false, net: "- ₹60.00" },
    { includeExpenses: true, includeAdvances: true, includeReimbursements: true, net: "+ ₹8,340.00" },
  ])(
    "uses the visible accounting state for period and company export tables: $includeExpenses/$includeAdvances/$includeReimbursements",
    (options) => {
      const periodTable = buildDashboardPeriodTable(dashboardData, "monthly", options);
      const summaryRows = buildOverviewCompanySummaryRows({
        companies: [{ id: "company_1", name: "Arena" }],
        dashboardDataByCompanyId: new Map([["company_1", dashboardData]]),
        monthKeys: ["2026-07"],
        periodLabel: "July 2026",
        accountingOptions: options,
      });
      const companyTable = buildDashboardCompanyTable(summaryRows);

      expect(periodTable.rows[0]?.at(-1)).toBe(options.net);
      expect(periodTable.rows[1]?.at(-1)).toBe(options.net);
      expect(companyTable.rows[0]?.at(-1)).toBe(options.net);
    },
  );

  it("renders dashboard export PDF buffers", async () => {
    const pdf = await buildDashboardExportPdf({
      title: "Dashboard export",
      subtitle: "Arena - July 2026",
      rows: [
        ["Employee", "Month", "Salary paid INR"],
        ["Ankit Singh", "July 2026", "85700.00"],
      ],
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("draws bordered table cells so dashboard columns do not visually merge", async () => {
    const rectSpy = vi.spyOn(PDFDocument.prototype, "rect");

    await buildDashboardExportPdf({
      title: "Dashboard export",
      subtitle: "Arena - July 2026",
      rows: [
        ["Period", "Dollar inward USD", "Salary paid INR", "Net P/L INR"],
        ["July 2026", "$1,000", "85700.00", "+ 10000.00"],
        ["Totals", "$1,000", "85700.00", "+ 10000.00"],
      ],
    });

    expect(rectSpy.mock.calls.length).toBeGreaterThanOrEqual(12);
    rectSpy.mockRestore();
  });
});
