import { GlassPanel } from "./_components/glass-panel";
import { inputClass } from "./_components/field";
import { PendingSubmitButton } from "./_components/pending-submit-button";
import { Shell } from "./_components/shell";
import { OverviewPnlSummaryTable } from "./overview-pnl-summary-table";
import { requirePageAccess } from "@/lib/auth/server";
import { filterCompaniesForAuthContext } from "@/src/features/billing/company-access";
import { resolveSelectedCompanyIds } from "@/src/features/billing/filter-selection";
import {
  buildOverviewCompanySummaryRows,
  buildOverviewGrandTotalRow,
  currentMonthKey,
  formatOverviewPeriodLabel,
  resolveOverviewMonthRange,
} from "@/src/features/billing/overview-pnl-summary";
import {
  getPnDashboardData,
  listAvailablePaymentMonthsForCompanies,
  listCompanies,
} from "@/src/features/billing/store";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string | string[];
    companyIds?: string | string[];
    startMonth?: string | string[];
    endMonth?: string | string[];
  }>;
}) {
  const context = await requirePageAccess("overview");
  const resolved = await searchParams;
  const companies = filterCompaniesForAuthContext(await listCompanies(), context);
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
  const [availableMonths, companyDashboardData] = await Promise.all([
    listAvailablePaymentMonthsForCompanies(selectedCompanyIds),
    Promise.all(
      selectedCompanies.map(async (company) => ({
        companyId: company.id,
        data: await getPnDashboardData({
          companyId: company.id,
          periodType: "monthly",
        }),
      })),
    ),
  ]);
  const startMonthParam = Array.isArray(resolved.startMonth)
    ? resolved.startMonth[0]
    : resolved.startMonth;
  const endMonthParam = Array.isArray(resolved.endMonth)
    ? resolved.endMonth[0]
    : resolved.endMonth;
  const range = resolveOverviewMonthRange({
    startMonth: startMonthParam,
    endMonth: endMonthParam,
    availableMonths,
    currentMonth: currentMonthKey(),
  });
  const periodLabel = formatOverviewPeriodLabel(range.startMonth, range.endMonth);
  const dashboardDataByCompanyId = new Map(
    companyDashboardData.map((item) => [item.companyId, item.data] as const),
  );
  const companyRows = buildOverviewCompanySummaryRows({
    companies: selectedCompanies,
    dashboardDataByCompanyId,
    monthKeys: range.monthKeys,
    periodLabel,
  });
  const rows =
    companyRows.length > 1
      ? [...companyRows, buildOverviewGrandTotalRow(companyRows, periodLabel)]
      : companyRows;

  return (
    <Shell
      title="P&L Overview"
      eyebrow="Company profitability summary"
      companyOptions={companies.map((company) => ({ id: company.id, name: company.name }))}
      activeCompanyIds={selectedCompanyIds}
    >
      <GlassPanel gradient>
        <form action="/" className="grid gap-3 md:grid-cols-[180px_180px_auto] md:items-end">
          {!allSelected
            ? selectedCompanyIds.map((companyId) => (
                <input key={companyId} type="hidden" name="companyIds" value={companyId} />
              ))
            : null}

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

          <PendingSubmitButton
            className="gradient-btn"
            defaultText="Load"
            pendingText="Loading..."
          />
        </form>
      </GlassPanel>

      <GlassPanel title="P&L Summary" gradient>
        <OverviewPnlSummaryTable rows={rows} />
      </GlassPanel>
    </Shell>
  );
}
