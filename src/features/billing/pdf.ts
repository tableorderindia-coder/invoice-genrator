import { existsSync } from "node:fs";
import path from "node:path";

import PDFDocument from "pdfkit";

import { groupInvoiceAdjustments } from "./adjustments";
import type { InvoiceAdjustment, InvoiceDetail } from "./types";

type PdfSectionRow = {
  contractorName: string;
  hourlyRate: string;
  hrsPerWeek: string;
  total: string;
};

type PdfSection = {
  title: string;
  totalLabel: string;
  rows: PdfSectionRow[];
  totalAmount: string;
  isDeduction?: boolean;
};

type PdfModel = {
  billTo: {
    name: string;
    address: string;
  };
  invoiceDetails: {
    invoiceNumber: string;
    invoiceDate: string;
    billingDuration: string;
    dueDate: string;
  };
  sections: PdfSection[];
  grandTotal: {
    formula: string;
    amount: string;
  };
  note: string;
};

const BRAND = {
  name: "EASSY ONBOARD LLP",
  addressLines: [
    "Plot No. 37,Kanteshver Society,",
    "Katargam , Surat, Gujarat, 395004",
    "GST: 24AAMFE1555A1ZW",
  ],
  website: "www.eassyonboard.com",
  email: "admin@eassyonboard.com",
  phone: "+91 8989284740",
  signoffLines: ["Regards,", "Nirbhay Kumar Giri", "Partner, Eassy Onboard LLP"],
};

const COLORS = {
  ink: "#111111",
  blue: "#5b9be6",
  line: "#252525",
  muted: "#404040",
};

const PAGE = {
  margin: 40,
  footerGap: 36,
};

export function buildInvoicePdfModel(detail: InvoiceDetail): PdfModel {
  const teamSections = [...detail.teams]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .filter((team) => team.lineItems.length > 0)
    .map((team, index) => ({
      title: `${team.teamName} :`,
      totalLabel: `Total (${sectionLetter(index)})`,
      rows: team.lineItems.map((lineItem) => ({
        contractorName: lineItem.employeeNameSnapshot,
        hourlyRate: formatUsdCompact(lineItem.billingRateUsdCents),
        hrsPerWeek: formatHours(lineItem.hrsPerWeek),
        total: formatUsdCompact(lineItem.billedTotalUsdCents),
      })),
      totalAmount: formatUsdCompact(
        team.lineItems.reduce(
          (sum, lineItem) => sum + lineItem.billedTotalUsdCents,
          0,
        ),
      ),
    }));

  const groupedAdjustments = groupInvoiceAdjustments(detail.adjustments);
  const sections: PdfSection[] = [...teamSections];

  const adjustmentSections = [
    {
      title: "Onboarding Advance",
      items: groupedAdjustments.onboarding.items,
      isDeduction: false,
    },
    {
      title: "Appraisal Advance",
      items: groupedAdjustments.appraisal.items,
      isDeduction: false,
    },
    {
      title: "Reimbursements / Expenses",
      items: groupedAdjustments.reimbursement.items,
      isDeduction: false,
    },
    {
      title: "Off-Boarding Adjustments",
      items: groupedAdjustments.offboarding.items,
      isDeduction: true,
    },
  ];

  for (const adjustmentSection of adjustmentSections) {
    const rows = buildAdjustmentRows(
      adjustmentSection.items,
      adjustmentSection.isDeduction,
    );

    if (rows.length === 0) {
      continue;
    }

    sections.push({
      title: adjustmentSection.title,
      totalLabel: `Total (${sectionLetter(sections.length)})`,
      rows,
      totalAmount: formatUsdCompact(sumRows(rows)),
      isDeduction: adjustmentSection.isDeduction,
    });
  }

  const positiveSections = sections.filter((section) => !section.isDeduction);
  const deductionSections = sections.filter((section) => section.isDeduction);
  const formulaParts = [
    ...positiveSections.map((section) => section.totalLabel.replace(/\s/g, "")),
    ...deductionSections.map((section) => `- ${section.totalLabel.replace(/\s/g, "")}`),
  ];

  return {
    billTo: {
      name: detail.company.name,
      address: detail.company.billingAddress,
    },
    invoiceDetails: {
      invoiceNumber: detail.invoice.invoiceNumber,
      invoiceDate: formatUsDate(detail.invoice.billingDate),
      billingDuration: buildBillingDuration(
        detail.invoice.month,
        detail.invoice.year,
      ),
      dueDate: formatUsDate(detail.invoice.dueDate),
    },
    sections,
    grandTotal: {
      formula: `Grand Total = ${formulaParts.join(" + ").replace("+ -", "-")}`,
      amount: formatUsdCompact(detail.invoice.grandTotalUsdCents),
    },
    note: detail.invoice.noteText,
  };
}

