import { describe, expect, it } from "vitest";

import {
  buildOverviewMonthlyPnlRows,
  buildOverviewMonthlyPnlTotals,
  buildOverviewDashboardHref,
  buildOverviewCompanySummaryRows,
  buildOverviewGrandTotalRow,
  calculateOverviewMonthlyNetPlInrCents,
  formatOverviewPeriodLabel,
  resolveOverviewMonthRange,
} from "./overview-pnl-summary";
import type {
  PnDashboardData,
  PnEmployeeEditableRow,
  PnPeriodRow,
} from "./types";

function periodRow(month: number, values: Partial<PnPeriodRow> = {}): PnPeriodRow {
  return {
    year: 2026,
    month,
    dollarInwardUsdCents: 100_00,
    onboardingAdvanceUsdCents: 0,
    advancesInrCents: 0,
    reimbursementUsdCents: 0,
    reimbursementLabelsText: "",
    reimbursementInrCents: 0,
    appraisalAdvanceUsdCents: 0,
    appraisalAdvanceInrCents: 0,
    offboardingDeductionUsdCents: 0,
    effectiveDollarInwardUsdCents: 100_00,
    cashoutUsdInrRate: 80,
    cashInInrCents: 8_000_00,
    paidUsdInrRate: 78,
    pfInrCents: 500_00,
    tdsInrCents: 200_00,
    actualPaidInrCents: 7_720_00,
    salaryPaidInrCents: 7_020_00,
    fxCommissionInrCents: 1_000_00,
    totalCommissionUsdCents: 10_00,
    commissionEarnedInrCents: 2_000_00,
    grossEarningsInrCents: 3_000_00,
    expensesInrCents: 300_00,
    companyReimbursementUsdCents: 2_00,
    companyReimbursementInrCents: 160_00,
    netPlInrCents: 5_000_00,
    ...values,
  };
}

function dashboardData(periodRows: PnPeriodRow[]): PnDashboardData {
  return {
    companyId: "company_1",
    employeeEditableSections: [],
    employeeSections: [],
    periodRows,
  };
}

function employeeRow(
  month: number,
  values: Partial<PnEmployeeEditableRow> = {},
): PnEmployeeEditableRow {
  return {
    payoutId: `payout_${month}`,
    invoiceId: `invoice_${month}`,
    invoiceNumber: `INV-${month}`,
    year: 2026,
    month,
    daysWorked: 31,
    daysInMonth: 31,
    dollarInwardUsdCents: 100_00,
    baseDollarInwardUsdCents: 100_00,
    onboardingAdvanceUsdCents: 0,
    reimbursementUsdCents: 0,
    reimbursementLabelsText: "",
    reimbursementInrCents: 0,
    appraisalAdvanceUsdCents: 0,
    appraisalAdvanceInrCents: 0,
    offboardingDeductionUsdCents: 0,
    effectiveDollarInwardUsdCents: 100_00,
    cashInInrCents: 9_000_00,
    cashoutUsdInrRate: 90,
    paidUsdInrRate: 85,
    monthlyPaidInrCents: 6_800_00,
    salaryPaidInrCents: 6_000_00,
    pfInrCents: 500_00,
    tdsInrCents: 300_00,
    actualPaidInrCents: 6_800_00,
    fxCommissionInrCents: 500_00,
    totalCommissionUsdCents: 100_00,
    commissionEarnedInrCents: 1_700_00,
    grossEarningsInrCents: 2_200_00,
    netProfitInrCents: 2_200_00,
    isSecurityDepositMonth: false,
    ...values,
  };
}

function dashboardDataWithEmployees(input: {
  companyId: string;
  employeeName: string;
  rows: PnEmployeeEditableRow[];
  periodRows: PnPeriodRow[];
}): PnDashboardData {
  return {
    companyId: input.companyId,
    employeeEditableSections: [
      {
        employeeId: `${input.companyId}_employee`,
        employeeName: input.employeeName,
        rows: input.rows,
        totalGrossEarningsInrCents: 0,
        totalNetProfitInrCents: 0,
      },
    ],
    employeeSections: [],
    periodRows: input.periodRows,
  };
}

