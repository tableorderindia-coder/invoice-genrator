import { NextResponse } from "next/server";

import {
  buildEmployeeStatementPdfInput,
  listEmployeeStatementSections,
} from "@/src/features/billing/employee-statements";
import { buildEmployeeStatementPdf } from "@/src/features/billing/employee-statements-pdf";
import { listCompanies } from "@/src/features/billing/store";
import { sanitizeDownloadFilename, formatDate } from "@/src/features/billing/utils";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ employeeId: string }> },
) {
  const { employeeId } = await context.params;
  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId") ?? "";
  const startMonth = url.searchParams.get("startMonth") ?? "";
  const endMonth = url.searchParams.get("endMonth") ?? "";

  if (!companyId || !startMonth || !endMonth) {
    return NextResponse.json(
      { error: "companyId, startMonth, and endMonth are required." },
      { status: 400 },
    );
  }

  const companies = await listCompanies();
  const company = companies.find((item) => item.id === companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const sections = await listEmployeeStatementSections({
    companyId,
    employeeIds: [employeeId],
    startMonth,
    endMonth,
  });
  const section = sections[0];

  if (!section) {
    return NextResponse.json({ error: "Employee statement not found." }, { status: 404 });
  }

  const pdf = await buildEmployeeStatementPdf(
    buildEmployeeStatementPdfInput({
      companyName: company.name,
      section,
      startMonth,
      endMonth,
      generatedDate: formatDate(new Date()),
    }),
  );
  const bytes = new Uint8Array(pdf);
  const filename = sanitizeDownloadFilename(
    `${company.name}-${section.employeeName}-statement-${startMonth}-to-${endMonth}`,
  );

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
    },
  });
}
