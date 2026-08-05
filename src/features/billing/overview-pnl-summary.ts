import { buildPeriodTotals } from "./dashboard-table-totals";
import type { DashboardExportOptions } from "./dashboard-export-options";
import { mergePnPeriodRows } from "./pn-dashboard";
import type { Company, PnDashboardData, PnPeriodRow } from "./types";
import { formatMonthYear } from "./utils";

export type OverviewPnlSummaryRow = {
  companyId: string;
  companyName: string;
  periodLabel: string;
  sourcePeriodRows: PnPeriodRow[];
  totals: ReturnType<typeof buildPeriodTotals>;
};

export type OverviewMonthlyPnlRow = {
  monthKey: string;
  periodLabel: string;
  effectiveDollarInwardUsdCents: number;
  cashoutUsdInrRate: number | null;
  effectiveInwardInrCents: number | null;
  salaryPaidInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
  expensesInrCents: number;
  advancesInrCents: number;
  fxGainInrCents: number | null;
  operatingMarginInrCents: number | null;
  grossPnlInrCents: number | null;
  netPnlBeforeAdvanceInrCents: number | null;
};

type MonthRangeInput = {
  startMonth?: string;
  endMonth?: string;
  availableMonths: string[];
  currentMonth: string;
};

function isValidMonthKey(value: string | undefined): value is string {
  if (!value) return false;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number.parseInt(match[2] ?? "", 10);
  return month >= 1 && month <= 12;
}

function monthIndex(value: string) {
  const [yearPart, monthPart] = value.split("-");
  return Number.parseInt(yearPart ?? "0", 10) * 12 + Number.parseInt(monthPart ?? "1", 10) - 1;
}

