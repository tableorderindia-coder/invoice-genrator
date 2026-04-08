import { describe, expect, it } from "vitest";

import type { InvoiceAdjustment } from "./types";
import {
  buildInvoiceAdjustmentPayload,
  calculatePersonAdjustmentTotalUsdCents,
  buildAdjustmentDuplicateSignature,
  groupInvoiceAdjustments,
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

  it("normalizes duplicate signatures across type, amount, and description", () => {
    expect(
      buildAdjustmentDuplicateSignature({
        type: "reimbursement",
        amountUsdCents: 7500,
        label: " Laptop Courier ",
      }),
    ).toBe("reimbursement|7500|laptop courier");

    expect(
      buildAdjustmentDuplicateSignature({
        type: "onboarding",
        amountUsdCents: 12000,
        employeeName: " Pawan ",
        rateUsdCents: 3000,
        hours: 4,
      }),
    ).toBe("onboarding|12000|pawan|3000|4");
  });

  it("groups adjustments into separate category totals", () => {
    const grouped = groupInvoiceAdjustments([
      {
        id: "adj_1",
        invoiceId: "inv_1",
        type: "onboarding",
        label: "Onboarding advance",
        employeeName: "Pawan",
        rateUsdCents: 3000,
        hours: 4,
        amountUsdCents: 12000,
        sortOrder: 1,
      },
      {
        id: "adj_2",
        invoiceId: "inv_1",
        type: "appraisal",
        label: "Appraisal advance",
        employeeName: "Riya",
        rateUsdCents: 5000,
        hours: 2,
        amountUsdCents: 10000,
        sortOrder: 2,
      },
      {
        id: "adj_3",
        invoiceId: "inv_1",
        type: "reimbursement",
        label: "Laptop courier",
        amountUsdCents: 2500,
        sortOrder: 3,
      },
      {
        id: "adj_4",
        invoiceId: "inv_1",
        type: "offboarding",
        label: "Offboarding deduction",
        employeeName: "Asha",
        rateUsdCents: 4000,
        hours: 3,
        amountUsdCents: -12000,
        sortOrder: 4,
      },
    ] satisfies InvoiceAdjustment[]);

    expect(grouped.onboarding.totalUsdCents).toBe(12000);
    expect(grouped.appraisal.totalUsdCents).toBe(10000);
    expect(grouped.reimbursement.totalUsdCents).toBe(2500);
    expect(grouped.offboarding.totalUsdCents).toBe(12000);
    expect(grouped.offboarding.items[0]?.amountUsdCents).toBe(-12000);
  });
});
