import { describe, expect, it } from "vitest";

import { aggregateEmployeeCashFlowEditableEntries } from "./employee-cash-flow-entry-aggregation";

describe("aggregateEmployeeCashFlowEditableEntries", () => {
  it("collapses multiple invoice rows into one editable employee card", () => {
    const result = aggregateEmployeeCashFlowEditableEntries([
      {
        id: "row_1",
        employeeId: "emp_1",
        employeeNameSnapshot: "Asha",
        invoiceLineItemId: "line_1",
        daysWorked: 10,
        daysInMonth: 30,
        monthlyPaidUsdCents: 100_000,
        baseDollarInwardUsdCents: 50_000,
        onboardingAdvanceUsdCents: 5_000,
        offboardingDeductionUsdCents: 0,
        cashoutUsdInrRate: 84.5,
        paidUsdInrRate: 82.5,
        pfInrCents: 1_000,
        tdsInrCents: 2_000,
        actualPaidInrCents: 30_000,
        fxCommissionInrCents: 3_000,
        totalCommissionUsdCents: 4_000,
        commissionEarnedInrCents: 5_000,
        grossEarningsInrCents: 8_000,
        isNonInvoiceEmployee: false,
        isPaid: false,
      },
      {
        id: "row_2",
        employeeId: "emp_1",
        employeeNameSnapshot: "Asha",
        invoiceLineItemId: "line_2",
        daysWorked: 12,
        daysInMonth: 30,
        monthlyPaidUsdCents: 100_000,
        baseDollarInwardUsdCents: 25_000,
        onboardingAdvanceUsdCents: 0,
        offboardingDeductionUsdCents: 1_500,
        cashoutUsdInrRate: 84.5,
        paidUsdInrRate: 83.1,
        pfInrCents: 500,
        tdsInrCents: 800,
        actualPaidInrCents: 20_000,
        fxCommissionInrCents: 1_000,
        totalCommissionUsdCents: 2_500,
        commissionEarnedInrCents: 2_000,
        grossEarningsInrCents: 3_000,
        isNonInvoiceEmployee: false,
        isPaid: true,
        paidAt: "2026-04-11",
        notes: "saved",
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      employeeId: "emp_1",
      daysWorked: 22,
      daysInMonth: 30,
      monthlyPaidUsdCents: 100_000,
      baseDollarInwardUsdCents: 75_000,
      onboardingAdvanceUsdCents: 5_000,
      offboardingDeductionUsdCents: 1_500,
      paidUsdInrRate: 83.1,
      pfInrCents: 1_500,
      tdsInrCents: 2_800,
      actualPaidInrCents: 50_000,
      isPaid: true,
      paidAt: "2026-04-11",
      invoiceLineItemId: undefined,
      notes: "saved",
    });
  });
});
