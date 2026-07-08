import { canAccessCompany } from "@/lib/auth/authorization";
import type { AuthContext } from "@/lib/auth/server";

import type { Company } from "./types";

export function filterCompaniesForAuthContext(
  companies: Company[],
  context: Pick<AuthContext, "profile" | "companyAccess">,
) {
  return companies.filter((company) =>
    canAccessCompany({
      role: context.profile.role,
      companyId: company.id,
      companyAccess: context.companyAccess,
    }),
  );
}

export function resolveAccessibleCompanyId(input: {
  requestedCompanyId?: string;
  companies: Company[];
}) {
  return input.companies.some((company) => company.id === input.requestedCompanyId)
    ? input.requestedCompanyId ?? ""
    : input.companies[0]?.id ?? "";
}