export async function buildInvoicePdf(detail: InvoiceDetail) {
  const model = buildInvoicePdfModel(detail);
  const bundledFontPath = path.join(
    process.cwd(),
    "assets",
    "fonts",
    "Inter-Variable.ttf",
  );
  const windowsFallbackFontPath = "C:\\Windows\\Fonts\\arial.ttf";
  const logoPath = path.join(process.cwd(), "assets", "eassyonboard-logo.png");

  const doc = new PDFDocument({
    margin: PAGE.margin,
    size: "A4",
    font: existsSync(bundledFontPath)
      ? bundledFontPath
      : existsSync(windowsFallbackFontPath)
        ? windowsFallbackFontPath
        : undefined,
  });
  const chunks: Buffer[] = [];
  const fontName = "invoice-regular";

  doc.on("data", (chunk) => chunks.push(chunk));
  if (existsSync(bundledFontPath)) {
    doc.registerFont(fontName, bundledFontPath);
  } else if (existsSync(windowsFallbackFontPath)) {
    doc.registerFont(fontName, windowsFallbackFontPath);
  }

  const drawHeader = (showTitle: boolean) => {
    doc.fillColor(COLORS.ink);

    if (existsSync(logoPath)) {
      doc.image(logoPath, PAGE.margin + 6, PAGE.margin - 2, { width: 92 });
    }

    doc
      .fontSize(20)
      .font(fontName)
      .text(BRAND.name, 0, PAGE.margin - 6, { align: "center" });

    doc
      .font(fontName)
      .fontSize(9.5)
      .text(BRAND.addressLines[0], 0, PAGE.margin + 22, { align: "right" })
      .text(BRAND.addressLines[1], { align: "right" })
      .text(BRAND.addressLines[2], { align: "right" });

    if (showTitle) {
      const titleY = PAGE.margin + 62;
      doc.font(fontName).fontSize(30).text("INVOICE", PAGE.margin, titleY);
      doc
        .moveTo(PAGE.margin, titleY + 32)
        .lineTo(doc.page.width - PAGE.margin, titleY + 34)
        .lineWidth(1)
        .strokeColor(COLORS.line)
        .stroke();
      doc.y = titleY + 40;
    } else {
      doc.y = PAGE.margin + 70;
    }
  };

  const drawFooter = () => {
    const footerY = doc.page.height - PAGE.margin - 12;

    doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.blue);
    doc.font(fontName);
    doc.text(BRAND.website, PAGE.margin, footerY, {
      width: 165,
      underline: true,
    });
    doc.text(BRAND.email, PAGE.margin + 180, footerY, {
      width: 172,
      underline: true,
    });
    doc.fillColor(COLORS.ink).text(BRAND.phone, PAGE.margin + 390, footerY, {
      width: 120,
      align: "left",
    });
  };

  const ensureSpace = (height: number, withTitle = false) => {
    if (doc.y + height <= doc.page.height - PAGE.margin - PAGE.footerGap) {
      return;
    }

    drawFooter();
    doc.addPage();
    drawHeader(withTitle);
  };

  const drawLabelValueLine = (label: string, value: string) => {
    doc
      .font(fontName)
      .fontSize(10.5)
      .fillColor(COLORS.ink)
      .text(label, PAGE.margin, doc.y, {
        continued: true,
      })
      .font(fontName)
      .text(` ${value}`);
  };

  const drawTable = (section: PdfSection) => {
    const columnX = [
      PAGE.margin,
      PAGE.margin + 158,
      PAGE.margin + 254,
      PAGE.margin + 348,
      doc.page.width - PAGE.margin,
    ];
    const defaultRowHeight = 24;
    const sectionTitleGap = 6;

    ensureSpace(60, false);
    doc.moveDown(0.05);
    doc.font(fontName).fontSize(13.5).fillColor(COLORS.blue).text(
      section.title,
      PAGE.margin,
      doc.y + 1,
    );
    doc.moveDown(0.05);

    const startY = doc.y + sectionTitleGap;

    const drawCellText = (
      text: string,
      x: number,
      y: number,
      width: number,
      options?: { align?: "left" | "center" | "right"; bold?: boolean },
    ) => {
      doc
        .font(fontName)
        .fontSize(9.5)
        .fillColor(COLORS.ink)
        .text(text, x + 4, y + (options?.bold ? 6 : 5), {
          width: width - 7,
          align: options?.align ?? "left",
        });
    };

    const rows = [
      {
        contractorName: "Contractor Name",
        hourlyRate: "Hourly Rate\n(USD)",
        hrsPerWeek: "Hrs / Week",
        total: "Total (USD) **",
      },
      ...section.rows,
      {
        contractorName: section.totalLabel,
        hourlyRate: "",
        hrsPerWeek: "",
        total: section.totalAmount,
      },
    ];

    let y = startY;

    rows.forEach((row, index) => {
      const isHeader = index === 0;
      const isTotal = index === rows.length - 1;
      const rowHeight = isHeader ? 36 : defaultRowHeight;

      ensureSpace(rowHeight + 4, false);
      if (y + rowHeight > doc.page.height - PAGE.margin - PAGE.footerGap) {
        drawFooter();
        doc.addPage();
        drawHeader(false);
        y = doc.y + 10;
      }

      doc
        .lineWidth(0.8)
        .strokeColor(COLORS.line)
        .rect(columnX[0], y, columnX[4] - columnX[0], rowHeight)
        .stroke();

      for (let columnIndex = 1; columnIndex < columnX.length - 1; columnIndex += 1) {
        doc
          .moveTo(columnX[columnIndex], y)
          .lineTo(columnX[columnIndex], y + rowHeight)
          .stroke();
      }

      drawCellText(
        row.contractorName,
        columnX[0],
        y,
        columnX[1] - columnX[0],
        { bold: isHeader || isTotal },
      );
      drawCellText(row.hourlyRate, columnX[1], y, columnX[2] - columnX[1], {
        bold: isHeader,
      });
      drawCellText(row.hrsPerWeek, columnX[2], y, columnX[3] - columnX[2], {
        bold: isHeader,
      });
      drawCellText(row.total, columnX[3], y, columnX[4] - columnX[3], {
        bold: isHeader || isTotal,
      });

      y += rowHeight;
    });

    doc.y = y + 8;
  };

  drawHeader(true);

  doc.moveDown(0.35);
  doc.font(fontName).fontSize(15.5).fillColor(COLORS.blue).text("Bill To:");
  doc.moveDown(0.2);
  drawLabelValueLine("Client Name:", model.billTo.name);
  drawLabelValueLine("Client Address:", model.billTo.address);

  doc.moveDown(0.75);
  doc.font(fontName).fontSize(15.5).fillColor(COLORS.blue).text(
    "Invoice Details",
  );
  doc.moveDown(0.2);
  drawLabelValueLine("Invoice No.:", model.invoiceDetails.invoiceNumber);
  drawLabelValueLine("Invoice Date:", model.invoiceDetails.invoiceDate);
  drawLabelValueLine("Billing Duration:", model.invoiceDetails.billingDuration);
  drawLabelValueLine("Due Date:", model.invoiceDetails.dueDate);

  doc.moveDown(0.55);
  doc
    .font(fontName)
    .fontSize(10.5)
    .fillColor(COLORS.ink)
    .text("Please find itemized invoice below.");

  doc.moveDown(0.65);
  doc.font(fontName).fontSize(15.5).fillColor(COLORS.blue).text(
    "Services Provided",
  );

  for (const section of model.sections) {
    drawTable(section);
  }

  ensureSpace(120, false);
  doc.moveDown(0.15);
  doc
    .font(fontName)
    .fontSize(12.5)
    .fillColor(COLORS.ink)
    .text(model.grandTotal.formula, PAGE.margin, doc.y);
  doc
    .font(fontName)
    .fontSize(17)
    .text(`=  ${model.grandTotal.amount}`, PAGE.margin + 106, doc.y + 4);

  doc.moveDown(0.8);
  doc
    .font(fontName)
    .fontSize(10.75)
    .text(`Note : ${model.note}`, PAGE.margin, doc.y, {
      width: doc.page.width - PAGE.margin * 2,
      align: "left",
    });

  doc.moveDown(0.75);
  BRAND.signoffLines.forEach((line) => {
    doc.font(fontName).fontSize(10.75).text(line);
  });

  drawFooter();
  doc.end();

  await new Promise<void>((resolve) => doc.on("end", resolve));
  return Buffer.concat(chunks);
}

