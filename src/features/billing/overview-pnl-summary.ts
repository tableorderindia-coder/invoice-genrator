import { buildPeriodTotals } from "./dashboard-table-totals";
import type { Company, PnDashboardData, PnPeriodRow } from "./types";
import { formatMonthYear } from "./utils";

export type OverviewPnlSummaryRow = {
  companyId: string;
  companyName: string;
  periodLabel: string;
  sourcePeriodRows: PnPeriodRow[];
  totals: ReturnType<typeof buildPeriodTotals>;
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
  let startMonth = isValidMonthKey(input.startMonth) ? input.startMonth : fallbackMonth;
  let endMonth = isValidMonthKey(input.endMonth) ? input.endMonth : startMonth;

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

function buildTotals(periodRows: PnPeriodRow[]) {
  return buildPeriodTotals(periodRows, {
    includeExpenses: true,
    includeReimbursements: true,
  });
}

export function buildOverviewCompanySummaryRows(input: {
  companies: Array<Pick<Company, "id" | "name">>;
  dashboardDataByCompanyId: Map<string, PnDashboardData>;
  monthKeys: string[];
  periodLabel: string;
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
      totals: buildTotals(periodRows),
    };
  });
}

export function buildOverviewGrandTotalRow(
  rows: OverviewPnlSummaryRow[],
  periodLabel: string,
): OverviewPnlSummaryRow {
  const sourcePeriodRows = rows.flatMap((row) => row.sourcePeriodRows);

  return {
    companyId: "__total__",
    companyName: "Total",
    periodLabel,
    sourcePeriodRows,
    totals: buildTotals(sourcePeriodRows),
  };
}

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
