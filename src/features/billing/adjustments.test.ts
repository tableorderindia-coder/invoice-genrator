import { describe, expect, it } from "vitest";

import {
  buildInvoiceAdjustmentPayload,
  calculatePersonAdjustmentTotalUsdCents,
} from "./adjustments";

describe("invoice adjustments", () => {
  it("calculates person-based adjustment totals from rate and hours", () => {
    expect(
      calculatePersonAdjustmentTotalUsdCents({
        rateUsdCents: 2500,
        hours: 6.5,
      }),
    ).toBe(16250);
  });

  it("builds onboarding and appraisal adjustments as positive amounts", () => {
    expect(
      buildInvoiceAdjustmentPayload({
        type: "onboarding",
        employeeName: "Pawan",
        rateUsdCents: 3000,
        hours: 4,
      }),
    ).toEqual({
      type: "onboarding",
      label: "Onboarding advance",
      employeeName: "Pawan",
      rateUsdCents: 3000,
      hours: 4,
      amountUsdCents: 12000,
    });

    expect(
      buildInvoiceAdjustmentPayload({
        type: "appraisal",
        employeeName: "Riya",
        rateUsdCents: 4200,
        hours: 2.5,
      }),
    ).toEqual({
      type: "appraisal",
      label: "Appraisal advance",
      employeeName: "Riya",
      rateUsdCents: 4200,
      hours: 2.5,
      amountUsdCents: 10500,
    });
  });

  it("normalizes offboarding deductions to negative amounts", () => {
    expect(
      buildInvoiceAdjustmentPayload({
        type: "offboarding",
        employeeName: "Asha",
        rateUsdCents: 5000,
        hours: 3,
      }),
    ).toEqual({
      type: "offboarding",
      label: "Offboarding deduction",
      employeeName: "Asha",
      rateUsdCents: 5000,
      hours: 3,
      amountUsdCents: -15000,
    });
  });

  it("keeps reimbursement adjustments as direct positive amounts", () => {
    expect(
      buildInvoiceAdjustmentPayload({
        type: "reimbursement",
        label: "Laptop courier",
        amountUsdCents: 7500,
      }),
    ).toEqual({
      type: "reimbursement",
      label: "Laptop courier",
      amountUsdCents: 7500,
    });
  });
});
