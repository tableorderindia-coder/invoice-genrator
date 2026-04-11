import { describe, expect, it } from "vitest";

import { buildEmployeeCashFlowMonthRows } from "./employee-cash-flow-store";

describe("employee cash flow store shaping", () => {
  it("aggregates multiple payment rows in the same month", () => {
    const rows = buildEmployeeCashFlowMonthRows({
      paymentEntries: [
        {
          employeeId: "emp_1",
          paymentMonth: "2026-04",
          cashInInrCents: 1_000,
          effectiveDollarInwardUsdCents: 1_000,
          onboardingAdvanceUsdCents: 0,
          offboardingDeductionUsdCents: 0,
          monthlyPaidUsdCents: 1_000,
          daysWorked: 10,
          daysInMonth: 30,
          cashoutUsdInrRate: 85,
          paidUsdInrRate: 84,
          employeeName: "A",
          companyId: "comp_1",
          invoiceNumber: "INV-1",
        },
        {
          employeeId: "emp_1",
          paymentMonth: "2026-04",
          cashInInrCents: 2_000,
          effectiveDollarInwardUsdCents: 2_000,
          onboardingAdvanceUsdCents: 500,
          offboardingDeductionUsdCents: 0,
          monthlyPaidUsdCents: 1_000,
          daysWorked: 12,
          daysInMonth: 30,
          cashoutUsdInrRate: 85,
          paidUsdInrRate: 84,
          employeeName: "A",
          companyId: "comp_1",
          invoiceNumber: "INV-2",
        },
      ],
      salaryPayments: [
        {
          employeeId: "emp_1",
          month: "2026-04",
          salaryPaidInrCents: 2_500,
        },
      ],
      accrualByEmployeeMonth: [
        {
          employeeId: "emp_1",
          month: "2026-04",
          accrualInrCents: 5_000,
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.cashInInrCents).toBe(3_000);
    expect(rows[0]?.salaryPaidInrCents).toBe(2_500);
    expect(rows[0]?.pendingAmountInrCents).toBe(2_000);
    expect(rows[0]?.status).toBe("profit");
  });

  it("uses waiting-for-payment when salary exists and inward is zero", () => {
    const rows = buildEmployeeCashFlowMonthRows({
      paymentEntries: [
        {
          employeeId: "emp_1",
          paymentMonth: "2026-04",
          cashInInrCents: 0,
          effectiveDollarInwardUsdCents: 0,
          onboardingAdvanceUsdCents: 0,
          offboardingDeductionUsdCents: 0,
          monthlyPaidUsdCents: 1_000,
          daysWorked: 0,
          daysInMonth: 30,
          cashoutUsdInrRate: 85,
          paidUsdInrRate: 84,
          employeeName: "A",
          companyId: "comp_1",
          invoiceNumber: "INV-1",
        },
      ],
      salaryPayments: [
        {
          employeeId: "emp_1",
          month: "2026-04",
          salaryPaidInrCents: 2_500,
        },
      ],
      accrualByEmployeeMonth: [],
    });

    expect(rows[0]?.status).toBe("waiting_for_payment");
    expect(rows[0]?.netInrCents).toBe(-2_500);
  });
});
