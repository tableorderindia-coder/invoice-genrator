import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildPnDashboardDataFromSummaryRows } from "./pn-summary-store";
import type { PnCompanyMonthSummaryRow, PnEmployeeMonthSummaryRow } from "./pn-summary-store";

const projectRoot = process.cwd();

function readSource(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

function employeeSummary(
  overrides: Partial<PnEmployeeMonthSummaryRow> = {},
): PnEmployeeMonthSummaryRow {
  return {
    companyId: "company_a",
    employeeId: "employee_a",
    employeeName: "Ankit Singh",
    paymentMonth: "2026-07",
    year: 2026,
    month: 7,
    payoutId: "entry_a",
    invoiceId: "invoice_a",
    invoiceNumber: "INV-001",
    daysWorked: 31,
    daysInMonth: 31,
    dollarInwardUsdCents: 100_00,
    baseDollarInwardUsdCents: 100_00,
    onboardingAdvanceUsdCents: 10_00,
    reimbursementUsdCents: 20_00,
    reimbursementLabelsText: "Travel",
    reimbursementInrCents: 1_700_00,
    appraisalAdvanceUsdCents: 5_00,
    appraisalAdvanceInrCents: 425_00,
    offboardingDeductionUsdCents: 2_00,
    effectiveDollarInwardUsdCents: 133_00,
    cashInInrCents: 8_500_00,
    cashoutUsdInrRate: 85,
    paidUsdInrRate: 84,
    monthlyPaidInrCents: 80_000_00,
    salaryPaidInrCents: 70_000_00,
    pfInrCents: 5_000_00,
    tdsInrCents: 5_000_00,
    actualPaidInrCents: 80_000_00,
    fxCommissionInrCents: 1_000_00,
    totalCommissionUsdCents: 3_00,
    commissionEarnedInrCents: 252_00,
    grossEarningsInrCents: 1_252_00,
    netProfitInrCents: 71_252_00,
    isSecurityDepositMonth: false,
    rebuiltAt: "2026-07-22T10:00:00.000Z",
    sourceUpdatedAt: "2026-07-22T09:59:00.000Z",
    ...overrides,
  };
}

function companySummary(
  overrides: Partial<PnCompanyMonthSummaryRow> = {},
): PnCompanyMonthSummaryRow {
  return {
    companyId: "company_a",
    paymentMonth: "2026-07",
    year: 2026,
    month: 7,
    dollarInwardUsdCents: 100_00,
    onboardingAdvanceUsdCents: 10_00,
    reimbursementUsdCents: 30_00,
    reimbursementLabelsText: "Travel",
    reimbursementInrCents: 2_550_00,
    appraisalAdvanceUsdCents: 5_00,
    appraisalAdvanceInrCents: 425_00,
    offboardingDeductionUsdCents: 2_00,
    effectiveDollarInwardUsdCents: 133_00,
    cashoutUsdInrRate: 85,
    cashInInrCents: 8_500_00,
    paidUsdInrRate: 84,
    monthlyPaidInrCents: 80_000_00,
    pfInrCents: 5_000_00,
    tdsInrCents: 5_000_00,
    actualPaidInrCents: 80_000_00,
    salaryPaidInrCents: 70_000_00,
    fxCommissionInrCents: 1_000_00,
    totalCommissionUsdCents: 3_00,
    commissionEarnedInrCents: 252_00,
    grossEarningsInrCents: 1_252_00,
    expensesInrCents: 500_00,
    companyReimbursementUsdCents: 10_00,
    companyReimbursementInrCents: 850_00,
    netPlInrCents: 71_252_00,
    rebuiltAt: "2026-07-22T10:00:00.000Z",
    sourceUpdatedAt: "2026-07-22T09:59:00.000Z",
    ...overrides,
  };
}

describe("P&L summary store", () => {
  it("rebuilds dashboard data from persisted monthly summary rows", () => {
    const data = buildPnDashboardDataFromSummaryRows({
      companyId: "company_a",
      periodType: "monthly",
      employeeRows: [employeeSummary()],
      companyRows: [companySummary()],
    });

    expect(data.employeeEditableSections).toHaveLength(1);
    expect(data.employeeEditableSections[0]?.rows[0]).toMatchObject({
      payoutId: "entry_a",
      invoiceNumber: "INV-001",
      monthlyPaidInrCents: 80_000_00,
      actualPaidInrCents: 80_000_00,
      salaryPaidInrCents: 70_000_00,
      netProfitInrCents: 71_252_00,
    });
    expect(data.employeeSections[0]?.rows[0]).toMatchObject({
      reimbursementInrCents: 1_700_00,
      appraisalAdvanceInrCents: 425_00,
      grossEarningsInrCents: 1_252_00,
    });
    expect(data.periodRows[0]).toMatchObject({
      month: 7,
      expensesInrCents: 500_00,
      companyReimbursementUsdCents: 10_00,
      netPlInrCents: 71_252_00,
    });
  });

  it("rolls monthly company summaries into fiscal-year dashboard rows", () => {
    const data = buildPnDashboardDataFromSummaryRows({
      companyId: "company_a",
      periodType: "yearly",
      employeeRows: [
        employeeSummary(),
        employeeSummary({ paymentMonth: "2026-08", month: 8, monthlyPaidInrCents: 90_000_00 }),
      ],
      companyRows: [
        companySummary(),
        companySummary({
          paymentMonth: "2026-08",
          month: 8,
          dollarInwardUsdCents: 200_00,
          monthlyPaidInrCents: 90_000_00,
          expensesInrCents: 700_00,
          netPlInrCents: 75_000_00,
        }),
      ],
    });

    expect(data.periodRows).toHaveLength(1);
    expect(data.periodRows[0]).toMatchObject({
      fiscalLabel: "Apr 2026-Mar 2027",
      dollarInwardUsdCents: 300_00,
      monthlyPaidInrCents: 170_000_00,
      expensesInrCents: 1_200_00,
      netPlInrCents: 146_252_00,
    });
  });

  it("uses persisted summaries from Overview and Dashboard pages", () => {
    const overviewSource = readSource("app/page.tsx");
    const dashboardSource = readSource("app/dashboard/page.tsx");

    expect(overviewSource).toContain("getPnDashboardSummaryData");
    expect(dashboardSource).toContain("getPnDashboardSummaryData");
    expect(overviewSource).not.toContain("getCachedPnDashboardData");
    expect(dashboardSource).not.toContain("getCachedPnDashboardData");
  });

  it("refreshes summaries synchronously from financial write actions", () => {
    const actionsSource = readSource("src/features/billing/actions.ts");

    expect(actionsSource).toContain("rebuildPnSummariesForCompany");
    expect(actionsSource).toContain("rebuildPnSummariesForInvoice");
    expect(actionsSource).toMatch(/saveCompanyExpenseAction[\s\S]+refreshPnSummariesForCompany/);
    expect(actionsSource).toMatch(/saveInvoicePaymentEmployeeEntriesAction[\s\S]+refreshPnSummariesForCompany/);
    expect(actionsSource).toMatch(/saveMonthlyPayrollRowsAction[\s\S]+refreshPnSummariesForCompany/);
    expect(actionsSource).toMatch(/cashOutInvoiceAction[\s\S]+refreshPnSummariesForInvoice/);
    expect(actionsSource).toMatch(/deleteInvoiceAction[\s\S]+getInvoiceCompanyId[\s\S]+refreshPnSummariesForCompany/);
  });

  it("exposes a protected one-time summary rebuild route", () => {
    const routeSource = readSource("app/api/admin/pn-summaries/rebuild/route.ts");

    expect(routeSource).toContain("requireApiAccess");
    expect(routeSource).toContain('page: "dashboard"');
    expect(routeSource).toContain("edit: true");
    expect(routeSource).toContain("rebuildPnSummariesForCompany");
  });
});
