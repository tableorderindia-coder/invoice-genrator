import { describe, expect, it } from "vitest";

import {
  buildAddedEmployeeCashFlowEntry,
  buildEmployeeCashFlowInvoiceOptionsInput,
  getDaysInMonthFromMonthKey,
  resolveEmployeeCashFlowMonthKey,
} from "./employee-cash-flow-page-state";

describe("employee cash flow page state", () => {
  it("keeps payment month separate from invoice option filtering", () => {
    expect(buildEmployeeCashFlowInvoiceOptionsInput("company_1")).toEqual({
      companyId: "company_1",
    });
  });

  it("resolves legacy month/year search params into a payment month key", () => {
    expect(
      resolveEmployeeCashFlowMonthKey("4", "2026", new Date("2026-06-01T00:00:00Z")),
    ).toBe("2026-04");
  });

  it("falls back to the current month when no payment month is provided", () => {
    expect(
      resolveEmployeeCashFlowMonthKey(undefined, undefined, new Date("2026-06-01T00:00:00Z")),
    ).toBe("2026-06");
  });

  it("derives the actual number of days from a payment month key", () => {
    expect(getDaysInMonthFromMonthKey("2026-02")).toBe(28);
    expect(getDaysInMonthFromMonthKey("2026-04")).toBe(30);
    expect(getDaysInMonthFromMonthKey("2026-05")).toBe(31);
  });

  it("prefills added employee rows from the selected cashed-out invoice", () => {
    expect(
      buildAddedEmployeeCashFlowEntry({
        employee: {
          id: "emp_1",
          fullName: "Asha",
          payoutMonthlyUsdCents: 2_000_00,
        },
        paymentMonth: "2026-05",
        invoiceDollarInboundUsdCents: 7_500_00,
        invoiceUsdInrRate: 84.25,
      }),
    ).toMatchObject({
      employeeId: "emp_1",
      employeeNameSnapshot: "Asha",
      daysWorked: 0,
      daysInMonth: 31,
      monthlyPaidUsdCents: 2_000_00,
      baseDollarInwardUsdCents: 7_500_00,
      cashoutUsdInrRate: 84.25,
      isNonInvoiceEmployee: true,
    });
  });

  it("carries onboarding and offboarding defaults into added employee rows", () => {
    expect(
      buildAddedEmployeeCashFlowEntry({
        employee: {
          id: "emp_1",
          fullName: "Asha",
          payoutMonthlyUsdCents: 2_000_00,
          onboardingAdvanceUsdCents: 900_00,
          offboardingDeductionUsdCents: 200_00,
        },
        paymentMonth: "2026-05",
        invoiceDollarInboundUsdCents: 7_500_00,
        invoiceUsdInrRate: 84.25,
      }),
    ).toMatchObject({
      onboardingAdvanceUsdCents: 900_00,
      offboardingDeductionUsdCents: 200_00,
    });
  });
});
