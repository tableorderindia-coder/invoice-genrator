import type { PnEmployeeEditableRow, PnPeriodRow } from "./types";
import {
  calculatePnEmployeeAdvanceInrCents,
  calculatePnEmployeeNetPlInrCents,
} from "./pn-dashboard";

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
  const advancesInrCents = sumBy(rows, calculatePnEmployeeAdvanceInrCents);
  return {
    daysWorked: sumBy(rows, (row) => row.daysWorked),
    dollarInwardUsdCents: sumBy(rows, (row) => row.dollarInwardUsdCents),
    onboardingAdvanceUsdCents: sumBy(rows, (row) => row.onboardingAdvanceUsdCents),
    advancesInrCents,
    reimbursementUsdCents: sumBy(rows, (row) => row.reimbursementUsdCents),
    reimbursementInrCents: sumBy(rows, (row) => row.reimbursementInrCents),
    appraisalAdvanceUsdCents: sumBy(rows, (row) => row.appraisalAdvanceUsdCents),
    appraisalAdvanceInrCents: sumBy(rows, (row) => row.appraisalAdvanceInrCents),
    offboardingDeductionUsdCents: sumBy(rows, (row) => row.offboardingDeductionUsdCents),
    effectiveDollarInwardUsdCents: sumBy(rows, (row) => row.effectiveDollarInwardUsdCents),
    cashInInrCents: sumBy(rows, (row) => row.cashInInrCents),
    cashoutUsdInrRate:
      weightedAverage(rows, (row) => row.cashoutUsdInrRate, (row) => row.effectiveDollarInwardUsdCents) ??
      null,
    paidUsdInrRate:
      weightedAverage(
        rows.filter((row) => row.paidUsdInrRate > 0),
        (row) => row.paidUsdInrRate,
        (row) => row.effectiveDollarInwardUsdCents,
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
    netProfitInrCents: sumBy(rows, (row) => row.netProfitInrCents),
    netPlBeforeAdvancesInrCents: sumBy(rows, (row) =>
      calculatePnEmployeeNetPlInrCents(row, { includeAdvances: false }),
    ),
    netPlInrCents: sumBy(rows, (row) => calculatePnEmployeeNetPlInrCents(row)),
  };
}

export function buildPeriodTotals(
  rows: PnPeriodRow[],
  options: {
    includeExpenses: boolean;
    includeAdvances?: boolean;
    includeReimbursements: boolean;
  },
) {
  const grossPnl = sumBy(rows, (row) => row.grossEarningsInrCents);
  const reimbursement = sumBy(rows, (row) => row.companyReimbursementInrCents);
  const expenses = sumBy(rows, (row) => row.expensesInrCents);
  const advances = sumBy(rows, (row) => row.advancesInrCents);

  return {
    daysWorked: null,
    dollarInwardUsdCents: sumBy(rows, (row) => row.dollarInwardUsdCents),
    onboardingAdvanceUsdCents: sumBy(rows, (row) => row.onboardingAdvanceUsdCents),
    advancesInrCents: advances,
    reimbursementUsdCents: sumBy(rows, (row) => row.reimbursementUsdCents),
    reimbursementInrCents: sumBy(rows, (row) => row.reimbursementInrCents),
    appraisalAdvanceUsdCents: sumBy(rows, (row) => row.appraisalAdvanceUsdCents),
    appraisalAdvanceInrCents: sumBy(rows, (row) => row.appraisalAdvanceInrCents),
    offboardingDeductionUsdCents: sumBy(rows, (row) => row.offboardingDeductionUsdCents),
    effectiveDollarInwardUsdCents: sumBy(rows, (row) => row.effectiveDollarInwardUsdCents),
    cashoutUsdInrRate:
      weightedAverage(rows, (row) => row.cashoutUsdInrRate, (row) => row.effectiveDollarInwardUsdCents) ??
      null,
    cashInInrCents: sumBy(rows, (row) => row.cashInInrCents),
    paidUsdInrRate:
      weightedAverage(
        rows.filter((row) => row.paidUsdInrRate > 0),
        (row) => row.paidUsdInrRate,
        (row) => row.effectiveDollarInwardUsdCents,
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
      grossPnl +
      (options.includeReimbursements ? reimbursement : 0) -
      (options.includeExpenses ? expenses : 0) -
      (options.includeAdvances ?? true ? advances : 0),
  };
}
