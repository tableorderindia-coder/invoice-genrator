type SearchValue = string | string[] | undefined;

import type { EmployeeCashFlowEntryWriteInput } from "./employee-cash-flow-types";

function getTodayMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getDaysInMonthFromMonthKey(monthKey: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    return 30;
  }

  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return 30;
  }

  return new Date(year, month, 0).getDate();
}

export function resolveEmployeeCashFlowMonthKey(
  input?: SearchValue,
  legacyYear?: SearchValue,
  now = new Date(),
) {
  const monthValue = Array.isArray(input) ? input[0] : input;
  if (monthValue && /^\d{4}-\d{2}$/.test(monthValue)) {
    return monthValue;
  }

  const legacyMonth = Array.isArray(input) ? input[0] : input;
  const yearValue = Array.isArray(legacyYear) ? legacyYear[0] : legacyYear;
  if (legacyMonth && yearValue) {
    const monthNumber = Number.parseInt(legacyMonth, 10);
    const yearNumber = Number.parseInt(yearValue, 10);
    if (Number.isFinite(monthNumber) && Number.isFinite(yearNumber)) {
      return `${yearNumber}-${String(monthNumber).padStart(2, "0")}`;
    }
  }

  return getTodayMonthKey(now);
}

export function buildEmployeeCashFlowInvoiceOptionsInput(companyId: string) {
  return companyId ? { companyId } : null;
}

export function buildAddedEmployeeCashFlowEntry(input: {
  employee: {
    id: string;
    fullName: string;
    payoutMonthlyUsdCents: number;
    onboardingAdvanceUsdCents?: number;
    offboardingDeductionUsdCents?: number;
  };
  paymentMonth: string;
  invoiceDollarInboundUsdCents: number;
  invoiceUsdInrRate: number;
}): EmployeeCashFlowEntryWriteInput {
  return {
    employeeId: input.employee.id,
    employeeNameSnapshot: input.employee.fullName,
    daysWorked: 0,
    daysInMonth: getDaysInMonthFromMonthKey(input.paymentMonth),
    monthlyPaidUsdCents: input.employee.payoutMonthlyUsdCents,
    baseDollarInwardUsdCents: input.invoiceDollarInboundUsdCents,
    onboardingAdvanceUsdCents: input.employee.onboardingAdvanceUsdCents ?? 0,
    offboardingDeductionUsdCents: input.employee.offboardingDeductionUsdCents ?? 0,
    cashoutUsdInrRate: input.invoiceUsdInrRate,
    paidUsdInrRate: 0,
    pfInrCents: 0,
    tdsInrCents: 0,
    actualPaidInrCents: 0,
    fxCommissionInrCents: 0,
    totalCommissionUsdCents: 0,
    commissionEarnedInrCents: 0,
    grossEarningsInrCents: 0,
    isNonInvoiceEmployee: true,
    isPaid: false,
    notes: "",
  };
}
