// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import {
  buildSavedEmployeeCashFlowEntryJson,
  formatSavedPaymentMonth,
} from "./employee-cash-flow-saved-rows-helpers";

describe("employee cash flow saved rows helpers", () => {
  it("preserves the edited actual paid value in the submitted row JSON", () => {
    expect(
      buildSavedEmployeeCashFlowEntryJson({
        id: "row_1",
        employeeId: "emp_1",
        companyId: "comp_1",
        paymentMonth: "2026-04",
        employeeNameSnapshot: "Asha",
        invoiceId: "inv_1",
        invoiceNumber: "2026/004",
        clientBatchId: "batch_1",
        daysWorked: 10,
        daysInMonth: 30,
        monthlyPaidUsdCents: 100_00,
        baseDollarInwardUsdCents: 0,
        onboardingAdvanceUsdCents: 0,
        reimbursementUsdCents: 0,
        reimbursementLabelsText: "",
        appraisalAdvanceUsdCents: 0,
        offboardingDeductionUsdCents: 0,
        cashoutUsdInrRate: 84,
        paidUsdInrRate: 80,
        pfInrCents: 0,
        tdsInrCents: 0,
        actualPaidInrCents: 9_999,
        fxCommissionInrCents: 0,
        totalCommissionUsdCents: 0,
        commissionEarnedInrCents: 0,
        grossEarningsInrCents: 0,
        isNonInvoiceEmployee: true,
        isPaid: false,
        notes: "manual override",
      }),
    ).toContain('"actualPaidInrCents":9999');
  });

  it("formats payment months with the shared month label helper", () => {
    expect(formatSavedPaymentMonth("2026-04")).toBe("April 2026");
  });
});
