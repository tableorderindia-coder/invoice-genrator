import { unstable_cache } from "next/cache";

import { normalizePayrollMonthKey } from "./payroll";
import { listMonthlyPayrollRows } from "./payroll-store";
import { buildPortalSnapshotKey, getOrBuildPortalSnapshot } from "./portal-snapshot-cache";
import { billingCacheTags } from "./cache-tags";
import type { MonthlyPayrollRow } from "./payroll";

// Same fix as cached-store.ts: billingCacheTags.salary(companyId, month) was
// already being invalidated on every salary/employee mutation
// (src/features/billing/actions.ts), but nothing ever cached a read under
// that tag, so the Salary page recomputed payroll rows from Postgres on
// every navigation. See cached-store.ts for why unstable_cache is safe here
// now (companyId/month are explicit args, not an implicit per-user client).
export function listCachedMonthlyPayrollRows(input: {
  companyId: string;
  month: string;
}) {
  const month = normalizePayrollMonthKey(input.month);

  return unstable_cache(
    () =>
      getOrBuildPortalSnapshot<MonthlyPayrollRow[]>({
        key: buildPortalSnapshotKey({
          companyId: input.companyId,
          snapshotType: "salary-month",
          monthKey: month,
        }),
        build: () => listMonthlyPayrollRows({ companyId: input.companyId, month }),
      }),
    ["billing-salary-month", input.companyId, month],
    {
      tags: [
        billingCacheTags.salary(input.companyId, month),
        billingCacheTags.salary(input.companyId),
      ],
    },
  )();
}
