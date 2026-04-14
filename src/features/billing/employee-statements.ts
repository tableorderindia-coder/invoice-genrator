import { resolveEffectiveLineItemTotalUsdCents } from "./domain";
import { normalizeEmployeeNameForMatch } from "./employee-cash-flow-store";
import {
  formatPaymentMonthLabel,
  normalizeMultiSelectValue,
} from "./filter-selection";
import {
  getInvoiceDetail,
  listEmployeeStatementInvoiceRows,
  listEmployeeStatementMonthSummaries,
  listEmployees,
  listInvoicesForCompany,
} from "./store";
import type {
  Employee,
  EmployeeStatementInvoiceRow,
  EmployeeStatementMonthSummary,
  EmployeeStatementSection,
  InvoiceAdjustment,
  InvoiceDetail,
} from "./types";

type SearchValue = string | string[] | undefined;

export type EmployeeStatementFilters = {
  companyId: string;
  employeeIds: string[];
  startMonth: string;
  endMonth: string;
};

export type EmployeeStatementPdfTotals = {
  dollarInwardUsdCents: number;
  onboardingAdvanceUsdCents: number;
  reimbursementUsdCents: number;
  offboardingDeductionUsdCents: number;
  effectiveDollarInwardUsdCents: number;
  monthlyDollarPaidUsdCents: number;
  totalBalanceUsdCents: number;
};

export type EmployeeStatementPdfInput = {
  companyName: string;
  employeeName: string;
  dateRangeLabel: string;
  generatedDate: string;
  months: EmployeeStatementSection["months"];
  totals: EmployeeStatementPdfTotals;
};

export type FlattenedEmployeeStatementRow =
  | {
      kind: "invoice";
      invoiceId: string;
      monthKey: string;
      monthLabel: string;
      invoiceNumber: string;
      dollarInwardUsdCents: number;
      onboardingAdvanceUsdCents: number;
      reimbursementUsdCents: number;
      reimbursementLabelsText: string;
      offboardingDeductionUsdCents: number;
      effectiveDollarInwardUsdCents: number | null;
      monthlyDollarPaidUsdCents: number | null;
      totalBalanceUsdCents: number | null;
    }
  | {
      kind: "spacer";
      monthKey: string;
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

export function compareEmployeeStatementMonthKeys(left: string, right: string) {
  return left.localeCompare(right);
}

export function isEmployeeStatementMonthKeyInRange(input: {
  monthKey: string;
  startMonth: string;
  endMonth: string;
}) {
  return (
    compareEmployeeStatementMonthKeys(input.monthKey, input.startMonth) >= 0 &&
    compareEmployeeStatementMonthKeys(input.monthKey, input.endMonth) <= 0
  );
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

export function calculateEmployeeStatementTotalBalanceUsdCents(input: {
  effectiveDollarInwardUsdCents: number;
  monthlyDollarPaidUsdCents: number;
}) {
  return input.effectiveDollarInwardUsdCents - input.monthlyDollarPaidUsdCents;
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
      const overriddenRows = month.rows.map((row) => {
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
      });
      const calculatedEffectiveDollarInwardUsdCents = overriddenRows.reduce(
        (sum, row) =>
          sum +
          calculateStatementEffectiveDollarInwardUsdCents({
            dollarInwardUsdCents: row.dollarInwardUsdCents,
            onboardingAdvanceUsdCents: row.onboardingAdvanceUsdCents,
            reimbursementUsdCents: row.reimbursementUsdCents,
            offboardingDeductionUsdCents: row.offboardingDeductionUsdCents,
          }),
        0,
      );

      return {
        ...month,
        rows: overriddenRows,
        effectiveDollarInwardUsdCents:
          savedMonthSummary?.effectiveDollarInwardUsdCents ??
          calculatedEffectiveDollarInwardUsdCents,
        monthlyDollarPaidUsdCents:
          savedMonthSummary?.monthlyDollarPaidUsdCents ??
          month.monthlyDollarPaidUsdCents,
      };
    }),
  };
}

function sumAdjustmentAmounts(
  adjustments: InvoiceAdjustment[],
  type: InvoiceAdjustment["type"],
  employeeNames: Set<string>,
) {
  return adjustments
    .filter((adjustment) => adjustment.type === type)
    .filter((adjustment) => {
      const normalized = normalizeEmployeeNameForMatch(adjustment.employeeName);
      return normalized ? employeeNames.has(normalized) : false;
    })
    .reduce((sum, adjustment) => sum + adjustment.amountUsdCents, 0);
}

function buildReimbursementLabels(
  adjustments: InvoiceAdjustment[],
  employeeNames: Set<string>,
) {
  return adjustments
    .filter((adjustment) => adjustment.type === "reimbursement")
    .filter((adjustment) => {
      const normalized = normalizeEmployeeNameForMatch(adjustment.employeeName);
      return normalized ? employeeNames.has(normalized) : false;
    })
    .map((adjustment) => adjustment.label.trim())
    .filter(Boolean)
    .join(", ");
}

