import { describe, expect, it } from "vitest";

import type { PnEmployeeEditableRow, PnPeriodRow } from "./types";
import {
  buildEmployeeSectionTotals,
  buildPeriodTotals,
} from "./dashboard-table-totals";

const employeeRows: PnEmployeeEditableRow[] = [
  {
    payoutId: "p1",
    invoiceId: "inv1",
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
  },
  {
    payoutId: "p2",
    invoiceId: "inv2",
    invoiceNumber: "INV-2",
    year: 2026,
    month: 5,
    daysWorked: 20,
    daysInMonth: 31,
    dollarInwardUsdCents: 200_00,
    baseDollarInwardUsdCents: 200_00,
    onboardingAdvanceUsdCents: 0,
    reimbursementUsdCents: 3_00,
    reimbursementLabelsText: "Food",
    reimbursementInrCents: 240_00,
    appraisalAdvanceUsdCents: 0,
    appraisalAdvanceInrCents: 0,
    offboardingDeductionUsdCents: 1_00,
    effectiveDollarInwardUsdCents: 199_00,
    cashInInrCents: 16_000_00,
    employeeMonthlyUsdCents: 10_000,
    cashoutUsdInrRate: 82,
    paidUsdInrRate: 78,
    salaryPaidInrCents: 7_500_00,
    pfInrCents: 300_00,
    tdsInrCents: 100_00,
    actualPaidInrCents: 7_900_00,
    fxCommissionInrCents: 800_00,
    totalCommissionUsdCents: 8_00,
    commissionEarnedInrCents: 1_600_00,
    grossEarningsInrCents: 2_400_00,
    netProfitInrCents: 9_000_00,
    isSecurityDepositMonth: false,
  },
];

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

describe("dashboard table totals", () => {
  it("sums employee totals and computes weighted rates", () => {
    const totals = buildEmployeeSectionTotals(employeeRows);

    expect(totals.daysWorked).toBe(30);
    expect(totals.actualPaidInrCents).toBe(23_100_00);
    expect(totals.netProfitInrCents).toBe(21_000_00);
    expect(totals.cashoutUsdInrRate).toBeCloseTo(80.6667, 3);
    expect(totals.paidUsdInrRate).toBeCloseTo(76, 3);
  });

  it("computes period totals and respects P/L toggles", () => {
    const totals = buildPeriodTotals(periodRows, {
      includeExpenses: false,
      includeReimbursements: true,
    });

    expect(totals.expensesInrCents).toBe(1_500_00);
    expect(totals.companyReimbursementInrCents).toBe(240_00);
    expect(totals.netPlInrCents).toBe(21_240_00);
  });
});
