import { describe, expect, it } from "vitest";

import type { InvoiceAdjustment } from "./types";
import {
  buildInvoiceAdjustmentPayload,
  calculatePersonAdjustmentTotalUsdCents,
  buildAdjustmentDuplicateSignature,
  buildAdjustmentFormEmployeeDefaults,
  getAdjustmentDaysFieldCopy,
  groupInvoiceAdjustments,
} from "./adjustments";

describe("invoice adjustments", () => {
  it("calculates person-based adjustment totals from rate and hours", () => {
    expect(
      calculatePersonAdjustmentTotalUsdCents({
        rateUsdCents: 2500,
        hrsPerWeek: 6.5,
      }),
    ).toBe(70400);
  });

  it("uses days worked for person-based adjustments, including reimbursements", () => {
    expect(
      calculatePersonAdjustmentTotalUsdCents({
        rateUsdCents: 3000,
        hrsPerWeek: 4,
        daysWorked: 60,
      }),
    ).toBe(104000);

    expect(
      buildInvoiceAdjustmentPayload({
        type: "reimbursement",
        label: "Laptop courier",
        rateUsdCents: 3000,
        hrsPerWeek: 4,
        daysWorked: 90,
      }),
    ).toEqual({
      type: "reimbursement",
      label: "Laptop courier",
      rateUsdCents: 3000,
      hrsPerWeek: 4,
      daysWorked: 90,
      amountUsdCents: 156000,
    });
  });

  it("builds onboarding and appraisal adjustments as positive amounts", () => {
    expect(
      buildInvoiceAdjustmentPayload({
        type: "onboarding",
        employeeName: "Pawan",
        rateUsdCents: 3000,
        hrsPerWeek: 4,
        daysWorked: 60,
      }),
    ).toEqual({
      type: "onboarding",
      label: "Onboarding advance",
      employeeName: "Pawan",
      rateUsdCents: 3000,
      hrsPerWeek: 4,
      daysWorked: 60,
      amountUsdCents: 104000,
    });

    expect(
      buildInvoiceAdjustmentPayload({
        type: "appraisal",
        employeeName: "Riya",
        rateUsdCents: 4200,
        hrsPerWeek: 2.5,
        daysWorked: 90,
      }),
    ).toEqual({
      type: "appraisal",
      label: "Appraisal advance",
      employeeName: "Riya",
      rateUsdCents: 4200,
      hrsPerWeek: 2.5,
      daysWorked: 90,
      amountUsdCents: 136500,
    });
  });

  it("allows overriding person-based adjustment totals with editable amounts", () => {
    expect(
      buildInvoiceAdjustmentPayload({
        type: "onboarding",
        employeeName: "Pawan",
        rateUsdCents: 3000,
        hrsPerWeek: 4,
        daysWorked: 60,
        amountUsdCents: 61000,
      }),
    ).toEqual({
      type: "onboarding",
      label: "Onboarding advance",
      employeeName: "Pawan",
      rateUsdCents: 3000,
      hrsPerWeek: 4,
      daysWorked: 60,
      amountUsdCents: 61000,
    });
  });

  it("normalizes offboarding deductions to negative amounts", () => {
    expect(
      buildInvoiceAdjustmentPayload({
        type: "offboarding",
        employeeName: "Asha",
        rateUsdCents: 5000,
        hrsPerWeek: 3,
        daysWorked: 90,
      }),
    ).toEqual({
      type: "offboarding",
      label: "Offboarding deduction",
      employeeName: "Asha",
      rateUsdCents: 5000,
      hrsPerWeek: 3,
      daysWorked: 90,
      amountUsdCents: -195000,
    });
  });

  it("uses adjustment-specific day-field copy for onboarding and offboarding", () => {
    expect(getAdjustmentDaysFieldCopy("onboarding")).toEqual({
      label: "Number of days to advance",
      placeholder: "Enter number of days to advance",
      helperText: "Can be higher than the selected month days.",
    });

    expect(getAdjustmentDaysFieldCopy("offboarding")).toEqual({
      label: "Number of days to deduct",
      placeholder: "Enter number of days to deduct",
      helperText: "Can be higher than the selected month days.",
    });

    expect(getAdjustmentDaysFieldCopy("appraisal")).toEqual({
      label: "Days worked",
      placeholder: "Enter days worked",
      helperText: undefined,
    });
  });

  it("builds employee defaults for adjustment form prefill", () => {
    expect(
      buildAdjustmentFormEmployeeDefaults({
        fullName: "Asha",
        billingRateUsdCents: 4_500,
        hrsPerWeek: 37.5,
      }),
    ).toEqual({
      employeeName: "Asha",
      rateUsd: "45.00",
      hrsPerWeek: "37.5",
    });
  });

  it("normalizes duplicate signatures across type, amount, and description", () => {
    expect(
      buildAdjustmentDuplicateSignature({
        type: "reimbursement",
        amountUsdCents: 7500,
        label: " Laptop Courier ",
      }),
    ).toBe("reimbursement|7500|laptop courier|||");

    expect(
      buildAdjustmentDuplicateSignature({
        type: "onboarding",
        amountUsdCents: 12000,
        employeeName: " Pawan ",
        rateUsdCents: 3000,
        hrsPerWeek: 4,
        daysWorked: 60,
      }),
    ).toBe("onboarding|12000|pawan|3000|4|60");
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
        daysWorked: 60,
        amountUsdCents: 104000,
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
        daysWorked: 90,
        amountUsdCents: 130000,
        sortOrder: 2,
      },
      {
        id: "adj_3",
        invoiceId: "inv_1",
        type: "reimbursement",
        label: "Laptop courier",
        rateUsdCents: 3000,
        hrsPerWeek: 4,
        daysWorked: 30,
        amountUsdCents: 52000,
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
        daysWorked: 90,
        amountUsdCents: -156000,
        sortOrder: 4,
      },
    ] satisfies InvoiceAdjustment[]);

    expect(grouped.onboarding.totalUsdCents).toBe(104000);
    expect(grouped.appraisal.totalUsdCents).toBe(130000);
    expect(grouped.reimbursement.totalUsdCents).toBe(52000);
    expect(grouped.offboarding.totalUsdCents).toBe(156000);
    expect(grouped.offboarding.items[0]?.amountUsdCents).toBe(-156000);
  });
});
