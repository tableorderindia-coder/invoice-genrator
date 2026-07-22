import { unstable_cache } from "next/cache";

import { billingCacheTags } from "./cache-tags";
import { normalizePayrollMonthKey } from "./payroll";
import { listMonthlyPayrollRows } from "./payroll-store";

export function listCachedMonthlyPayrollRows(input: {
  companyId: string;
  month: string;
}) {
  const month = normalizePayrollMonthKey(input.month);

  return unstable_cache(
    () => listMonthlyPayrollRows({ companyId: input.companyId, month }),
    ["billing", "salary", input.companyId, month],
    {
      tags: [
        billingCacheTags.salary(input.companyId),
        billingCacheTags.salary(input.companyId, month),
      ],
      revalidate: 60,
    },
  )();
}
