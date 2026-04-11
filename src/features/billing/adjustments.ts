import type { AdjustmentType, InvoiceAdjustment } from "./types";

type PersonAdjustmentType = Exclude<AdjustmentType, "reimbursement">;

function normalizeText(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeHours(hours: number | undefined) {
  if (hours === undefined) return "";
  return Number.isInteger(hours) ? String(hours) : String(hours);
}

export function calculatePersonAdjustmentTotalUsdCents(input: {
  rateUsdCents: number;
  hrsPerWeek: number;
  daysWorked?: number;
}) {
  if (input.rateUsdCents < 0 || input.hrsPerWeek < 0) {
    throw new Error("Rate and hrs per week must be non-negative.");
  }

  const normalizedDaysWorked =
    input.daysWorked === undefined ? 30 : Math.max(0, Math.round(input.daysWorked));

  return (
    Math.round(
      ((input.rateUsdCents * input.hrsPerWeek * 52) / 12 / 30) * normalizedDaysWorked / 100,
    ) * 100
  );
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
        hrsPerWeek: number;
        daysWorked?: number;
        amountUsdCents?: number;
      }
    | {
        type: "reimbursement";
        label: string;
        rateUsdCents: number;
        hrsPerWeek: number;
        daysWorked?: number;
        amountUsdCents?: number;
      },
) {
  if (input.type === "reimbursement") {
    const label = input.label.trim();
    if (!label) {
      throw new Error("Reimbursement label is required.");
    }

    const amountUsdCents =
      input.amountUsdCents ??
      calculatePersonAdjustmentTotalUsdCents({
        rateUsdCents: input.rateUsdCents,
        hrsPerWeek: input.hrsPerWeek,
        daysWorked: input.daysWorked,
      });

    if (amountUsdCents < 0) {
      throw new Error("Reimbursement amount must be non-negative.");
    }

    return {
      type: input.type,
      label,
      rateUsdCents: input.rateUsdCents,
      hrsPerWeek: input.hrsPerWeek,
      daysWorked: input.daysWorked,
      amountUsdCents: Math.abs(amountUsdCents),
    };
  }

  const employeeName = input.employeeName.trim();
  if (!employeeName) {
    throw new Error("Name is required for this adjustment.");
  }

  const amountUsdCents =
    input.amountUsdCents ??
    calculatePersonAdjustmentTotalUsdCents({
      rateUsdCents: input.rateUsdCents,
      hrsPerWeek: input.hrsPerWeek,
      daysWorked: input.daysWorked,
    });

  return {
    type: input.type,
    label: getPersonAdjustmentLabel(input.type),
    employeeName,
    rateUsdCents: input.rateUsdCents,
    hrsPerWeek: input.hrsPerWeek,
    daysWorked: input.daysWorked,
    amountUsdCents:
      input.type === "offboarding" ? -Math.abs(amountUsdCents) : amountUsdCents,
  };
}

export function buildAdjustmentDuplicateSignature(
  adjustment:
    | Pick<
        InvoiceAdjustment,
        | "type"
        | "amountUsdCents"
        | "label"
        | "employeeName"
        | "rateUsdCents"
        | "hrsPerWeek"
        | "daysWorked"
      >
    | {
        type: AdjustmentType;
        amountUsdCents: number;
        label?: string;
        employeeName?: string;
        rateUsdCents?: number;
        hrsPerWeek?: number;
        daysWorked?: number;
      },
) {
  if (adjustment.type === "reimbursement") {
    return [
      adjustment.type,
      adjustment.amountUsdCents,
      normalizeText(adjustment.label),
      adjustment.rateUsdCents ?? "",
      normalizeHours(adjustment.hrsPerWeek),
      adjustment.daysWorked ?? "",
    ].join("|");
  }

  return [
    adjustment.type,
    adjustment.amountUsdCents,
    normalizeText(adjustment.employeeName),
    adjustment.rateUsdCents ?? "",
    normalizeHours(adjustment.hrsPerWeek),
    adjustment.daysWorked ?? "",
  ].join("|");
}

export function groupInvoiceAdjustments(adjustments: InvoiceAdjustment[]) {
  const emptyGroup = () => ({
    items: [] as InvoiceAdjustment[],
    totalUsdCents: 0,
  });

  const grouped = {
    onboarding: emptyGroup(),
    appraisal: emptyGroup(),
    reimbursement: emptyGroup(),
    offboarding: emptyGroup(),
  };

  adjustments.forEach((adjustment) => {
    const target = grouped[adjustment.type];
    target.items.push(adjustment);
    target.totalUsdCents +=
      adjustment.type === "offboarding"
        ? Math.abs(adjustment.amountUsdCents)
        : adjustment.amountUsdCents;
  });

  return grouped;
}
