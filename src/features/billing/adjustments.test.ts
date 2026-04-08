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
        hrsPerWeek: 6.5,
      }),
    ).toBe(70417);
  });

  it("builds onboarding and appraisal adjustments as positive amounts", () => {
    expect(
      buildInvoiceAdjustmentPayload({
        type: "onboarding",
        employeeName: "Pawan",
        rateUsdCents: 3000,
        hrsPerWeek: 4,
      }),
    ).toEqual({
      type: "onboarding",
      label: "Onboarding advance",
      employeeName: "Pawan",
      rateUsdCents: 3000,
      hrsPerWeek: 4,
      amountUsdCents: 52000,
    });

    expect(
      buildInvoiceAdjustmentPayload({
        type: "appraisal",
        employeeName: "Riya",
        rateUsdCents: 4200,
        hrsPerWeek: 2.5,
      }),
    ).toEqual({
      type: "appraisal",
      label: "Appraisal advance",
      employeeName: "Riya",
      rateUsdCents: 4200,
      hrsPerWeek: 2.5,
      amountUsdCents: 45500,
    });
  });

  it("normalizes offboarding deductions to negative amounts", () => {
    expect(
      buildInvoiceAdjustmentPayload({
        type: "offboarding",
        employeeName: "Asha",
        rateUsdCents: 5000,
        hrsPerWeek: 3,
      }),
    ).toEqual({
      type: "offboarding",
      label: "Offboarding deduction",
      employeeName: "Asha",
      rateUsdCents: 5000,
      hrsPerWeek: 3,
      amountUsdCents: -65000,
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
        hrsPerWeek: 4,
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
        hrsPerWeek: 4,
        amountUsdCents: 52000,
        sortOrder: 1,
      },
      {
        id: "adj_2",
        invoiceId: "inv_1",
        type: "appraisal",
        label: "Appraisal advance",
        employeeName: "Riya",
        rateUsdCents: 5000,
        hrsPerWeek: 2,
        amountUsdCents: 43333,
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
        hrsPerWeek: 3,
        amountUsdCents: -52000,
        sortOrder: 4,
      },
    ] satisfies InvoiceAdjustment[]);

    expect(grouped.onboarding.totalUsdCents).toBe(52000);
    expect(grouped.appraisal.totalUsdCents).toBe(43333);
    expect(grouped.reimbursement.totalUsdCents).toBe(2500);
    expect(grouped.offboarding.totalUsdCents).toBe(52000);
    expect(grouped.offboarding.items[0]?.amountUsdCents).toBe(-52000);
  });
});
