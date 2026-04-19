import type { EmployeeCashFlowEditableEntry } from "./employee-cash-flow-types";

export type { EmployeeCashFlowEditableEntry } from "./employee-cash-flow-types";

export function aggregateEmployeeCashFlowEditableEntries(
  entries: EmployeeCashFlowEditableEntry[],
) {
  return [...entries].sort((left, right) => {
    const employeeCompare = left.employeeNameSnapshot.localeCompare(
      right.employeeNameSnapshot,
    );
    if (employeeCompare !== 0) return employeeCompare;

    const invoiceCompare = left.invoiceNumber.localeCompare(right.invoiceNumber);
    if (invoiceCompare !== 0) return invoiceCompare;

    return left.id.localeCompare(right.id);
  });
}