function monthKeyFromIndex(index: number) {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function latestMonth(availableMonths: string[], currentMonth: string) {
  const validAvailableMonths = availableMonths.filter(isValidMonthKey);
  if (validAvailableMonths.length === 0) {
    return isValidMonthKey(currentMonth) ? currentMonth : "2026-01";
  }

  return [...validAvailableMonths].sort((left, right) => right.localeCompare(left))[0];
}

export function expandOverviewMonthRange(startMonth: string, endMonth: string) {
  const startIndex = monthIndex(startMonth);
  const endIndex = monthIndex(endMonth);
  return Array.from({ length: endIndex - startIndex + 1 }, (_, index) =>
    monthKeyFromIndex(startIndex + index),
  );
}

export function resolveOverviewMonthRange(input: MonthRangeInput) {
  const fallbackMonth = latestMonth(input.availableMonths, input.currentMonth);
  const validAvailableMonths = input.availableMonths.filter(isValidMonthKey);
  const defaultStartMonth =
    validAvailableMonths.length > 0
      ? [...validAvailableMonths].sort((left, right) => left.localeCompare(right))[0]
      : fallbackMonth;
  const defaultEndMonth =
    validAvailableMonths.length > 0
      ? [...validAvailableMonths].sort((left, right) => right.localeCompare(left))[0]
      : fallbackMonth;
  let startMonth = isValidMonthKey(input.startMonth) ? input.startMonth : defaultStartMonth;
  let endMonth = isValidMonthKey(input.endMonth) ? input.endMonth : defaultEndMonth;

  if (monthIndex(startMonth) > monthIndex(endMonth)) {
    [startMonth, endMonth] = [endMonth, startMonth];
  }

  return {
    startMonth,
    endMonth,
    monthKeys: expandOverviewMonthRange(startMonth, endMonth),
  };
}

export function formatOverviewPeriodLabel(startMonth: string, endMonth: string) {
  const format = (value: string) => {
    const [yearPart, monthPart] = value.split("-");
    return formatMonthYear(
      Number.parseInt(monthPart ?? "1", 10),
      Number.parseInt(yearPart ?? "0", 10),
    );
  };

  return startMonth === endMonth ? format(startMonth) : `${format(startMonth)} - ${format(endMonth)}`;
}

function rowMonthKey(row: PnPeriodRow) {
  if (!row.month) return "";
  return `${row.year}-${String(row.month).padStart(2, "0")}`;
}

export function buildOverviewDashboardHref(input: {
  companyIds: string[];
  monthKeys: string[];
}) {
  const params = new URLSearchParams({ view: "period", periodType: "monthly" });
  input.companyIds.forEach((companyId) => params.append("companyIds", companyId));
  input.monthKeys.forEach((monthKey) => params.append("paymentMonths", monthKey));
  return `/dashboard?${params.toString()}`;
}

function emptyMonthlyPnlRow(
  monthKey: string,
  periodLabel = (() => {
    const [yearPart, monthPart] = monthKey.split("-");
    return formatMonthYear(
      Number.parseInt(monthPart ?? "1", 10),
      Number.parseInt(yearPart ?? "0", 10),
    );
  })(),
): OverviewMonthlyPnlRow {
  return {
    monthKey,
    periodLabel,
    effectiveDollarInwardUsdCents: 0,
    cashoutUsdInrRate: null,
    effectiveInwardInrCents: 0,
    salaryPaidInrCents: 0,
    pfInrCents: 0,
    tdsInrCents: 0,
    expensesInrCents: 0,
    advancesInrCents: 0,
    fxGainInrCents: 0,
    operatingMarginInrCents: 0,
    grossPnlInrCents: 0,
    netPnlBeforeAdvanceInrCents: 0,
  };
}

export function buildOverviewMonthlyPnlRows(input: {
  dashboardDataByCompanyId: Map<string, PnDashboardData>;
  monthKeys: string[];
}): OverviewMonthlyPnlRow[] {
  if (input.dashboardDataByCompanyId.size === 0) return [];

  const rowsByMonth = new Map(
    input.monthKeys.map((monthKey) => [monthKey, emptyMonthlyPnlRow(monthKey)] as const),
  );

  const periodRows = mergePnPeriodRows(
    [...input.dashboardDataByCompanyId.values()].flatMap((data) => data.periodRows),
  );
  for (const periodRow of periodRows) {
    const target = rowsByMonth.get(rowMonthKey(periodRow));
    if (!target) continue;

    target.effectiveDollarInwardUsdCents = periodRow.effectiveDollarInwardUsdCents;
    target.cashoutUsdInrRate =
      periodRow.effectiveDollarInwardUsdCents === 0 || periodRow.cashoutUsdInrRate <= 0
        ? null
        : periodRow.cashoutUsdInrRate;
    target.effectiveInwardInrCents = periodRow.cashInInrCents;
    target.salaryPaidInrCents = periodRow.salaryPaidInrCents;
    target.pfInrCents = periodRow.pfInrCents;
    target.tdsInrCents = periodRow.tdsInrCents;
    target.fxGainInrCents = periodRow.fxCommissionInrCents;
    target.operatingMarginInrCents = periodRow.commissionEarnedInrCents;
    target.grossPnlInrCents = periodRow.grossEarningsInrCents;
    target.expensesInrCents = periodRow.expensesInrCents;
    target.advancesInrCents = periodRow.advancesInrCents;
    target.netPnlBeforeAdvanceInrCents =
      periodRow.grossEarningsInrCents - periodRow.expensesInrCents;
  }

  return input.monthKeys.map((monthKey) => rowsByMonth.get(monthKey)!);
}

export function buildOverviewMonthlyPnlTotals(
  rows: OverviewMonthlyPnlRow[],
): OverviewMonthlyPnlRow {
  const sum = (select: (row: OverviewMonthlyPnlRow) => number) =>
    rows.reduce((total, row) => total + select(row), 0);
  const sumAvailable = (
    select: (row: OverviewMonthlyPnlRow) => number | null,
  ) => rows.every((row) => select(row) !== null)
    ? rows.reduce((total, row) => total + (select(row) ?? 0), 0)
    : null;
  const effectiveDollarInwardUsdCents = sum(
    (row) => row.effectiveDollarInwardUsdCents,
  );
  const effectiveInwardInrCents = sumAvailable((row) => row.effectiveInwardInrCents);
  const grossPnlInrCents = sumAvailable((row) => row.grossPnlInrCents);
  const expensesInrCents = sum((row) => row.expensesInrCents);

  return {
    monthKey: "__total__",
    periodLabel: "Totals",
    effectiveDollarInwardUsdCents,
    cashoutUsdInrRate:
      effectiveInwardInrCents === null || effectiveDollarInwardUsdCents === 0
        ? null
        : effectiveInwardInrCents / effectiveDollarInwardUsdCents,
    effectiveInwardInrCents,
    salaryPaidInrCents: sum((row) => row.salaryPaidInrCents),
    pfInrCents: sum((row) => row.pfInrCents),
    tdsInrCents: sum((row) => row.tdsInrCents),
    expensesInrCents,
    advancesInrCents: sum((row) => row.advancesInrCents),
    fxGainInrCents: sumAvailable((row) => row.fxGainInrCents),
    operatingMarginInrCents: sumAvailable((row) => row.operatingMarginInrCents),
    grossPnlInrCents,
    netPnlBeforeAdvanceInrCents:
      grossPnlInrCents === null ? null : grossPnlInrCents - expensesInrCents,
  };
}

export function calculateOverviewMonthlyNetPlInrCents(
  row: OverviewMonthlyPnlRow,
  excludeAdvanceDeduction: boolean,
) {
  if (row.netPnlBeforeAdvanceInrCents === null) return null;
  return (
    row.netPnlBeforeAdvanceInrCents -
    (excludeAdvanceDeduction ? 0 : row.advancesInrCents)
  );
}

function buildTotals(
  periodRows: PnPeriodRow[],
  accountingOptions: DashboardExportOptions = {
    includeExpenses: true,
    includeAdvances: true,
    includeReimbursements: true,
  },
) {
  return buildPeriodTotals(periodRows, accountingOptions);
}

export function buildOverviewCompanySummaryRows(input: {
  companies: Array<Pick<Company, "id" | "name">>;
  dashboardDataByCompanyId: Map<string, PnDashboardData>;
  monthKeys: string[];
  periodLabel: string;
  accountingOptions?: DashboardExportOptions;
}): OverviewPnlSummaryRow[] {
  const selectedMonthKeys = new Set(input.monthKeys);

  return input.companies.map((company) => {
    const periodRows = (input.dashboardDataByCompanyId.get(company.id)?.periodRows ?? []).filter(
      (row) => selectedMonthKeys.has(rowMonthKey(row)),
    );

    return {
      companyId: company.id,
      companyName: company.name,
      periodLabel: input.periodLabel,
      sourcePeriodRows: periodRows,
      totals: buildTotals(periodRows, input.accountingOptions),
    };
  });
}

export function buildOverviewGrandTotalRow(
  rows: OverviewPnlSummaryRow[],
  periodLabel: string,
  accountingOptions?: DashboardExportOptions,
): OverviewPnlSummaryRow {
  const sourcePeriodRows = rows.flatMap((row) => row.sourcePeriodRows);

  return {
    companyId: "__total__",
    companyName: "Total",
    periodLabel,
    sourcePeriodRows,
    totals: buildTotals(sourcePeriodRows, accountingOptions),
  };
}

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
