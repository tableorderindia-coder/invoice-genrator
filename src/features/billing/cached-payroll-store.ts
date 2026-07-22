import { normalizePayrollMonthKey } from "./payroll";
import { listMonthlyPayrollRows } from "./payroll-store";
import { buildPortalSnapshotKey, getOrBuildPortalSnapshot } from "./portal-snapshot-cache";
import type { MonthlyPayrollRow } from "./payroll";

export function listCachedMonthlyPayrollRows(input: {
  companyId: string;
  month: string;
}) {
  const month = normalizePayrollMonthKey(input.month);

  return getOrBuildPortalSnapshot<MonthlyPayrollRow[]>({
    key: buildPortalSnapshotKey({
      companyId: input.companyId,
      snapshotType: "salary-month",
      monthKey: month,
    }),
    build: () => listMonthlyPayrollRows({ companyId: input.companyId, month }),
  });
}
