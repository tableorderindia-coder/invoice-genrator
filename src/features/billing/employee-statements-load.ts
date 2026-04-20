import {
  applySavedEmployeeStatementOverrides,
  buildEmployeeStatementInvoiceRowFromDetail,
  buildEmployeeStatementSection,
  isEmployeeStatementMonthKeyInRange,
  toEmployeeStatementMonthKey,
} from "./employee-statements";
import {
  getInvoiceDetail,
  listEmployeeStatementInvoiceRows,
  listEmployeeStatementMonthSummaries,
  listEmployees,
  listInvoicesForCompany,
} from "./store";
import type {
  EmployeeStatementInvoiceRow,
  EmployeeStatementMonthSummary,
  EmployeeStatementSection,
  InvoiceDetail,
} from "./types";

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
