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
  return (
    input.baseDollarInwardUsdCents +
    input.onboardingAdvanceUsdCents +
    input.reimbursementUsdCents +
    input.appraisalAdvanceUsdCents -
    input.offboardingDeductionUsdCents
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
  monthlyPaidUsdCents: number;
  paidUsdInrRate: number;
}) {
  return Math.round(
    input.daysWorked * input.monthlyPaidUsdCents * input.paidUsdInrRate,
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
