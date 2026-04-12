import { describe, expect, it } from "vitest";

import {
  appendMissingAdjustmentEntries,
  buildEmployeeCashFlowMonthRows,
  normalizeEmployeeNameForMatch,
} from "./employee-cash-flow-store";
import { calculateEffectiveDollarInwardUsdCents } from "./employee-cash-flow";

describe("employee cash flow store shaping", () => {
  it("aggregates multiple payment rows in the same month", () => {
    const rows = buildEmployeeCashFlowMonthRows({
      paymentEntries: [
        {
          employeeId: "emp_1",
          paymentMonth: "2026-04",
          actualPaidInrCents: 2_500,
          cashInInrCents: 1_000,
          effectiveDollarInwardUsdCents: 1_000,
          onboardingAdvanceUsdCents: 0,
          reimbursementUsdCents: 0,
          reimbursementLabelsText: "",
          appraisalAdvanceUsdCents: 0,
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
          actualPaidInrCents: 0,
          cashInInrCents: 2_000,
          effectiveDollarInwardUsdCents: 2_000,
          onboardingAdvanceUsdCents: 500,
          reimbursementUsdCents: 250,
          reimbursementLabelsText: "Laptop",
          appraisalAdvanceUsdCents: 125,
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
      salaryPayments: [],
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
    expect(rows[0]?.reimbursementUsdCents).toBe(250);
    expect(rows[0]?.appraisalAdvanceUsdCents).toBe(125);
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
          actualPaidInrCents: 0,
          cashInInrCents: 0,
          effectiveDollarInwardUsdCents: 0,
          onboardingAdvanceUsdCents: 0,
          reimbursementUsdCents: 0,
          reimbursementLabelsText: "",
          appraisalAdvanceUsdCents: 0,
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

  it("treats normalized onboarding advances as part of invoice inward", () => {
    const onboardingAdvanceUsdCents = 4_493_400;
    const effectiveDollarInwardUsdCents = calculateEffectiveDollarInwardUsdCents({
      baseDollarInwardUsdCents: 0,
      onboardingAdvanceUsdCents,
      reimbursementUsdCents: 250_000,
      appraisalAdvanceUsdCents: 100_000,
      offboardingDeductionUsdCents: 0,
    });

    const rows = buildEmployeeCashFlowMonthRows({
      paymentEntries: [
        {
          employeeId: "emp_1",
          paymentMonth: "2026-04",
          actualPaidInrCents: 0,
          cashInInrCents: 100,
          effectiveDollarInwardUsdCents,
          onboardingAdvanceUsdCents,
          reimbursementUsdCents: 250_000,
          reimbursementLabelsText: "Laptop",
          appraisalAdvanceUsdCents: 100_000,
          offboardingDeductionUsdCents: 0,
          monthlyPaidUsdCents: 1_000,
          daysWorked: 0,
          daysInMonth: 30,
          cashoutUsdInrRate: 85,
          paidUsdInrRate: 84,
          employeeName: "Pawan Kumar Beesetti",
          companyId: "comp_1",
          invoiceNumber: "INV-ONBOARD",
        },
      ],
      salaryPayments: [],
      accrualByEmployeeMonth: [],
    });

    expect(rows[0]).toMatchObject({
      onboardingAdvanceUsdCents,
      reimbursementUsdCents: 250_000,
      reimbursementLabelsText: "Laptop",
      appraisalAdvanceUsdCents: 100_000,
      baseDollarInwardUsdCents: 0,
      effectiveDollarInwardUsdCents,
    });
  });

  it("normalizes employee names before matching invoice adjustments", () => {
    expect(normalizeEmployeeNameForMatch("  Pawan   Kumar Beesetti  ")).toBe(
      "pawan kumar beesetti",
    );
    expect(normalizeEmployeeNameForMatch("PAWAN KUMAR BEESETTI")).toBe(
      "pawan kumar beesetti",
    );
    expect(normalizeEmployeeNameForMatch("Nirbhay\u00A0 Kumar   Giri")).toBe(
      "nirbhay kumar giri",
    );
  });

  it("adds adjustment-only employees into the monthly cash flow entries", () => {
    expect(
      appendMissingAdjustmentEntries({
        entries: [],
        availableEmployees: [
          {
            id: "emp_1",
            fullName: "Darshan Tukaram Bandache",
            companyId: "comp_1",
            payoutMonthlyUsdCents: 2_000_00,
            onboardingAdvanceUsdCents: 500_00,
            reimbursementUsdCents: 300_00,
            reimbursementLabelsText: "Signing bonus",
            appraisalAdvanceUsdCents: 200_00,
            offboardingDeductionUsdCents: 0,
          },
        ],
        paymentMonth: "2026-04",
        daysInMonth: 30,
        cashoutUsdInrRate: 84.5,
        invoiceId: "inv_1",
        invoiceNumber: "INV-1",
      }),
    ).toMatchObject([
      {
        employeeId: "emp_1",
        employeeNameSnapshot: "Darshan Tukaram Bandache",
        daysWorked: 0,
        daysInMonth: 30,
        monthlyPaidUsdCents: 2_000_00,
        baseDollarInwardUsdCents: 0,
        onboardingAdvanceUsdCents: 500_00,
        reimbursementUsdCents: 300_00,
        reimbursementLabelsText: "Signing bonus",
        appraisalAdvanceUsdCents: 200_00,
        offboardingDeductionUsdCents: 0,
        cashoutUsdInrRate: 84.5,
        invoiceId: "inv_1",
        invoiceNumber: "INV-1",
      },
    ]);
  });
});
