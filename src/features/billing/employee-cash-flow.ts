export type EmployeeCashFlowStatus =
  | "profit"
  | "loss"
  | "waiting_for_payment";

export function calculateEffectiveDollarInwardUsdCents(input: {
  baseDollarInwardUsdCents: number;
  onboardingAdvanceUsdCents: number;
  reimbursementUsdCents: number;
  appraisalAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
}) {
  const offboardingDeductionUsdCents = Math.abs(input.offboardingDeductionUsdCents);
  return (
    input.baseDollarInwardUsdCents +
    input.onboardingAdvanceUsdCents +
    input.reimbursementUsdCents +
    input.appraisalAdvanceUsdCents -
    offboardingDeductionUsdCents
  );
}

export function calculateCashInInrCents(input: {
  effectiveDollarInwardUsdCents: number;
  cashoutUsdInrRate: number;
}) {
  return Math.round(
    input.effectiveDollarInwardUsdCents * input.cashoutUsdInrRate,
  );
}

export function calculateEmployeeMonthNetInrCents(input: {
  cashInInrCents: number;
  salaryPaidInrCents: number;
}) {
  return input.cashInInrCents - input.salaryPaidInrCents;
}

export function calculateActualPaidInrCents(input: {
  daysWorked: number;
  daysInMonth: number;
  monthlyPaidUsdCents: number;
  paidUsdInrRate: number;
}) {
  const normalizedDaysInMonth = Math.max(1, Math.round(input.daysInMonth));
  return Math.round(
    (input.daysWorked *
      input.monthlyPaidUsdCents *
      input.paidUsdInrRate) /
      normalizedDaysInMonth,
  );
}

export function resolveEmployeeCashFlowStatus(input: {
  effectiveDollarInwardUsdCents: number;
  salaryPaidInrCents: number;
  netInrCents: number;
}): EmployeeCashFlowStatus {
  if (
    input.salaryPaidInrCents > 0 &&
    input.effectiveDollarInwardUsdCents === 0
  ) {
    return "waiting_for_payment";
  }

  if (input.netInrCents < 0) {
    return "loss";
  }

  return "profit";
}
