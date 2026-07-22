import { NextResponse } from "next/server";

import { requirePageAccess } from "@/lib/auth/server";
import { filterCompaniesForAuthContext } from "@/src/features/billing/company-access";
import {
  buildDashboardCompanyCsv,
  buildDashboardCompanyTable,
  buildDashboardEmployeeCsv,
  buildDashboardEmployeeTable,
  buildDashboardExportPdf,
  buildDashboardPeriodCsv,
  buildDashboardPeriodTable,
} from "@/src/features/billing/dashboard-export";
import { buildPeriodTotals } from "@/src/features/billing/dashboard-table-totals";
import {
  normalizeMultiSelectValue,
  resolveSelectedCompanyIds,
} from "@/src/features/billing/filter-selection";
import {
  buildOverviewCompanySummaryRows,
  buildOverviewGrandTotalRow,
  formatOverviewPeriodLabel,
} from "@/src/features/billing/overview-pnl-summary";
import { getPnDashboardSummaryData } from "@/src/features/billing/pn-summary-store";
import {
  listCachedAvailablePaymentMonthsForCompanies,
  listCachedCompanies,
  listCachedEmployeesForCompanies,
} from "@/src/features/billing/cached-store";
import type { PnDashboardData, PnPeriodRow, PnPeriodType } from "@/src/features/billing/types";
import { sanitizeDownloadFilename } from "@/src/features/billing/utils";

type SearchInput = Record<string, string | string[] | undefined>;

function queryValue(params: URLSearchParams, name: string) {
  const values = params.getAll(name);
  if (values.length > 1) return values;
  return values[0];
}

function searchInput(params: URLSearchParams): SearchInput {
  return {
    companyId: queryValue(params, "companyId"),
    companyIds: queryValue(params, "companyIds"),
    employeeIds: queryValue(params, "employeeIds"),
    allEmployees: queryValue(params, "allEmployees"),
    paymentMonths: queryValue(params, "paymentMonths"),
    allMonths: queryValue(params, "allMonths"),
    periodType: queryValue(params, "periodType"),
    view: queryValue(params, "view"),
    employeeColumns: queryValue(params, "employeeColumns"),
    periodColumns: queryValue(params, "periodColumns"),
  };
}

function weightedRate(rows: PnPeriodRow[], rateKey: "cashoutUsdInrRate" | "paidUsdInrRate") {
  const eligibleRows = rateKey === "paidUsdInrRate"
    ? rows.filter((row) => row.paidUsdInrRate > 0)
    : rows;
  const totalWeight = eligibleRows.reduce(
    (sum, row) => sum + row.effectiveDollarInwardUsdCents,
    0,
  );
  if (totalWeight <= 0) return 0;
  return (
    eligibleRows.reduce(
      (sum, row) => sum + row[rateKey] * row.effectiveDollarInwardUsdCents,
      0,
    ) / totalWeight
  );
}

