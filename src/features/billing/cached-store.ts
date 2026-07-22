import {
  getPnDashboardData,
  listAvailablePaymentMonthsForCompanies,
  listCompanies,
  listEmployeesForCompanies,
  listInvoicesForCompanies,
} from "./store";
import type { PnPeriodType } from "./types";

type ListEmployeesOptions = {
  activeOnly?: boolean;
};

export function listCachedCompanies() {
  return listCompanies();
}

export function listCachedEmployeesForCompanies(
  companyIds: string[],
  options: ListEmployeesOptions = {},
) {
  return listEmployeesForCompanies(companyIds, options);
}

export function listCachedInvoicesForCompanies(companyIds: string[]) {
  return listInvoicesForCompanies(companyIds);
}

export function listCachedAvailablePaymentMonthsForCompanies(companyIds: string[]) {
  return listAvailablePaymentMonthsForCompanies(companyIds);
}

export function getCachedPnDashboardData(input: {
  companyId: string;
  periodType: PnPeriodType;
  employeeIds?: string[];
  paymentMonths?: string[];
}) {
  return getPnDashboardData(input);
}
