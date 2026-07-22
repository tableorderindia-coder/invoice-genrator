import { NextResponse } from "next/server";

import { requireApiAccess } from "@/lib/auth/api";
import { filterCompaniesForAuthContext } from "@/src/features/billing/company-access";
import { listCachedCompanies } from "@/src/features/billing/cached-store";
import { rebuildPnSummariesForCompany } from "@/src/features/billing/pn-summary-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await requireApiAccess({
    page: "dashboard",
    edit: true,
    pathname: "/api/admin/pn-summaries/rebuild",
  });
  if (!access.ok) {
    return access.response;
  }

  const url = new URL(request.url);
  const requestedCompanyId = url.searchParams.get("companyId") ?? "";
  const companies = filterCompaniesForAuthContext(await listCachedCompanies(), access.context);
  const selectedCompanies = requestedCompanyId
    ? companies.filter((company) => company.id === requestedCompanyId)
    : companies;

  if (requestedCompanyId && selectedCompanies.length === 0) {
    return NextResponse.json({ error: "Company not found or not accessible." }, { status: 404 });
  }

  const startedAt = Date.now();
  const results: Array<{ companyId: string; companyName: string; ok: boolean; error?: string }> = [];
  for (const company of selectedCompanies) {
    try {
      await rebuildPnSummariesForCompany(company.id);
      results.push({ companyId: company.id, companyName: company.name, ok: true });
    } catch (error) {
      results.push({
        companyId: company.id,
        companyName: company.name,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown rebuild error.",
      });
    }
  }

  const failed = results.filter((result) => !result.ok);
  return NextResponse.json(
    {
      ok: failed.length === 0,
      rebuiltCompanies: results.filter((result) => result.ok).length,
      failedCompanies: failed.length,
      durationMs: Date.now() - startedAt,
      results,
    },
    { status: failed.length === 0 ? 200 : 207 },
  );
}
