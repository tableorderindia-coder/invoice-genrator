import { describe, expect, it } from "vitest";

import {
  buildPnEmployeeSections,
  buildPnPeriodRows,
  type PnSourceRow,
} from "./pn-dashboard";

const sampleRows: PnSourceRow[] = [
  {
    employeeId: "emp_1",
    employeeName: "Asha",
    year: 2026,
    month: 1,
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
});
