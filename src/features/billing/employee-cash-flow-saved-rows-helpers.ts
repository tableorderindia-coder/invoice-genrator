import type { EmployeeCashFlowSavedEntry } from "./employee-cash-flow-types";
import { formatPaymentMonthLabel } from "./filter-selection";

export function formatSavedPaymentMonth(paymentMonth: string) {
  return formatPaymentMonthLabel(paymentMonth);
}

export function buildSavedEmployeeCashFlowEntryJson(row: EmployeeCashFlowSavedEntry) {
  return JSON.stringify(row);
}