export function buildEmployeeStatementInvoiceRowFromDetail(input: {
  employee: Employee;
  detail: InvoiceDetail;
}) {
  const lineItems = input.detail.teams
    .flatMap((team) => team.lineItems)
    .filter((lineItem) => lineItem.employeeId === input.employee.id);

  const employeeNames = new Set(
    [
      normalizeEmployeeNameForMatch(input.employee.fullName),
      ...lineItems.map((lineItem) =>
        normalizeEmployeeNameForMatch(lineItem.employeeNameSnapshot),
      ),
    ].filter(Boolean),
  );

  const onboardingAdvanceUsdCents = sumAdjustmentAmounts(
    input.detail.adjustments,
    "onboarding",
    employeeNames,
  );
  const reimbursementUsdCents = sumAdjustmentAmounts(
    input.detail.adjustments,
    "reimbursement",
    employeeNames,
  );
  const reimbursementLabelsText = buildReimbursementLabels(
    input.detail.adjustments,
    employeeNames,
  );
  const offboardingDeductionUsdCents = Math.abs(
    sumAdjustmentAmounts(input.detail.adjustments, "offboarding", employeeNames),
  );
  const dollarInwardUsdCents = lineItems.reduce(
    (sum, lineItem) =>
      sum +
      resolveEffectiveLineItemTotalUsdCents({
        formulaTotalUsdCents: lineItem.billedTotalUsdCents,
        manualTotalUsdCents: lineItem.manualTotalUsdCents,
      }),
    0,
  );

  if (
    lineItems.length === 0 &&
    onboardingAdvanceUsdCents === 0 &&
    reimbursementUsdCents === 0 &&
    offboardingDeductionUsdCents === 0
  ) {
    return undefined;
  }

  return {
    employeeId: input.employee.id,
    employeeName: input.employee.fullName,
    invoiceId: input.detail.invoice.id,
    invoiceNumber: input.detail.invoice.invoiceNumber,
    monthKey: toEmployeeStatementMonthKey({
      year: input.detail.invoice.year,
      month: input.detail.invoice.month,
    }),
    monthLabel: formatPaymentMonthLabel(
      toEmployeeStatementMonthKey({
        year: input.detail.invoice.year,
        month: input.detail.invoice.month,
      }),
    ),
    dollarInwardUsdCents,
    onboardingAdvanceUsdCents,
    reimbursementUsdCents,
    reimbursementLabelsText,
    offboardingDeductionUsdCents,
  };
}

export function buildFlattenedEmployeeStatementRows(
  section: EmployeeStatementSection,
): FlattenedEmployeeStatementRow[] {
  return section.months.flatMap((month, monthIndex) => {
    const invoiceRows: FlattenedEmployeeStatementRow[] = month.rows.map((row, rowIndex) => ({
      kind: "invoice",
      invoiceId: row.invoiceId,
      monthKey: row.monthKey,
      monthLabel: row.monthLabel,
      invoiceNumber: row.invoiceNumber,
      dollarInwardUsdCents: row.dollarInwardUsdCents,
      onboardingAdvanceUsdCents: row.onboardingAdvanceUsdCents,
      reimbursementUsdCents: row.reimbursementUsdCents,
      reimbursementLabelsText: row.reimbursementLabelsText,
      offboardingDeductionUsdCents: row.offboardingDeductionUsdCents,
      effectiveDollarInwardUsdCents:
        rowIndex === 0 ? month.effectiveDollarInwardUsdCents : null,
      monthlyDollarPaidUsdCents: rowIndex === 0 ? month.monthlyDollarPaidUsdCents : null,
      totalBalanceUsdCents:
        rowIndex === 0
          ? calculateEmployeeStatementTotalBalanceUsdCents({
              effectiveDollarInwardUsdCents: month.effectiveDollarInwardUsdCents,
              monthlyDollarPaidUsdCents: month.monthlyDollarPaidUsdCents,
            })
          : null,
    }));

    if (monthIndex === section.months.length - 1) {
      return invoiceRows;
    }

    return [
      ...invoiceRows,
      {
        kind: "spacer",
        monthKey: month.monthKey,
      } satisfies FlattenedEmployeeStatementRow,
    ];
  });
}

