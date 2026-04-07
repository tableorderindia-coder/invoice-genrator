import { existsSync } from "node:fs";
import path from "node:path";

import PDFDocument from "pdfkit";

import type { InvoiceDetail } from "./types";
import { formatDate, formatMonthYear, formatUsd } from "./utils";

export async function buildInvoicePdf(detail: InvoiceDetail) {
  const bundledFontPath = path.join(
    process.cwd(),
    "assets",
    "fonts",
    "Inter-Variable.ttf",
  );
  const windowsFallbackFontPath = "C:\\Windows\\Fonts\\arial.ttf";
  const doc = new PDFDocument({
    margin: 48,
    font: existsSync(bundledFontPath)
      ? bundledFontPath
      : existsSync(windowsFallbackFontPath)
        ? windowsFallbackFontPath
        : undefined,
  });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk));

  doc.fontSize(20).text(detail.company.name);
  doc.moveDown(0.25);
  doc.fontSize(10).fillColor("#4b5563").text(detail.company.billingAddress);
  doc.moveDown();

  doc.fillColor("#111827").fontSize(16).text("Invoice");
  doc.moveDown(0.5);
  doc.fontSize(10);
  doc.text(`Period: ${formatMonthYear(detail.invoice.month, detail.invoice.year)}`);
  doc.text(`Invoice No: ${detail.invoice.invoiceNumber}`);
  doc.text(`Billing Date: ${formatDate(detail.invoice.billingDate)}`);
  doc.text(`Due Date: ${formatDate(detail.invoice.dueDate)}`);
  doc.text(`Status: ${detail.invoice.status}`);
  doc.moveDown();

  for (const team of detail.teams) {
    doc.fontSize(13).fillColor("#111827").text(team.teamName);
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor("#374151");

    for (const lineItem of team.lineItems) {
      doc.text(
        `${lineItem.employeeNameSnapshot} • ${lineItem.designationSnapshot} • ${lineItem.hoursBilled} hrs • ${formatUsd(lineItem.billedTotalUsdCents)}`,
      );
    }

    if (team.lineItems.length === 0) {
      doc.text("No candidates added yet.");
    }

    doc.moveDown();
  }

  doc.fontSize(13).fillColor("#111827").text("Adjustments");
  doc.moveDown(0.25);
  doc.fontSize(10).fillColor("#374151");

  if (detail.adjustments.length === 0) {
    doc.text("No adjustments added.");
  }

  for (const adjustment of detail.adjustments) {
    doc.text(
      `${adjustment.label}${adjustment.employeeName ? ` (${adjustment.employeeName})` : ""}: ${formatUsd(adjustment.amountUsdCents)}`,
    );
  }

  doc.moveDown();
  doc.fontSize(13).fillColor("#111827").text("Totals");
  doc.moveDown(0.25);
  doc.fontSize(10).fillColor("#374151");
  doc.text(`Subtotal: ${formatUsd(detail.invoice.subtotalUsdCents)}`);
  doc.text(`Adjustments: ${formatUsd(detail.invoice.adjustmentsUsdCents)}`);
  doc.text(`Grand Total: ${formatUsd(detail.invoice.grandTotalUsdCents)}`);
  doc.moveDown();

  doc.fontSize(13).fillColor("#111827").text("Note");
  doc.moveDown(0.25);
  doc.fontSize(10).fillColor("#374151").text(detail.invoice.noteText);
  doc.end();

  await new Promise<void>((resolve) => doc.on("end", resolve));
  return Buffer.concat(chunks);
}