describe("overview P&L summary helpers", () => {
  it("builds a monthly dashboard link with the selected companies and range", () => {
    const href = buildOverviewDashboardHref({
      companyIds: ["company_a", "company_b"],
      monthKeys: ["2026-05", "2026-06", "2026-07"],
    });
    const params = new URL(href, "http://localhost").searchParams;

    expect(href.startsWith("/dashboard?")).toBe(true);
    expect(params.get("view")).toBe("period");
    expect(params.get("periodType")).toBe("monthly");
    expect(params.getAll("companyIds")).toEqual(["company_a", "company_b"]);
    expect(params.getAll("paymentMonths")).toEqual(["2026-05", "2026-06", "2026-07"]);
  });

  it("returns one month key for a single-month range", () => {
    expect(
      resolveOverviewMonthRange({
        startMonth: "2026-07",
        endMonth: "2026-07",
        availableMonths: [],
        currentMonth: "2026-08",
      }),
    ).toEqual({
      startMonth: "2026-07",
      endMonth: "2026-07",
      monthKeys: ["2026-07"],
    });
  });

  it("expands every inclusive month between start and end", () => {
    expect(
      resolveOverviewMonthRange({
        startMonth: "2026-04",
        endMonth: "2026-07",
        availableMonths: [],
        currentMonth: "2026-08",
      }).monthKeys,
    ).toEqual(["2026-04", "2026-05", "2026-06", "2026-07"]);
  });

  it("normalizes reversed start and end months", () => {
    expect(
      resolveOverviewMonthRange({
        startMonth: "2026-07",
        endMonth: "2026-05",
        availableMonths: [],
        currentMonth: "2026-08",
      }),
    ).toMatchObject({
      startMonth: "2026-05",
      endMonth: "2026-07",
      monthKeys: ["2026-05", "2026-06", "2026-07"],
    });
  });

  it("defaults to every available financial-year month when no period is selected", () => {
    expect(
      resolveOverviewMonthRange({
        startMonth: undefined,
        endMonth: undefined,
        availableMonths: ["2026-04", "2026-06", "2026-05", "2026-08"],
        currentMonth: "2026-08",
      }),
    ).toMatchObject({
      startMonth: "2026-04",
      endMonth: "2026-08",
      monthKeys: ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08"],
    });
  });

  it("uses selected period inputs to narrow the financial-year months", () => {
    expect(
      resolveOverviewMonthRange({
        startMonth: "2026-05",
        endMonth: "2026-06",
        availableMonths: ["2026-04", "2026-05", "2026-06", "2026-08"],
        currentMonth: "2026-08",
      }).monthKeys,
    ).toEqual(["2026-05", "2026-06"]);
  });

  it("aggregates company rows for the selected period only", () => {
    const rows = buildOverviewCompanySummaryRows({
      companies: [{ id: "company_1", name: "Wizard" }],
      dashboardDataByCompanyId: new Map([
        [
          "company_1",
          dashboardData([
            periodRow(4, { dollarInwardUsdCents: 100_00, cashInInrCents: 8_000_00 }),
            periodRow(5, { dollarInwardUsdCents: 200_00, cashInInrCents: 16_000_00 }),
            periodRow(8, { dollarInwardUsdCents: 999_00, cashInInrCents: 99_000_00 }),
          ]),
        ],
      ]),
      monthKeys: ["2026-04", "2026-05"],
      periodLabel: "April 2026 - May 2026",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      companyId: "company_1",
      companyName: "Wizard",
      periodLabel: "April 2026 - May 2026",
    });
    expect(rows[0]?.totals.dollarInwardUsdCents).toBe(300_00);
    expect(rows[0]?.totals.cashInInrCents).toBe(24_000_00);
  });

  it("builds a grand total from company summary rows", () => {
    const companyRows = buildOverviewCompanySummaryRows({
      companies: [
        { id: "company_1", name: "Wizard" },
        { id: "company_2", name: "Arena" },
      ],
      dashboardDataByCompanyId: new Map([
        ["company_1", dashboardData([periodRow(7, { dollarInwardUsdCents: 100_00 })])],
        ["company_2", dashboardData([periodRow(7, { dollarInwardUsdCents: 250_00 })])],
      ]),
      monthKeys: ["2026-07"],
      periodLabel: "July 2026",
    });

    const total = buildOverviewGrandTotalRow(companyRows, "July 2026");

    expect(total.companyName).toBe("Total");
    expect(total.totals.dollarInwardUsdCents).toBe(350_00);
    expect(total.sourcePeriodRows).toHaveLength(2);
  });

  it("matches monthly dashboard P&L rows across companies and keeps zero months", () => {
    const companyOne = dashboardDataWithEmployees({
      companyId: "company_1",
      employeeName: "A",
      rows: [
        employeeRow(7, {
          effectiveDollarInwardUsdCents: 110_00,
          onboardingAdvanceUsdCents: 10_00,
          cashoutUsdInrRate: 90,
          paidUsdInrRate: 85,
          salaryPaidInrCents: 6_000_00,
          pfInrCents: 500_00,
          tdsInrCents: 300_00,
        }),
      ],
      periodRows: [
        periodRow(7, {
          effectiveDollarInwardUsdCents: 110_00,
          cashoutUsdInrRate: 90,
          cashInInrCents: 9_900_00,
          salaryPaidInrCents: 6_000_00,
          pfInrCents: 500_00,
          tdsInrCents: 300_00,
          fxCommissionInrCents: 550_00,
          commissionEarnedInrCents: 2_550_00,
          grossEarningsInrCents: 3_100_00,
          expensesInrCents: 200_00,
          advancesInrCents: 900_00,
        }),
      ],
    });
    const companyTwo = dashboardDataWithEmployees({
      companyId: "company_2",
      employeeName: "B",
      rows: [
        employeeRow(7, {
          effectiveDollarInwardUsdCents: 220_00,
          onboardingAdvanceUsdCents: 20_00,
          cashoutUsdInrRate: 100,
          paidUsdInrRate: 90,
          salaryPaidInrCents: 15_000_00,
          pfInrCents: 1_000_00,
          tdsInrCents: 500_00,
        }),
      ],
      periodRows: [
        periodRow(7, {
          effectiveDollarInwardUsdCents: 220_00,
          cashoutUsdInrRate: 100,
          cashInInrCents: 22_000_00,
          salaryPaidInrCents: 15_000_00,
          pfInrCents: 1_000_00,
          tdsInrCents: 500_00,
          fxCommissionInrCents: 2_200_00,
          commissionEarnedInrCents: 3_300_00,
          grossEarningsInrCents: 5_500_00,
          expensesInrCents: 300_00,
          advancesInrCents: 2_000_00,
        }),
      ],
    });

    const rows = buildOverviewMonthlyPnlRows({
      dashboardDataByCompanyId: new Map([
        ["company_1", companyOne],
        ["company_2", companyTwo],
      ]),
      monthKeys: ["2026-07", "2026-08"],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      monthKey: "2026-07",
      periodLabel: "July 2026",
      effectiveDollarInwardUsdCents: 330_00,
      cashoutUsdInrRate: expect.closeTo(96.6667, 4),
      effectiveInwardInrCents: 31_900_00,
      salaryPaidInrCents: 21_000_00,
      pfInrCents: 1_500_00,
      tdsInrCents: 800_00,
      expensesInrCents: 500_00,
      advancesInrCents: 2_900_00,
      fxGainInrCents: 2_750_00,
      operatingMarginInrCents: 5_850_00,
      grossPnlInrCents: 8_600_00,
      netPnlBeforeAdvanceInrCents: 8_100_00,
    });
    expect(rows[1]).toMatchObject({
      monthKey: "2026-08",
      periodLabel: "August 2026",
      effectiveDollarInwardUsdCents: 0,
      cashoutUsdInrRate: null,
      grossPnlInrCents: 0,
      netPnlBeforeAdvanceInrCents: 0,
    });
  });

  it("deducts advances only from net P&L and totals monthly rows", () => {
    const rows = buildOverviewMonthlyPnlRows({
      dashboardDataByCompanyId: new Map([
        [
          "company_1",
          dashboardDataWithEmployees({
            companyId: "company_1",
            employeeName: "A",
            rows: [
              employeeRow(7, {
                effectiveDollarInwardUsdCents: 110_00,
                onboardingAdvanceUsdCents: 10_00,
              }),
            ],
            periodRows: [
              periodRow(7, {
                effectiveDollarInwardUsdCents: 110_00,
                cashoutUsdInrRate: 90,
                cashInInrCents: 9_900_00,
                grossEarningsInrCents: 2_200_00,
                expensesInrCents: 200_00,
                advancesInrCents: 900_00,
              }),
            ],
          }),
        ],
      ]),
      monthKeys: ["2026-07"],
    });
    const row = rows[0]!;

    expect(row.grossPnlInrCents).toBe(2_200_00);
    expect(calculateOverviewMonthlyNetPlInrCents(row, false)).toBe(1_100_00);
    expect(calculateOverviewMonthlyNetPlInrCents(row, true)).toBe(2_000_00);
    expect(buildOverviewMonthlyPnlTotals(rows)).toMatchObject({
      periodLabel: "Totals",
      cashoutUsdInrRate: 90,
      grossPnlInrCents: 2_200_00,
      advancesInrCents: 900_00,
      netPnlBeforeAdvanceInrCents: 2_000_00,
    });
  });

  it("uses dashboard period values without recalculating them from employee rows", () => {
    const rows = buildOverviewMonthlyPnlRows({
      dashboardDataByCompanyId: new Map([
        [
          "company_1",
          dashboardDataWithEmployees({
            companyId: "company_1",
            employeeName: "A",
            rows: [
              employeeRow(7, { cashoutUsdInrRate: 0, paidUsdInrRate: 85 }),
              employeeRow(8, { cashoutUsdInrRate: 90, paidUsdInrRate: 0 }),
            ],
            periodRows: [
              periodRow(7, {
                effectiveDollarInwardUsdCents: 100_00,
                cashoutUsdInrRate: 0,
                cashInInrCents: 0,
                fxCommissionInrCents: 0,
                commissionEarnedInrCents: 1_700_00,
                grossEarningsInrCents: 1_700_00,
              }),
              periodRow(8, {
                effectiveDollarInwardUsdCents: 100_00,
                cashoutUsdInrRate: 90,
                cashInInrCents: 9_000_00,
                fxCommissionInrCents: 500_00,
                commissionEarnedInrCents: 1_700_00,
                grossEarningsInrCents: 2_200_00,
              }),
            ],
          }),
        ],
      ]),
      monthKeys: ["2026-07", "2026-08"],
    });

    expect(rows[0]).toMatchObject({
      cashoutUsdInrRate: null,
      effectiveInwardInrCents: 0,
      fxGainInrCents: 0,
      operatingMarginInrCents: 1_700_00,
      grossPnlInrCents: 1_700_00,
      netPnlBeforeAdvanceInrCents: 1_400_00,
    });
    expect(rows[1]).toMatchObject({
      cashoutUsdInrRate: 90,
      effectiveInwardInrCents: 9_000_00,
      fxGainInrCents: 500_00,
      operatingMarginInrCents: 1_700_00,
      grossPnlInrCents: 2_200_00,
      netPnlBeforeAdvanceInrCents: 1_900_00,
    });
  });

  it("returns the empty state input when no companies are accessible", () => {
    expect(
      buildOverviewMonthlyPnlRows({
        dashboardDataByCompanyId: new Map(),
        monthKeys: ["2026-07"],
      }),
    ).toEqual([]);
  });

  it("formats one-month and multi-month labels", () => {
    expect(formatOverviewPeriodLabel("2026-07", "2026-07")).toBe("July 2026");
    expect(formatOverviewPeriodLabel("2026-04", "2026-07")).toBe(
      "April 2026 - July 2026",
    );
  });
});
