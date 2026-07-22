import { unstable_cache } from "next/cache";

import { billingCacheTags, normalizeCacheScopeIds } from "./cache-tags";
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

function splitScopeIds(scopeKey: string) {
  return scopeKey ? scopeKey.split(",").filter(Boolean) : [];
}

export function listCachedCompanies() {
  return unstable_cache(() => listCompanies(), ["billing", "companies"], {
    tags: [billingCacheTags.companies()],
    revalidate: 60,
  })();
}

export function listCachedEmployeesForCompanies(
  companyIds: string[],
  options: ListEmployeesOptions = {},
) {
  const scopeKey = normalizeCacheScopeIds(companyIds);
  const activeKey = options.activeOnly ? "active" : "all";

  return unstable_cache(
    () => listEmployeesForCompanies(splitScopeIds(scopeKey), options),
    ["billing", "employees", scopeKey, activeKey],
    {
      tags: [
        billingCacheTags.employees(splitScopeIds(scopeKey)),
        ...splitScopeIds(scopeKey).map((companyId) =>
          billingCacheTags.employees([companyId]),
        ),
      ],
      revalidate: 60,
    },
  )();
}

export function listCachedInvoicesForCompanies(companyIds: string[]) {
  const scopeKey = normalizeCacheScopeIds(companyIds);

  return unstable_cache(
    () => listInvoicesForCompanies(splitScopeIds(scopeKey)),
    ["billing", "invoices", scopeKey],
    {
      tags: [
        billingCacheTags.invoices(splitScopeIds(scopeKey)),
        ...splitScopeIds(scopeKey).map((companyId) =>
          billingCacheTags.invoices([companyId]),
        ),
      ],
      revalidate: 60,
    },
  )();
}

export function listCachedAvailablePaymentMonthsForCompanies(companyIds: string[]) {
  const scopeKey = normalizeCacheScopeIds(companyIds);

  return unstable_cache(
    () => listAvailablePaymentMonthsForCompanies(splitScopeIds(scopeKey)),
    ["billing", "payment-months", scopeKey],
    {
      tags: [
        billingCacheTags.paymentMonths(splitScopeIds(scopeKey)),
        ...splitScopeIds(scopeKey).map((companyId) =>
          billingCacheTags.paymentMonths([companyId]),
        ),
      ],
      revalidate: 60,
    },
  )();
}

export function getCachedPnDashboardData(input: {
  companyId: string;
  periodType: PnPeriodType;
  employeeIds?: string[];
  paymentMonths?: string[];
}) {
  const employeeScope = normalizeCacheScopeIds(input.employeeIds ?? []);
  const monthScope = normalizeCacheScopeIds(input.paymentMonths ?? []);

  return unstable_cache(
    () => getPnDashboardData(input),
    [
      "billing",
      "dashboard",
      input.companyId,
      input.periodType,
      employeeScope || "all-employees",
      monthScope || "all-months",
    ],
    {
      tags: [
        billingCacheTags.dashboard(input.companyId),
        billingCacheTags.overview(input.companyId),
        billingCacheTags.cashflow(input.companyId),
        billingCacheTags.salary(input.companyId),
      ],
      revalidate: 60,
    },
  )();
}
