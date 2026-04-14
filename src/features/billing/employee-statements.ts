import { normalizeMultiSelectValue } from "./filter-selection";
import type {
  EmployeeStatementInvoiceRow,
  EmployeeStatementMonthSummary,
  EmployeeStatementSection,
} from "./types";

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

export function calculateStatementEffectiveDollarInwardUsdCents(input: {
  dollarInwardUsdCents: number;
  onboardingAdvanceUsdCents: number;
  reimbursementUsdCents: number;
  offboardingDeductionUsdCents: number;
}) {
  return (
    input.dollarInwardUsdCents +
    input.onboardingAdvanceUsdCents +
    input.reimbursementUsdCents -
    input.offboardingDeductionUsdCents
  );
}

export function buildEmployeeStatementSection(input: {
  employee: { id: string; fullName: string; payoutMonthlyUsdCents: number };
  rows: EmployeeStatementInvoiceRow[];
}): EmployeeStatementSection {
  const monthGroups = groupEmployeeStatementRows(input.rows);

  return {
    employeeId: input.employee.id,
    employeeName: input.employee.fullName,
    months: monthGroups.map((group) => ({
      monthKey: group.monthKey,
      monthLabel: group.rows[0]?.monthLabel ?? group.monthKey,
      rows: group.rows,
      monthlyDollarPaidUsdCents: input.employee.payoutMonthlyUsdCents,
      effectiveDollarInwardUsdCents: group.rows.reduce(
        (sum, row) =>
          sum +
          calculateStatementEffectiveDollarInwardUsdCents({
            dollarInwardUsdCents: row.dollarInwardUsdCents,
            onboardingAdvanceUsdCents: row.onboardingAdvanceUsdCents,
            reimbursementUsdCents: row.reimbursementUsdCents,
            offboardingDeductionUsdCents: row.offboardingDeductionUsdCents,
          }),
        0,
      ),
    })),
  };
}

export function buildEmployeeStatementSavePayload(input: {
  employeeId: string;
  invoiceRows: EmployeeStatementInvoiceRow[];
  monthSummaries: EmployeeStatementMonthSummary[];
}) {
  return input;
}

export function applySavedEmployeeStatementOverrides(
  section: EmployeeStatementSection,
  saved: {
    invoiceRows: EmployeeStatementInvoiceRow[];
    monthSummaries: EmployeeStatementMonthSummary[];
  },
): EmployeeStatementSection {
  const savedInvoiceRowByInvoiceId = new Map(
    saved.invoiceRows.map((row) => [row.invoiceId, row]),
  );
  const savedMonthSummaryByMonthKey = new Map(
    saved.monthSummaries.map((summary) => [summary.monthKey, summary]),
  );

  return {
    ...section,
    months: section.months.map((month) => {
      const savedMonthSummary = savedMonthSummaryByMonthKey.get(month.monthKey);

      return {
        ...month,
        rows: month.rows.map((row) => {
          const savedRow = savedInvoiceRowByInvoiceId.get(row.invoiceId);
          if (!savedRow) {
            return row;
          }

          return {
            ...row,
            dollarInwardUsdCents: savedRow.dollarInwardUsdCents,
            onboardingAdvanceUsdCents: savedRow.onboardingAdvanceUsdCents,
            reimbursementUsdCents: savedRow.reimbursementUsdCents,
            reimbursementLabelsText: savedRow.reimbursementLabelsText,
            offboardingDeductionUsdCents: savedRow.offboardingDeductionUsdCents,
          };
        }),
        effectiveDollarInwardUsdCents:
          savedMonthSummary?.effectiveDollarInwardUsdCents ??
          month.effectiveDollarInwardUsdCents,
        monthlyDollarPaidUsdCents:
          savedMonthSummary?.monthlyDollarPaidUsdCents ??
          month.monthlyDollarPaidUsdCents,
      };
    }),
  };
}
