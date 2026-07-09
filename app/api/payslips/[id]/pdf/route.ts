import { NextResponse } from "next/server";

import { requireApiAccess } from "@/lib/auth/api";
import { canAccessCompany } from "@/lib/auth/authorization";
import { buildPayslipPdf } from "@/src/features/billing/payslip-pdf";
import { getPayslipRecord } from "@/src/features/billing/payslip-store";
import { sanitizeDownloadFilename } from "@/src/features/billing/utils";

export const runtime = "nodejs";

const EASSY_ONBOARD = {
  name: "EASSY ONBOARD LLP",
  address:
    "#PLOT NO:-37, KANTESHVAR SOCIETY-1, DABHOLI ROAD, NEAR LALITA CHOKDI, KATARGAM, SURAT, GUJARAT-395004",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireApiAccess({
    page: "salary",
    pathname: "/api/payslips/pdf",
  });
  if (!access.ok) {
    return access.response;
  }

  const { id } = await context.params;
  const payslip = await getPayslipRecord({ payslipId: id });
  if (!payslip) {
    return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
  }

  if (
    !canAccessCompany({
      role: access.context.profile.role,
      companyId: payslip.companyId,
      companyAccess: access.context.companyAccess,
    })
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const pdf = await buildPayslipPdf({
    payslip,
    companyName: EASSY_ONBOARD.name,
    companyAddress: EASSY_ONBOARD.address,
  });
  const bytes = new Uint8Array(pdf);
  const filename = sanitizeDownloadFilename(`${payslip.employeeName}-${payslip.month}-payslip`);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
    },
  });
}
