import type { AdjustmentType } from "./types";

type PersonAdjustmentType = Exclude<AdjustmentType, "reimbursement">;

export function calculatePersonAdjustmentTotalUsdCents(input: {
  rateUsdCents: number;
  hours: number;
}) {
  if (input.rateUsdCents < 0 || input.hours < 0) {
    throw new Error("Rate and hours must be non-negative.");
  }

  return Math.round(input.rateUsdCents * input.hours);
}

function getPersonAdjustmentLabel(type: PersonAdjustmentType) {
  switch (type) {
    case "onboarding":
      return "Onboarding advance";
    case "offboarding":
      return "Offboarding deduction";
    case "appraisal":
      return "Appraisal advance";
  }
}

export function buildInvoiceAdjustmentPayload(
  input:
    | {
        type: PersonAdjustmentType;
        employeeName: string;
        rateUsdCents: number;
        hours: number;
      }
    | {
        type: "reimbursement";
        label: string;
        amountUsdCents: number;
      },
) {
  if (input.type === "reimbursement") {
    const label = input.label.trim();
    if (!label) {
      throw new Error("Reimbursement label is required.");
    }
    if (input.amountUsdCents < 0) {
      throw new Error("Reimbursement amount must be non-negative.");
    }

    return {
      type: input.type,
      label,
      amountUsdCents: Math.abs(input.amountUsdCents),
    };
  }

  const employeeName = input.employeeName.trim();
  if (!employeeName) {
    throw new Error("Name is required for this adjustment.");
  }

  const amountUsdCents = calculatePersonAdjustmentTotalUsdCents({
    rateUsdCents: input.rateUsdCents,
    hours: input.hours,
  });

  return {
    type: input.type,
    label: getPersonAdjustmentLabel(input.type),
    employeeName,
    rateUsdCents: input.rateUsdCents,
    hours: input.hours,
    amountUsdCents:
      input.type === "offboarding" ? -Math.abs(amountUsdCents) : amountUsdCents,
  };
}