function mergePeriodRows(rows: PnPeriodRow[]): PnPeriodRow[] {
  const grouped = new Map<string, PnPeriodRow[]>();
  for (const row of rows) {
    const key = row.fiscalLabel ?? `${row.year}-${String(row.month ?? 0).padStart(2, "0")}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  return [...grouped.values()]
    .map((bucket) => {
      const first = bucket[0]!;
      const sum = (pick: (row: PnPeriodRow) => number) =>
        bucket.reduce((total, row) => total + pick(row), 0);
      const reimbursementLabelsText = [
        ...new Set(
          bucket
            .flatMap((row) => row.reimbursementLabelsText.split(","))
            .map((label) => label.trim())
            .filter(Boolean),
        ),
      ].join(", ");

      return {
        year: first.year,
        month: first.month,
        fiscalLabel: first.fiscalLabel,
        dollarInwardUsdCents: sum((row) => row.dollarInwardUsdCents),
        onboardingAdvanceUsdCents: sum((row) => row.onboardingAdvanceUsdCents),
        reimbursementUsdCents: sum((row) => row.reimbursementUsdCents),
        reimbursementLabelsText,
        reimbursementInrCents: sum((row) => row.reimbursementInrCents),
        appraisalAdvanceUsdCents: sum((row) => row.appraisalAdvanceUsdCents),
        appraisalAdvanceInrCents: sum((row) => row.appraisalAdvanceInrCents),
        offboardingDeductionUsdCents: sum((row) => row.offboardingDeductionUsdCents),
        effectiveDollarInwardUsdCents: sum((row) => row.effectiveDollarInwardUsdCents),
        cashoutUsdInrRate: weightedRate(bucket, "cashoutUsdInrRate"),
        cashInInrCents: sum((row) => row.cashInInrCents),
        paidUsdInrRate: weightedRate(bucket, "paidUsdInrRate"),
        monthlyPaidInrCents: sum((row) => row.monthlyPaidInrCents),
        pfInrCents: sum((row) => row.pfInrCents),
        tdsInrCents: sum((row) => row.tdsInrCents),
        actualPaidInrCents: sum((row) => row.actualPaidInrCents),
        salaryPaidInrCents: sum((row) => row.salaryPaidInrCents),
        fxCommissionInrCents: sum((row) => row.fxCommissionInrCents),
        totalCommissionUsdCents: sum((row) => row.totalCommissionUsdCents),
        commissionEarnedInrCents: sum((row) => row.commissionEarnedInrCents),
        grossEarningsInrCents: sum((row) => row.grossEarningsInrCents),
        expensesInrCents: sum((row) => row.expensesInrCents),
        companyReimbursementUsdCents: sum((row) => row.companyReimbursementUsdCents),
        companyReimbursementInrCents: sum((row) => row.companyReimbursementInrCents),
        netPlInrCents: sum((row) => row.netPlInrCents),
      };
    })
    .sort(
      (left, right) =>
        left.year * 100 + (left.month ?? 0) - (right.year * 100 + (right.month ?? 0)),
    );
}

function mergeDashboardData(companyIds: string[], data: PnDashboardData[]): PnDashboardData {
  return {
    companyId: companyIds.join(","),
    employeeEditableSections: data.flatMap((item) => item.employeeEditableSections),
    employeeSections: data.flatMap((item) => item.employeeSections),
    periodRows: mergePeriodRows(data.flatMap((item) => item.periodRows)),
  };
}

function monthRangeLabel(months: string[]) {
  const sortedMonths = [...months].sort();
  const startMonth = sortedMonths[0];
  const endMonth = sortedMonths.at(-1);
  if (!startMonth || !endMonth) return "Selected months";
  return formatOverviewPeriodLabel(startMonth, endMonth);
}

function responseHeaders(filename: string, contentType: string) {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${sanitizeDownloadFilename(filename)}"`,
  };
}

