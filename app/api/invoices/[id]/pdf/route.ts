import { NextResponse } from "next/server";

import { buildInvoicePdf } from "@/src/features/billing/pdf";
import { getInvoiceDetail } from "@/src/features/billing/store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const detail = await getInvoiceDetail(id);

  if (!detail) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const pdf = await buildInvoicePdf(detail);
  const bytes = new Uint8Array(pdf);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `inline; filename="${detail.invoice.invoiceNumber}.pdf"`,
    },
  });
}
