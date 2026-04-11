import { describe, expect, it } from "vitest";
import type { EmployeeCashFlowMonthRow } from "./employee-cash-flow-types";

import {
  calculateCashInInrCents,
  calculateEffectiveDollarInwardUsdCents,
  calculateEmployeeMonthNetInrCents,
  resolveEmployeeCashFlowStatus,
} from "./employee-cash-flow";

describe("employee cash flow calculations", () => {
  it("adds onboarding and subtracts offboarding from base inward", () => {
    expect(
      calculateEffectiveDollarInwardUsdCents({
        baseDollarInwardUsdCents: 100_00,
        onboardingAdvanceUsdCents: 20_00,
        offboardingDeductionUsdCents: 5_00,
      }),
    ).toBe(115_00);
  });

  it("converts effective inward into INR cents using the cashout rate", () => {
    expect(
      calculateCashInInrCents({
        effectiveDollarInwardUsdCents: 115_00,
        cashoutUsdInrRate: 83.25,
      }),
    ).toBe(957_375);
  });

  it("returns a negative net when salary is paid before collections arrive", () => {
    expect(
      calculateEmployeeMonthNetInrCents({
        cashInInrCents: 0,
        salaryPaidInrCents: 50_000_00,
      }),
    ).toBe(-50_000_00);
  });

  it("flags waiting-for-payment when salary is paid and inward is zero", () => {
    expect(
      resolveEmployeeCashFlowStatus({
        effectiveDollarInwardUsdCents: 0,
        salaryPaidInrCents: 50_000_00,
        netInrCents: -50_000_00,
      }),
    ).toBe("waiting_for_payment");
  });

  it("supports payout-style cash dashboard rows with isolated types", () => {
    const row: EmployeeCashFlowMonthRow = {
      employeeId: "emp_1",
      employeeName: "A",
      companyId: "comp_1",
      paymentMonth: "2026-04",
      invoiceNumber: "INV-1",
      daysWorked: 20,
      daysInMonth: 30,
      monthlyPaidUsdCents: 100_000,
      baseDollarInwardUsdCents: 100_000,
      onboardingAdvanceUsdCents: 10_000,
      offboardingDeductionUsdCents: 5_000,
      effectiveDollarInwardUsdCents: 105_000,
      cashoutUsdInrRate: 85,
      paidUsdInrRate: 84,
      cashInInrCents: 8_925_000,
      salaryPaidInrCents: 5_000_000,
      pendingAmountInrCents: 1_000_000,
      netInrCents: 3_925_000,
      status: "profit",
    };

    expect(row.status).toBe("profit");
  });
});
