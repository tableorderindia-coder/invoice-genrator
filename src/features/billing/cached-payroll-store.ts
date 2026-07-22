import { normalizePayrollMonthKey } from "./payroll";
import { listMonthlyPayrollRows } from "./payroll-store";

export function listCachedMonthlyPayrollRows(input: {
  companyId: string;
  month: string;
}) {
  const month = normalizePayrollMonthKey(input.month);

  return listMonthlyPayrollRows({ companyId: input.companyId, month });
}
