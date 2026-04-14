import { normalizeMultiSelectValue } from "./filter-selection";

type SearchValue = string | string[] | undefined;

export type EmployeeStatementFilters = {
  companyId: string;
  employeeIds: string[];
  startMonth: string;
  endMonth: string;
};

export function parseEmployeeStatementFilters(input: {
  companyId?: SearchValue;
  employeeIds?: SearchValue;
  startMonth?: SearchValue;
  endMonth?: SearchValue;
}): EmployeeStatementFilters {
  const companyId = Array.isArray(input.companyId)
    ? (input.companyId[0] ?? "")
    : (input.companyId ?? "");
  const startMonth = Array.isArray(input.startMonth)
    ? (input.startMonth[0] ?? "")
    : (input.startMonth ?? "");
  const endMonth = Array.isArray(input.endMonth)
    ? (input.endMonth[0] ?? "")
    : (input.endMonth ?? "");

  return {
    companyId,
    employeeIds: normalizeMultiSelectValue(input.employeeIds),
    startMonth,
    endMonth,
  };
}

export function toEmployeeStatementMonthKey(input: { year: number; month: number }) {
  return `${input.year}-${String(input.month).padStart(2, "0")}`;
}

export function groupEmployeeStatementRows<
  TRow extends { monthKey: string; invoiceNumber: string },
>(rows: TRow[]) {
  const groups = new Map<string, TRow[]>();

  for (const row of rows) {
    const monthRows = groups.get(row.monthKey) ?? [];
    monthRows.push(row);
    groups.set(row.monthKey, monthRows);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, monthRows]) => ({
      monthKey,
      rows: monthRows.sort((left, right) =>
        left.invoiceNumber.localeCompare(right.invoiceNumber),
      ),
    }));
}
