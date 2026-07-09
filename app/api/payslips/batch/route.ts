import { NextResponse } from "next/server";
import JSZip from "jszip";

import { requireApiAccess } from "@/lib/auth/api";
import { canAccessCompany } from "@/lib/auth/authorization";
import { buildPayslipPdf } from "@/src/features/billing/payslip-pdf";
import { listPayslipRecords } from "@/src/features/billing/payslip-store";
import { sanitizeDownloadFilename } from "@/src/features/billing/utils";

export const runtime = "nodejs";

const EASSY_ONBOARD = {
  name: "EASSY ONBOARD LLP",
  address:
    "#PLOT NO:-37, KANTESHVAR SOCIETY-1, DABHOLI ROAD, NEAR LALITA CHOKDI, KATARGAM, SURAT, GUJARAT-395004",
};

export async function GET(request: Request) {
  const access = await requireApiAccess({
    page: "salary",
    pathname: "/api/payslips/batch",
  });
  if (!access.ok) {
    return access.response;
  }

  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId") ?? "";
  const month = url.searchParams.get("month") ?? "";
  if (!companyId || !month) {
    return NextResponse.json({ error: "Company and month are required." }, { status: 400 });
  }

  if (
    !canAccessCompany({
      role: access.context.profile.role,
      companyId,
      companyAccess: access.context.companyAccess,
    })
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payslips = await listPayslipRecords({ companyId, month });
  const zip = new JSZip();

  for (const payslip of payslips) {
    const pdf = await buildPayslipPdf({
      payslip,
      companyName: EASSY_ONBOARD.name,
      companyAddress: EASSY_ONBOARD.address,
    });
    zip.file(`${sanitizeDownloadFilename(`${payslip.employeeName}-${month}-payslip`)}.pdf`, pdf);
  }

  const zipBuffer = await zip.generateAsync({ type: "uint8array" });
  const filename = sanitizeDownloadFilename(`payslips-${companyId}-${month}`);

  return new NextResponse(Buffer.from(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(zipBuffer.byteLength),
      "Content-Disposition": `attachment; filename="${filename}.zip"`,
    },
  });
}
