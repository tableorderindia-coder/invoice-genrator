type SearchValue = string | string[] | undefined;

import type { EmployeeCashFlowEntryWriteInput } from "./employee-cash-flow-types";
import { normalizeMultiSelectValue } from "./filter-selection";
import { calculateSalaryPaidInrCents } from "./payroll";

type EmployeeOption = {
  id: string;
};

function getTodayMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function nextCashFlowClientBatchId() {
  return `batch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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

export function resolveEmployeeCashFlowInvoiceIds(input?: SearchValue) {
  return normalizeMultiSelectValue(input);
}

export function resolveEmployeeToAddSelection(
  currentEmployeeId: string,
  addableEmployees: EmployeeOption[],
) {
  if (addableEmployees.some((employee) => employee.id === currentEmployeeId)) {
    return currentEmployeeId;
  }

  return addableEmployees[0]?.id ?? "";
}

export function removeEmployeeFromSelections<TEntry extends { employeeId: string }>(input: {
  entries: TEntry[];
  selectedEmployeeIds: string[];
  employeeIdToRemove: string;
}) {
  return {
    entries: input.entries.filter(
      (entry) => entry.employeeId !== input.employeeIdToRemove,
    ),
    selectedEmployeeIds: input.selectedEmployeeIds.filter(
      (employeeId) => employeeId !== input.employeeIdToRemove,
    ),
  };
}

export function removeEntryFromSelections<TEntry extends { id: string; employeeId: string }>(input: {
  entries: TEntry[];
  selectedEmployeeIds: string[];
  entryIdToRemove: string;
}) {
  const removedEntry = input.entries.find((entry) => entry.id === input.entryIdToRemove);
  const entries = input.entries.filter((entry) => entry.id !== input.entryIdToRemove);
  const stillHasEmployee =
    removedEntry &&
    entries.some((entry) => entry.employeeId === removedEntry.employeeId);

  return {
    entries,
    selectedEmployeeIds:
      removedEntry && !stillHasEmployee
        ? input.selectedEmployeeIds.filter((employeeId) => employeeId !== removedEntry.employeeId)
        : input.selectedEmployeeIds,
  };
}

export function buildAddedEmployeeCashFlowEntry(input: {
  employee: {
    id: string;
    fullName: string;
    defaultPaidUsdInrRate?: number;
    defaultMonthlyPaidInrCents?: number;
    defaultActualPaidInrCents?: number;
    defaultPfInrCents?: number;
    defaultTdsInrCents?: number;
    onboardingAdvanceUsdCents?: number;
    reimbursementUsdCents?: number;
    reimbursementLabelsText?: string;
    appraisalAdvanceUsdCents?: number;
    offboardingDeductionUsdCents?: number;
  };
  paymentMonth: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceUsdInrRate: number;
}): EmployeeCashFlowEntryWriteInput {
  const safeSalaryPaidInrCents = (row: {
    actualPaidInrCents: number;
    pfInrCents: number;
    tdsInrCents: number;
  }) => {
    try {
      return calculateSalaryPaidInrCents(row);
    } catch {
      return 0;
    }
  };
  const monthlyPaidInrCents =
    input.employee.defaultMonthlyPaidInrCents ?? input.employee.defaultActualPaidInrCents ?? 0;
  const actualPaidInrCents = input.employee.defaultActualPaidInrCents ?? monthlyPaidInrCents;
  const pfInrCents = input.employee.defaultPfInrCents ?? 0;
  const tdsInrCents = input.employee.defaultTdsInrCents ?? 0;
  const salaryPaidInrCents = safeSalaryPaidInrCents({
    actualPaidInrCents,
    pfInrCents,
    tdsInrCents,
  });

  return {
    clientBatchId: nextCashFlowClientBatchId(),
    invoicePaymentId: undefined,
    batchLabel: input.invoiceNumber,
    invoiceId: input.invoiceId,
    invoiceNumber: input.invoiceNumber,
    employeeId: input.employee.id,
    employeeNameSnapshot: input.employee.fullName,
    daysWorked: 0,
    daysInMonth: getDaysInMonthFromMonthKey(input.paymentMonth),
    baseDollarInwardUsdCents: 0,
    onboardingAdvanceUsdCents: input.employee.onboardingAdvanceUsdCents ?? 0,
    reimbursementUsdCents: input.employee.reimbursementUsdCents ?? 0,
    reimbursementLabelsText: input.employee.reimbursementLabelsText ?? "",
    appraisalAdvanceUsdCents: input.employee.appraisalAdvanceUsdCents ?? 0,
    offboardingDeductionUsdCents: input.employee.offboardingDeductionUsdCents ?? 0,
    cashoutUsdInrRate: input.invoiceUsdInrRate,
    paidUsdInrRate: input.employee.defaultPaidUsdInrRate ?? 0,
    monthlyPaidInrCents,
    pfInrCents,
    tdsInrCents,
    actualPaidInrCents,
    salaryPaidInrCents,
    fxCommissionInrCents: 0,
    totalCommissionUsdCents: 0,
    commissionEarnedInrCents: 0,
    grossEarningsInrCents: 0,
    isNonInvoiceEmployee: true,
    isPaid: false,
    paidAt: undefined,
    notes: "",
  };
}

export function applyEmployeeCashFlowEntryPatch<
  TEntry extends Pick<
    EmployeeCashFlowEntryWriteInput,
    | "daysWorked"
    | "daysInMonth"
    | "paidUsdInrRate"
    | "monthlyPaidInrCents"
    | "actualPaidInrCents"
    | "pfInrCents"
    | "tdsInrCents"
    | "salaryPaidInrCents"
  >,
>(entry: TEntry, patch: Partial<TEntry>) {
  const safeSalaryPaidInrCents = (row: {
    actualPaidInrCents: number;
    pfInrCents: number;
    tdsInrCents: number;
  }) => {
    try {
      return calculateSalaryPaidInrCents(row);
    } catch {
      return 0;
    }
  };
  const next = { ...entry, ...patch } as TEntry;
  next.salaryPaidInrCents = safeSalaryPaidInrCents({
    actualPaidInrCents: next.actualPaidInrCents,
    pfInrCents: next.pfInrCents,
    tdsInrCents: next.tdsInrCents,
  });
  return next;
}
