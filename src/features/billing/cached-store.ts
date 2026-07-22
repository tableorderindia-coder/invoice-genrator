import {
  getPnDashboardData,
  listCompanyExpensesForCompanies,
  listAvailablePaymentMonthsForCompanies,
  listCompanies,
  listEmployeesForCompanies,
  listInvoicesForCompanies,
} from "./store";
import { buildPortalSnapshotKey, getOrBuildPortalSnapshot } from "./portal-snapshot-cache";
import type { CompanyExpense, Employee, Invoice, PnPeriodType } from "./types";

type ListEmployeesOptions = {
  activeOnly?: boolean;
};

export function listCachedCompanies() {
  return getOrBuildPortalSnapshot({
    key: buildPortalSnapshotKey({ snapshotType: "companies" }),
    build: listCompanies,
  });
}

export function listCachedEmployeesForCompanies(
  companyIds: string[],
  options: ListEmployeesOptions = {},
) {
  const uniqueCompanyIds = [...new Set(companyIds.filter(Boolean))];
  const snapshotType = options.activeOnly ? "employees-active" : "employees";
  return Promise.all(
    uniqueCompanyIds.map((companyId) =>
      getOrBuildPortalSnapshot<Employee[]>({
        key: buildPortalSnapshotKey({ companyId, snapshotType }),
        build: () => listEmployeesForCompanies([companyId], options),
      }),
    ),
  ).then((groups) =>
    groups
      .flat()
      .sort((left, right) => left.fullName.localeCompare(right.fullName)),
  );
}

export function listCachedInvoicesForCompanies(companyIds: string[]) {
  const uniqueCompanyIds = [...new Set(companyIds.filter(Boolean))];
  return Promise.all(
    uniqueCompanyIds.map((companyId) =>
      getOrBuildPortalSnapshot<Invoice[]>({
        key: buildPortalSnapshotKey({ companyId, snapshotType: "invoices" }),
        build: () => listInvoicesForCompanies([companyId]),
      }),
    ),
  ).then((groups) =>
    groups
      .flat()
      .sort((left, right) => right.year * 100 + right.month - (left.year * 100 + left.month)),
  );
}

export function listCachedAvailablePaymentMonthsForCompanies(companyIds: string[]) {
  const uniqueCompanyIds = [...new Set(companyIds.filter(Boolean))];
  return Promise.all(
    uniqueCompanyIds.map((companyId) =>
      getOrBuildPortalSnapshot<string[]>({
        key: buildPortalSnapshotKey({ companyId, snapshotType: "payment-months" }),
        build: () => listAvailablePaymentMonthsForCompanies([companyId]),
      }),
    ),
  ).then((groups) => [...new Set(groups.flat())].sort((a, b) => b.localeCompare(a)));
}

export function listCachedCompanyExpensesForCompanies(input: {
  companyIds: string[];
  year?: number;
  month?: number;
  startMonth?: string;
  endMonth?: string;
}) {
  const uniqueCompanyIds = [...new Set(input.companyIds.filter(Boolean))];
  const monthKey = input.startMonth && input.endMonth
    ? `${input.startMonth}:${input.endMonth}`
    : input.year !== undefined && input.month !== undefined
      ? `${input.year}-${String(input.month).padStart(2, "0")}`
      : "";

  return Promise.all(
    uniqueCompanyIds.map((companyId) =>
      getOrBuildPortalSnapshot<CompanyExpense[]>({
        key: buildPortalSnapshotKey({
          companyId,
          snapshotType: "expenses",
          monthKey,
        }),
        build: () =>
          listCompanyExpensesForCompanies({
            ...input,
            companyIds: [companyId],
          }),
      }),
    ),
  ).then((groups) => groups.flat());
}

export function getCachedPnDashboardData(input: {
  companyId: string;
  periodType: PnPeriodType;
  employeeIds?: string[];
  paymentMonths?: string[];
}) {
  return getPnDashboardData(input);
}
