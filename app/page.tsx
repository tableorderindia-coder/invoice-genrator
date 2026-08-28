import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { GlassPanel } from "./_components/glass-panel";
import { inputClass } from "./_components/field";
import { AutoApplyFilterForm } from "./_components/auto-apply-filter-form";
import { Shell } from "./_components/shell";
import { OverviewPnlSummaryTable } from "./overview-pnl-summary-table";
import { requirePageAccess } from "@/lib/auth/server";
import { filterCompaniesForAuthContext } from "@/src/features/billing/company-access";
import {
  filterRowsByFinancialYear,
  getFinancialYearOptions,
  parseFinancialYear,
  resolveSelectedCompanyIds,
} from "@/src/features/billing/filter-selection";
import {
  buildOverviewMonthlyPnlRows,
  buildOverviewDashboardHref,
  currentMonthKey,
  resolveOverviewMonthRange,
} from "@/src/features/billing/overview-pnl-summary";
import { loadOverviewAdvancePreference } from "@/src/features/billing/overview-preference";
import {
  getCachedPnDashboardSummaryData,
  listCachedAvailablePaymentMonthsForCompanies,
  listCachedCompanies,
} from "@/src/features/billing/cached-store";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string | string[];
    companyIds?: string | string[];
    startMonth?: string | string[];
    endMonth?: string | string[];
    financialYear?: string | string[];
  }>;
}) {
  const context = await requirePageAccess("overview");
  const resolved = await searchParams;
  const companies = filterCompaniesForAuthContext(await listCachedCompanies(), context);
  const selectedCompanyIds = resolveSelectedCompanyIds({
    companyIds: resolved.companyIds,
    companyId: resolved.companyId,
    companies,
  });
  const selectedCompanyIdSet = new Set(selectedCompanyIds);
  const selectedCompanies = companies.filter((company) => selectedCompanyIdSet.has(company.id));
  const allSelected =
    companies.length > 0 &&
    selectedCompanyIds.length >= companies.length &&
    companies.every((company) => selectedCompanyIdSet.has(company.id));
  const [availableMonths, companyDashboardData, preference] = await Promise.all([
    listCachedAvailablePaymentMonthsForCompanies(selectedCompanyIds),
    Promise.all(
      selectedCompanies.map(async (company) => ({
        companyId: company.id,
        data: await getCachedPnDashboardSummaryData({
          companyId: company.id,
          periodType: "monthly",
        }),
      })),
    ),
    loadOverviewAdvancePreference(context),
  ]);
  const availableMonthRows = availableMonths
    .map((monthKey) => {
      const [yearPart, monthPart] = monthKey.split("-");
      return {
        value: monthKey,
        year: Number.parseInt(yearPart ?? "", 10),
        month: Number.parseInt(monthPart ?? "", 10),
      };
    })
    .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.month));
  const financialYearOptions = getFinancialYearOptions(availableMonthRows);
  const selectedFinancialYear = parseFinancialYear(
    Array.isArray(resolved.financialYear)
      ? resolved.financialYear[0]
      : resolved.financialYear,
    financialYearOptions,
  );
  const startMonthParam = Array.isArray(resolved.startMonth)
    ? resolved.startMonth[0]
    : resolved.startMonth;
  const endMonthParam = Array.isArray(resolved.endMonth)
    ? resolved.endMonth[0]
    : resolved.endMonth;
  const financialYearMonths = filterRowsByFinancialYear(
    availableMonthRows,
    selectedFinancialYear.value,
  ).map((row) => row.value);
  const range = resolveOverviewMonthRange({
    startMonth: startMonthParam,
    endMonth: endMonthParam,
    availableMonths: financialYearMonths,
    currentMonth: currentMonthKey(),
  });
  const dashboardDataByCompanyId = new Map(
    companyDashboardData.map((item) => [item.companyId, item.data] as const),
  );
  const rows = buildOverviewMonthlyPnlRows({
    dashboardDataByCompanyId,
    monthKeys: range.monthKeys,
  });
  const dashboardHrefBase = buildOverviewDashboardHref({
    companyIds: selectedCompanyIds,
    monthKeys: range.monthKeys,
  });
  const dashboardHref = `${dashboardHrefBase}&financialYear=${encodeURIComponent(selectedFinancialYear.value)}`;

  return (
    <Shell
      title="P&L Overview"
      eyebrow="Company profitability summary"
      companyOptions={companies.map((company) => ({ id: company.id, name: company.name }))}
      activeCompanyIds={selectedCompanyIds}
      financialYearOptions={financialYearOptions}
    >
      <GlassPanel gradient>
        <AutoApplyFilterForm action="/" className="grid gap-3 md:grid-cols-[180px_180px_auto] md:items-end">
          {!allSelected
            ? selectedCompanyIds.map((companyId) => (
                <input key={companyId} type="hidden" name="companyIds" value={companyId} />
              ))
            : null}
          <input type="hidden" name="financialYear" value={selectedFinancialYear.value} />

          <label className="block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Start month
            </span>
            <input
              name="startMonth"
              type="month"
              defaultValue={range.startMonth}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              End month
            </span>
            <input
              name="endMonth"
              type="month"
              defaultValue={range.endMonth}
              className={inputClass}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Link className="btn-outline inline-flex items-center gap-2" href={dashboardHref}>
              <LayoutDashboard size={16} aria-hidden="true" />
              Open dashboard
            </Link>
          </div>
        </AutoApplyFilterForm>
      </GlassPanel>

      <GlassPanel title="Monthly P&L" gradient>
        <OverviewPnlSummaryTable
          rows={rows}
          initialExcludeAdvanceDeduction={preference.excludeAdvanceDeduction}
          preferenceLoadFailed={preference.loadFailed}
        />
      </GlassPanel>
    </Shell>
  );
}