export async function GET(request: Request) {
  const context = await requirePageAccess("dashboard");
  const { searchParams } = new URL(request.url);
  const resolved = searchInput(searchParams);
  const format = searchParams.get("format") === "pdf" ? "pdf" : "csv";
  const scope = searchParams.get("scope") === "company" ? "company" : "table";
  const selectedPeriodTypeRaw = Array.isArray(resolved.periodType)
    ? resolved.periodType[0]
    : resolved.periodType;
  const periodType: PnPeriodType = selectedPeriodTypeRaw === "yearly" ? "yearly" : "monthly";
  const selectedViewRaw = Array.isArray(resolved.view) ? resolved.view[0] : resolved.view;
  const view = selectedViewRaw === "period" ? "period" : "employee";

  const companies = filterCompaniesForAuthContext(await listCachedCompanies(), context);
  const selectedCompanyIds = resolveSelectedCompanyIds({
    companyIds: resolved.companyIds,
    companyId: resolved.companyId,
    companies,
  });
  const selectedCompanies = companies.filter((company) => selectedCompanyIds.includes(company.id));
  const employees = await listCachedEmployeesForCompanies(selectedCompanyIds);
  const employeeCompanyMap = new Map(
    employees.map((employee) => [employee.id, employee.companyId] as const),
  );
  const availableMonths = await listCachedAvailablePaymentMonthsForCompanies(selectedCompanyIds);
  const allEmployeesValue = Array.isArray(resolved.allEmployees)
    ? resolved.allEmployees[0]
    : resolved.allEmployees;
  const allEmployeesSelected = allEmployeesValue === "1";
  const selectedEmployeeIds = normalizeMultiSelectValue(resolved.employeeIds);
  const effectiveEmployeeIds =
    allEmployeesSelected || selectedEmployeeIds.length === 0
      ? employees.map((employee) => employee.id)
      : selectedEmployeeIds;
  const employeeFilterActive = !allEmployeesSelected && selectedEmployeeIds.length > 0;
  const allMonthsValue = Array.isArray(resolved.allMonths)
    ? resolved.allMonths[0]
    : resolved.allMonths;
  const allMonthsSelected = allMonthsValue === "1";
  const selectedPaymentMonths = normalizeMultiSelectValue(resolved.paymentMonths);
  const effectivePaymentMonths =
    allMonthsSelected || selectedPaymentMonths.length === 0
      ? availableMonths
      : selectedPaymentMonths;

  const dashboardDataByCompanyId = new Map(
    (
      await Promise.all(
        selectedCompanyIds.map(async (companyId) => {
          const companyEmployeeIds = effectiveEmployeeIds.filter(
            (employeeId) => employeeCompanyMap.get(employeeId) === companyId,
          );
          const data = await getPnDashboardSummaryData({
            companyId,
            periodType,
            employeeIds: employeeFilterActive
              ? companyEmployeeIds.length > 0
                ? companyEmployeeIds
                : ["__none__"]
              : undefined,
            paymentMonths: effectivePaymentMonths,
          });
          return [companyId, data] as const;
        }),
      )
    ),
  );
  const data = mergeDashboardData(selectedCompanyIds, [...dashboardDataByCompanyId.values()]);
  const periodLabel = monthRangeLabel(effectivePaymentMonths);
  const selectedCompanyLabel =
    selectedCompanies.length === 1 ? selectedCompanies[0]?.name ?? "Company" : "Selected companies";

  if (scope === "company") {
    const monthlyDataByCompanyId = new Map(
      (
        await Promise.all(
          selectedCompanyIds.map(async (companyId) => {
            const monthlyData = await getPnDashboardSummaryData({
              companyId,
              periodType: "monthly",
              paymentMonths: effectivePaymentMonths,
            });
            return [companyId, monthlyData] as const;
          }),
        )
      ),
    );
    const companyRows = buildOverviewCompanySummaryRows({
      companies: selectedCompanies,
      dashboardDataByCompanyId: monthlyDataByCompanyId,
      monthKeys: effectivePaymentMonths,
      periodLabel,
    });
    const exportRows =
      companyRows.length > 1
        ? [...companyRows, buildOverviewGrandTotalRow(companyRows, periodLabel)]
        : companyRows;
    const table = buildDashboardCompanyTable(exportRows);
    const filename = `dashboard-company-${periodLabel}.${format}`;
    if (format === "pdf") {
      const pdf = await buildDashboardExportPdf({
        title: "Dashboard company export",
        subtitle: periodLabel,
        rows: [table.headers, ...table.rows],
      });
      return new NextResponse(new Uint8Array(pdf), {
        headers: responseHeaders(filename, "application/pdf"),
      });
    }
    return new NextResponse(buildDashboardCompanyCsv(exportRows), {
      headers: responseHeaders(filename, "text/csv; charset=utf-8"),
    });
  }

  if (view === "period") {
    const includeOptions = { includeExpenses: true, includeReimbursements: true };
    const table = buildDashboardPeriodTable(data, periodType, includeOptions);
    const totals = buildPeriodTotals(data.periodRows, includeOptions);
    const filename = `dashboard-${periodType}-${periodLabel}.${format}`;
    if (format === "pdf") {
      const pdf = await buildDashboardExportPdf({
        title: `Dashboard ${periodType} export`,
        subtitle: `${selectedCompanyLabel} - ${periodLabel} - Net P/L ${totals.netPlInrCents / 100}`,
        rows: [table.headers, ...table.rows],
      });
      return new NextResponse(new Uint8Array(pdf), {
        headers: responseHeaders(filename, "application/pdf"),
      });
    }
    return new NextResponse(buildDashboardPeriodCsv(data, periodType, includeOptions), {
      headers: responseHeaders(filename, "text/csv; charset=utf-8"),
    });
  }

  const table = buildDashboardEmployeeTable(data);
  const filename = `dashboard-employees-${periodLabel}.${format}`;
  if (format === "pdf") {
    const pdf = await buildDashboardExportPdf({
      title: "Dashboard employee export",
      subtitle: `${selectedCompanyLabel} - ${periodLabel}`,
      rows: [table.headers, ...table.rows],
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: responseHeaders(filename, "application/pdf"),
    });
  }

  return new NextResponse(buildDashboardEmployeeCsv(data), {
    headers: responseHeaders(filename, "text/csv; charset=utf-8"),
  });
}
