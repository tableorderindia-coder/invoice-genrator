import { unstable_cache } from "next/cache";

import {
  getPnDashboardData,
  listCompanyExpensesForCompanies,
  listAvailablePaymentMonthsForCompanies,
  listCompanies,
  listEmployeesForCompanies,
  listInvoicesForCompanies,
} from "./store";
import { getPnDashboardSummaryData } from "./pn-summary-store";
import { buildPortalSnapshotKey, getOrBuildPortalSnapshot } from "./portal-snapshot-cache";
import { billingCacheTags } from "./cache-tags";
import type { CompanyExpense, Employee, Invoice, PnPeriodType } from "./types";

type ListEmployeesOptions = {
  activeOnly?: boolean;
};

// Every function below is tagged with the exact same tag strings that
// src/features/billing/actions.ts calls revalidateTag() with after a
// mutation (see cache-tags.ts). Without a matching tag here, revalidateTag()
// has nothing to invalidate and these reads would never actually be cached -
// they'd fall through to the Postgres-backed snapshot table (or a full
// query) on every single request. That was the bug: the tags existed on the
// invalidation side only.
//
// unstable_cache (not the newer "use cache"/cacheComponents API) is used
// deliberately: cacheComponents requires removing `dynamic = "force-dynamic"`
// and `runtime = "nodejs"` from ~20 pages/API routes across this app, which
// is too large a blast radius for a live financial app. unstable_cache needs
// no config changes and coexists fine with force-dynamic pages.
//
// A prior commit (5fb0aaf, "avoid persistent cache for auth scoped reads")
// deliberately removed unstable_cache from this file because reads then went
// through a per-request Supabase client implicitly bound to the logged-in
// user's session (via cookies) - caching that by argument alone would have
// leaked one user's data to another, since the identity wasn't part of the
// cache key. That's no longer the shape of this code: every read below goes
// through the plain, non-user-scoped `pg` pool (lib/db/pool.ts) with
// `companyId` passed explicitly, and authorization (which companyIds a user
// may even request) is enforced upstream in requirePageAccess /
// filterCompaniesForAuthContext before these functions are ever called. So
// the cache key (keyParts + args, all explicit) fully determines the result -
// there's no hidden per-user state left to leak. See
// cache-safety.test.ts for the test guarding this invariant.
//
// Tagging is done per-company (not per requested company-id combination) so
// that a mutation for one company only ever busts that company's entries,
// regardless of which multi-company view first populated the cache.

const cachedCompaniesList = unstable_cache(
  () =>
    getOrBuildPortalSnapshot({
      key: buildPortalSnapshotKey({ snapshotType: "companies" }),
      build: listCompanies,
    }),
  ["billing-companies"],
  { tags: [billingCacheTags.companies()] },
);

export function listCachedCompanies() {
  return cachedCompaniesList();
}

export function listCachedEmployeesForCompanies(
  companyIds: string[],
  options: ListEmployeesOptions = {},
) {
  const uniqueCompanyIds = [...new Set(companyIds.filter(Boolean))];
  const activeOnly = Boolean(options.activeOnly);
  return Promise.all(
    uniqueCompanyIds.map((companyId) =>
      unstable_cache(
        () =>
          getOrBuildPortalSnapshot<Employee[]>({
            key: buildPortalSnapshotKey({
              companyId,
              snapshotType: activeOnly ? "employees-active" : "employees",
            }),
            build: () => listEmployeesForCompanies([companyId], { activeOnly }),
          }),
        ["billing-employees", companyId, String(activeOnly)],
        { tags: [billingCacheTags.employees([companyId])] },
      )(),
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
      unstable_cache(
        () =>
          getOrBuildPortalSnapshot<Invoice[]>({
            key: buildPortalSnapshotKey({ companyId, snapshotType: "invoices" }),
            build: () => listInvoicesForCompanies([companyId]),
          }),
        ["billing-invoices", companyId],
        { tags: [billingCacheTags.invoices([companyId])] },
      )(),
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
      unstable_cache(
        () =>
          getOrBuildPortalSnapshot<string[]>({
            key: buildPortalSnapshotKey({ companyId, snapshotType: "payment-months" }),
            build: () => listAvailablePaymentMonthsForCompanies([companyId]),
          }),
        ["billing-payment-months", companyId],
        { tags: [billingCacheTags.paymentMonths([companyId])] },
      )(),
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
  const monthKey =
    input.startMonth && input.endMonth
      ? `${input.startMonth}:${input.endMonth}`
      : input.year !== undefined && input.month !== undefined
        ? `${input.year}-${String(input.month).padStart(2, "0")}`
        : "";

  return Promise.all(
    uniqueCompanyIds.map((companyId) =>
      unstable_cache(
        () =>
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
        ["billing-expenses", companyId, monthKey],
        { tags: [billingCacheTags.expenses([companyId])] },
      )(),
    ),
  ).then((groups) => groups.flat());
}

export function getCachedPnDashboardData(input: {
  companyId: string;
  periodType: PnPeriodType;
  employeeIds?: string[];
  paymentMonths?: string[];
}) {
  return unstable_cache(
    () => getPnDashboardData(input),
    [
      "billing-dashboard-raw",
      input.companyId,
      input.periodType,
      (input.employeeIds ?? []).slice().sort().join(","),
      (input.paymentMonths ?? []).slice().sort().join(","),
    ],
    {
      tags: [billingCacheTags.dashboard(input.companyId), billingCacheTags.overview(input.companyId)],
    },
  )();
}

// This is the one actually used by app/page.tsx (Overview) and
// app/dashboard/page.tsx - both were calling getPnDashboardSummaryData
// directly and hitting the summary tables on every navigation. Tagging it
// with both dashboard+overview means either page's cache gets busted
// correctly, since every mutation type that affects P&L already invalidates
// both tags (see getBillingInvalidationTags in cache-tags.ts).
export function getCachedPnDashboardSummaryData(input: {
  companyId: string;
  periodType: PnPeriodType;
  employeeIds?: string[];
  paymentMonths?: string[];
}) {
  return unstable_cache(
    () => getPnDashboardSummaryData(input),
    [
      "billing-dashboard-summary",
      input.companyId,
      input.periodType,
      (input.employeeIds ?? []).slice().sort().join(","),
      (input.paymentMonths ?? []).slice().sort().join(","),
    ],
    {
      tags: [billingCacheTags.dashboard(input.companyId), billingCacheTags.overview(input.companyId)],
    },
  )();
}
