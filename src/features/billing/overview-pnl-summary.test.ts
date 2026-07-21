import { describe, expect, it } from "vitest";

import {
  buildOverviewCompanySummaryRows,
  buildOverviewGrandTotalRow,
  formatOverviewPeriodLabel,
  resolveOverviewMonthRange,
} from "./overview-pnl-summary";
import type { PnDashboardData, PnPeriodRow } from "./types";

function periodRow(month: number, values: Partial<PnPeriodRow> = {}): PnPeriodRow {
  return {
    year: 2026,
    month,
    dollarInwardUsdCents: 100_00,
    onboardingAdvanceUsdCents: 0,
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

describe("overview P&L summary helpers", () => {
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

  it("falls back to the latest available month when no month is selected", () => {
    expect(
      resolveOverviewMonthRange({
        startMonth: undefined,
        endMonth: undefined,
        availableMonths: ["2026-04", "2026-06", "2026-05"],
        currentMonth: "2026-08",
      }),
    ).toMatchObject({
      startMonth: "2026-06",
      endMonth: "2026-06",
      monthKeys: ["2026-06"],
    });
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

  it("formats one-month and multi-month labels", () => {
    expect(formatOverviewPeriodLabel("2026-07", "2026-07")).toBe("July 2026");
    expect(formatOverviewPeriodLabel("2026-04", "2026-07")).toBe(
      "April 2026 - July 2026",
    );
  });
});