export async function listEmployeeStatementSections(input: {
  companyId: string;
  employeeIds?: string[];
  startMonth: string;
  endMonth: string;
}) {
  if (!input.companyId || !input.startMonth || !input.endMonth) {
    return [] as EmployeeStatementSection[];
  }

  const employees = await listEmployees(input.companyId);
  const selectedEmployees =
    input.employeeIds && input.employeeIds.length > 0
      ? employees.filter((employee) => input.employeeIds?.includes(employee.id))
      : employees;

  if (selectedEmployees.length === 0) {
    return [] as EmployeeStatementSection[];
  }

  const invoices = await listInvoicesForCompany(input.companyId);
  const invoicesInRange = invoices.filter((invoice) =>
    invoice.status !== "draft" &&
    isEmployeeStatementMonthKeyInRange({
      monthKey: toEmployeeStatementMonthKey({
        year: invoice.year,
        month: invoice.month,
      }),
      startMonth: input.startMonth,
      endMonth: input.endMonth,
    }),
  );

  if (invoicesInRange.length === 0) {
    return [] as EmployeeStatementSection[];
  }

  const [details, savedInvoiceRows, savedMonthSummaries] = await Promise.all([
    Promise.all(invoicesInRange.map((invoice) => getInvoiceDetail(invoice.id))),
    listEmployeeStatementInvoiceRows({
      employeeIds: selectedEmployees.map((employee) => employee.id),
      startMonth: input.startMonth,
      endMonth: input.endMonth,
    }),
    listEmployeeStatementMonthSummaries({
      employeeIds: selectedEmployees.map((employee) => employee.id),
      startMonth: input.startMonth,
      endMonth: input.endMonth,
    }),
  ]);

  const validDetails = details.filter(Boolean) as InvoiceDetail[];
  const savedRowsByEmployeeId = new Map<string, EmployeeStatementInvoiceRow[]>();
  for (const row of savedInvoiceRows) {
    const existing = savedRowsByEmployeeId.get(row.employeeId) ?? [];
    existing.push(row);
    savedRowsByEmployeeId.set(row.employeeId, existing);
  }

  const savedMonthsByEmployeeId = new Map<string, EmployeeStatementMonthSummary[]>();
  for (const summary of savedMonthSummaries) {
    const existing = savedMonthsByEmployeeId.get(summary.employeeId) ?? [];
    existing.push(summary);
    savedMonthsByEmployeeId.set(summary.employeeId, existing);
  }

  return selectedEmployees
    .map((employee) => {
      const rows = validDetails
        .map((detail) =>
          buildEmployeeStatementInvoiceRowFromDetail({
            employee,
            detail,
          }),
        )
        .filter(Boolean) as EmployeeStatementInvoiceRow[];

      if (rows.length === 0) {
        return undefined;
      }

      return applySavedEmployeeStatementOverrides(
        buildEmployeeStatementSection({
          employee,
          rows,
        }),
        {
          invoiceRows: savedRowsByEmployeeId.get(employee.id) ?? [],
          monthSummaries: savedMonthsByEmployeeId.get(employee.id) ?? [],
        },
      );
    })
    .filter(Boolean)
    .sort((left, right) =>
      (left?.employeeName ?? "").localeCompare(right?.employeeName ?? ""),
    ) as EmployeeStatementSection[];
}

export function buildEmployeeStatementTotals(section: EmployeeStatementSection) {
  return section.months.reduce<EmployeeStatementPdfTotals>(
    (totals, month) => {
      for (const row of month.rows) {
        totals.dollarInwardUsdCents += row.dollarInwardUsdCents;
        totals.onboardingAdvanceUsdCents += row.onboardingAdvanceUsdCents;
        totals.reimbursementUsdCents += row.reimbursementUsdCents;
        totals.offboardingDeductionUsdCents += row.offboardingDeductionUsdCents;
      }

      totals.effectiveDollarInwardUsdCents += month.effectiveDollarInwardUsdCents;
      totals.monthlyDollarPaidUsdCents += month.monthlyDollarPaidUsdCents;
      totals.totalBalanceUsdCents += calculateEmployeeStatementTotalBalanceUsdCents({
        effectiveDollarInwardUsdCents: month.effectiveDollarInwardUsdCents,
        monthlyDollarPaidUsdCents: month.monthlyDollarPaidUsdCents,
      });
      return totals;
    },
    {
      dollarInwardUsdCents: 0,
      onboardingAdvanceUsdCents: 0,
      reimbursementUsdCents: 0,
      offboardingDeductionUsdCents: 0,
      effectiveDollarInwardUsdCents: 0,
      monthlyDollarPaidUsdCents: 0,
      totalBalanceUsdCents: 0,
    },
  );
}

export function buildEmployeeStatementDateRangeLabel(input: {
  startMonth: string;
  endMonth: string;
}) {
  if (input.startMonth === input.endMonth) {
    return formatPaymentMonthLabel(input.startMonth);
  }

  return `${formatPaymentMonthLabel(input.startMonth)} - ${formatPaymentMonthLabel(input.endMonth)}`;
}

export function buildEmployeeStatementPdfInput(input: {
  companyName: string;
  section: EmployeeStatementSection;
  startMonth: string;
  endMonth: string;
  generatedDate: string;
}): EmployeeStatementPdfInput {
  return {
    companyName: input.companyName,
    employeeName: input.section.employeeName,
    dateRangeLabel: buildEmployeeStatementDateRangeLabel({
      startMonth: input.startMonth,
      endMonth: input.endMonth,
    }),
    generatedDate: input.generatedDate,
    months: input.section.months,
    totals: buildEmployeeStatementTotals(input.section),
  };
}
