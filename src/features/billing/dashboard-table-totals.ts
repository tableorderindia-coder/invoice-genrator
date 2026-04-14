import type { PnEmployeeEditableRow, PnPeriodRow } from "./types";

function sumBy<TRow>(rows: TRow[], pick: (row: TRow) => number) {
  return rows.reduce((sum, row) => sum + pick(row), 0);
}

function weightedAverage<TRow>(
  rows: TRow[],
  value: (row: TRow) => number,
  weight: (row: TRow) => number,
) {
  const weightedTotal = rows.reduce((sum, row) => sum + value(row) * weight(row), 0);
  const totalWeight = rows.reduce((sum, row) => sum + weight(row), 0);
  if (totalWeight <= 0) return null;
  return weightedTotal / totalWeight;
}

export function buildEmployeeSectionTotals(rows: PnEmployeeEditableRow[]) {
  return {
    daysWorked: sumBy(rows, (row) => row.daysWorked),
    dollarInwardUsdCents: sumBy(rows, (row) => row.dollarInwardUsdCents),
    onboardingAdvanceUsdCents: sumBy(rows, (row) => row.onboardingAdvanceUsdCents),
    reimbursementUsdCents: sumBy(rows, (row) => row.reimbursementUsdCents),
    reimbursementInrCents: sumBy(rows, (row) => row.reimbursementInrCents),
    appraisalAdvanceUsdCents: sumBy(rows, (row) => row.appraisalAdvanceUsdCents),
    appraisalAdvanceInrCents: sumBy(rows, (row) => row.appraisalAdvanceInrCents),
    offboardingDeductionUsdCents: sumBy(rows, (row) => row.offboardingDeductionUsdCents),
    effectiveDollarInwardUsdCents: sumBy(rows, (row) => row.effectiveDollarInwardUsdCents),
    cashInInrCents: sumBy(rows, (row) => row.cashInInrCents),
    employeeMonthlyUsdCents: sumBy(rows, (row) => row.employeeMonthlyUsdCents),
    cashoutUsdInrRate:
      weightedAverage(rows, (row) => row.cashoutUsdInrRate, (row) => row.employeeMonthlyUsdCents) ??
      null,
    paidUsdInrRate:
      weightedAverage(
        rows.filter((row) => row.paidUsdInrRate > 0),
        (row) => row.paidUsdInrRate,
        (row) => row.employeeMonthlyUsdCents,
      ) ?? null,
    monthlyPaidInrCents: sumBy(rows, (row) =>
      Math.round(row.employeeMonthlyUsdCents * row.paidUsdInrRate),
    ),
    actualPaidInrCents: sumBy(rows, (row) => row.actualPaidInrCents),
    pfInrCents: sumBy(rows, (row) => row.pfInrCents),
    tdsInrCents: sumBy(rows, (row) => row.tdsInrCents),
    salaryPaidInrCents: sumBy(rows, (row) => row.salaryPaidInrCents),
    fxCommissionInrCents: sumBy(rows, (row) => row.fxCommissionInrCents),
    totalCommissionUsdCents: sumBy(rows, (row) => row.totalCommissionUsdCents),
    commissionEarnedInrCents: sumBy(rows, (row) => row.commissionEarnedInrCents),
    grossEarningsInrCents: sumBy(rows, (row) => row.grossEarningsInrCents),
    netProfitInrCents: sumBy(rows, (row) => row.netProfitInrCents),
  };
}

export function buildPeriodTotals(
  rows: PnPeriodRow[],
  options: { includeExpenses: boolean; includeReimbursements: boolean },
) {
  const baseNet = sumBy(rows, (row) => row.netPlInrCents);
  const reimbursement = sumBy(rows, (row) => row.companyReimbursementInrCents);
  const expenses = sumBy(rows, (row) => row.expensesInrCents);

  return {
    daysWorked: null,
    dollarInwardUsdCents: sumBy(rows, (row) => row.dollarInwardUsdCents),
    onboardingAdvanceUsdCents: sumBy(rows, (row) => row.onboardingAdvanceUsdCents),
    reimbursementUsdCents: sumBy(rows, (row) => row.reimbursementUsdCents),
    reimbursementInrCents: sumBy(rows, (row) => row.reimbursementInrCents),
    appraisalAdvanceUsdCents: sumBy(rows, (row) => row.appraisalAdvanceUsdCents),
    appraisalAdvanceInrCents: sumBy(rows, (row) => row.appraisalAdvanceInrCents),
    offboardingDeductionUsdCents: sumBy(rows, (row) => row.offboardingDeductionUsdCents),
    effectiveDollarInwardUsdCents: sumBy(rows, (row) => row.effectiveDollarInwardUsdCents),
    cashoutUsdInrRate:
      weightedAverage(rows, (row) => row.cashoutUsdInrRate, (row) => row.employeeMonthlyUsdCents) ??
      null,
    cashInInrCents: sumBy(rows, (row) => row.cashInInrCents),
    employeeMonthlyUsdCents: sumBy(rows, (row) => row.employeeMonthlyUsdCents),
    paidUsdInrRate:
      weightedAverage(
        rows.filter((row) => row.paidUsdInrRate > 0),
        (row) => row.paidUsdInrRate,
        (row) => row.employeeMonthlyUsdCents,
      ) ?? null,
    monthlyPaidInrCents: sumBy(rows, (row) => row.monthlyPaidInrCents),
    actualPaidInrCents: sumBy(rows, (row) => row.actualPaidInrCents),
    pfInrCents: sumBy(rows, (row) => row.pfInrCents),
    tdsInrCents: sumBy(rows, (row) => row.tdsInrCents),
    salaryPaidInrCents: sumBy(rows, (row) => row.salaryPaidInrCents),
    fxCommissionInrCents: sumBy(rows, (row) => row.fxCommissionInrCents),
    totalCommissionUsdCents: sumBy(rows, (row) => row.totalCommissionUsdCents),
    commissionEarnedInrCents: sumBy(rows, (row) => row.commissionEarnedInrCents),
    grossEarningsInrCents: sumBy(rows, (row) => row.grossEarningsInrCents),
    expensesInrCents: expenses,
    companyReimbursementUsdCents: sumBy(rows, (row) => row.companyReimbursementUsdCents),
    companyReimbursementInrCents: reimbursement,
    netPlInrCents:
      baseNet +
      (options.includeReimbursements ? reimbursement : 0) -
      (options.includeExpenses ? expenses : 0),
  };
}