function buildAdjustmentRows(
  adjustments: InvoiceAdjustment[],
  isDeduction: boolean,
) {
  return adjustments.map((adjustment) => ({
    contractorName:
      adjustment.type === "reimbursement"
        ? adjustment.label
        : adjustment.employeeName ?? adjustment.label,
    hourlyRate:
      adjustment.rateUsdCents !== undefined
        ? formatUsdCompact(adjustment.rateUsdCents)
        : "",
    hrsPerWeek:
      adjustment.hrsPerWeek !== undefined ? formatHours(adjustment.hrsPerWeek) : "",
    total: formatUsdCompact(
      isDeduction ? Math.abs(adjustment.amountUsdCents) : adjustment.amountUsdCents,
    ),
  }));
}

function sumRows(rows: PdfSectionRow[]) {
  return rows.reduce((sum, row) => sum + centsFromCompactUsd(row.total), 0);
}

function centsFromCompactUsd(value: string) {
  const normalized = Number.parseFloat(value.replace(/[$,]/g, ""));
  return Number.isNaN(normalized) ? 0 : Math.round(normalized * 100);
}

function sectionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

function formatUsdCompact(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatHours(hrsPerWeek: number) {
  return Number.isInteger(hrsPerWeek) ? String(hrsPerWeek) : String(hrsPerWeek);
}

function formatUsDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function buildBillingDuration(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return `${formatUsDate(start)} – ${formatUsDate(end)}`;
}
