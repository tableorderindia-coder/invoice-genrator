import { NextResponse } from "next/server";

import { requirePageAccess } from "@/lib/auth/server";
import { filterCompaniesForAuthContext } from "@/src/features/billing/company-access";
import {
  listCachedCompanies,
  listCachedCompanyExpensesForCompanies,
} from "@/src/features/billing/cached-store";
import { resolveSelectedCompanyIds } from "@/src/features/billing/filter-selection";
import {
  currentExpenseMonthKey,
  formatExpensePeriodLabel,
  normalizeExpensePeriodRange,
} from "@/src/features/billing/expense-period";
import {
  buildExpenseExportCsv,
  buildExpenseExportPdf,
} from "@/src/features/billing/expense-export";
import { sanitizeDownloadFilename } from "@/src/features/billing/utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await requirePageAccess("expenses");
  const url = new URL(request.url);
  const companies = filterCompaniesForAuthContext(await listCachedCompanies(), context);
  const selectedCompanyIds = resolveSelectedCompanyIds({
    companyIds: url.searchParams.getAll("companyIds"),
    companyId: url.searchParams.get("companyId") ?? undefined,
    companies,
  });
  const period = normalizeExpensePeriodRange({
    startMonth: url.searchParams.get("startMonth"),
    endMonth: url.searchParams.get("endMonth"),
    fallbackMonth: currentExpenseMonthKey(),
  });
  const expenses = await listCachedCompanyExpensesForCompanies({
    companyIds: selectedCompanyIds,
    startMonth: period.startMonth,
    endMonth: period.endMonth,
  });
  const companyLabel =
    selectedCompanyIds.length === 1
      ? companies.find((company) => company.id === selectedCompanyIds[0])?.name ?? "Company"
      : "Selected companies";
  const periodLabel = formatExpensePeriodLabel(period.startMonth, period.endMonth);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "csv";
  const fileBase = sanitizeDownloadFilename(`expenses-${companyLabel}-${period.startMonth}-${period.endMonth}`);

  if (format === "pdf") {
    const pdf = await buildExpenseExportPdf({ companyLabel, periodLabel, expenses });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${fileBase}.pdf"`,
      },
    });
  }

  return new NextResponse(buildExpenseExportCsv(expenses), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileBase}.csv"`,
    },
  });
}
