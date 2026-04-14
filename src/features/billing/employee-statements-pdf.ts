import { existsSync } from "node:fs";
import path from "node:path";

import PDFDocument from "pdfkit";

import type { EmployeeStatementPdfInput } from "./employee-statements";

type PdfMonthRow = {
  monthLabel: string;
  rows: Array<{
    invoiceNumber: string;
    dollarInward: string;
    onboardingAdvance: string;
    reimbursements: string;
    reimbursementLabels: string;
    offboardingDeduction: string;
  }>;
  effectiveDollarInward: string;
  monthlyDollarPaid: string;
};

type PdfModel = {
  header: {
    companyName: string;
    employeeName: string;
    dateRangeLabel: string;
    generatedDate: string;
  };
  months: PdfMonthRow[];
  totals: {
    dollarInward: string;
    onboardingAdvance: string;
    reimbursements: string;
    offboardingDeduction: string;
    effectiveDollarInward: string;
    monthlyDollarPaid: string;
  };
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
};

const COLORS = {
  ink: "#111111",
  blue: "#5b9be6",
  line: "#252525",
  muted: "#4b5563",
  panel: "#f6f8fb",
};

const PAGE = {
  margin: 40,
  footerGap: 36,
};

function formatUsdCompact(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function buildEmployeeStatementPdfModel(
  input: EmployeeStatementPdfInput,
): PdfModel {
  return {
    header: {
      companyName: input.companyName,
      employeeName: input.employeeName,
      dateRangeLabel: input.dateRangeLabel,
      generatedDate: input.generatedDate,
    },
    months: input.months.map((month) => ({
      monthLabel: month.monthLabel,
      rows: month.rows.map((row) => ({
        invoiceNumber: row.invoiceNumber,
        dollarInward: formatUsdCompact(row.dollarInwardUsdCents),
        onboardingAdvance: formatUsdCompact(row.onboardingAdvanceUsdCents),
        reimbursements: formatUsdCompact(row.reimbursementUsdCents),
        reimbursementLabels: row.reimbursementLabelsText,
        offboardingDeduction: formatUsdCompact(row.offboardingDeductionUsdCents),
      })),
      effectiveDollarInward: formatUsdCompact(month.effectiveDollarInwardUsdCents),
      monthlyDollarPaid: formatUsdCompact(month.monthlyDollarPaidUsdCents),
    })),
    totals: {
      dollarInward: formatUsdCompact(input.totals.dollarInwardUsdCents),
      onboardingAdvance: formatUsdCompact(input.totals.onboardingAdvanceUsdCents),
      reimbursements: formatUsdCompact(input.totals.reimbursementUsdCents),
      offboardingDeduction: formatUsdCompact(input.totals.offboardingDeductionUsdCents),
      effectiveDollarInward: formatUsdCompact(
        input.totals.effectiveDollarInwardUsdCents,
      ),
      monthlyDollarPaid: formatUsdCompact(input.totals.monthlyDollarPaidUsdCents),
    },
  };
}

export async function buildEmployeeStatementPdf(input: EmployeeStatementPdfInput) {
  const model = buildEmployeeStatementPdfModel(input);
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
  const fontName = "statement-regular";

  doc.on("data", (chunk) => chunks.push(chunk));
  if (existsSync(bundledFontPath)) {
    doc.registerFont(fontName, bundledFontPath);
  } else if (existsSync(windowsFallbackFontPath)) {
    doc.registerFont(fontName, windowsFallbackFontPath);
  }

  const ensureSpace = (height: number) => {
    if (doc.y + height <= doc.page.height - PAGE.margin - PAGE.footerGap) {
      return;
    }

    drawFooter();
    doc.addPage();
    drawHeader(false);
  };

  const drawHeader = (showTitle: boolean) => {
    doc.fillColor(COLORS.ink);

    if (existsSync(logoPath)) {
      doc.image(logoPath, PAGE.margin + 6, PAGE.margin - 2, { width: 92 });
    }

    doc
      .font(fontName)
      .fontSize(20)
      .text(BRAND.name, 0, PAGE.margin - 6, { align: "center" });

    doc
      .font(fontName)
      .fontSize(9.5)
      .text(BRAND.addressLines[0], 0, PAGE.margin + 22, { align: "right" })
      .text(BRAND.addressLines[1], { align: "right" })
      .text(BRAND.addressLines[2], { align: "right" });

    if (showTitle) {
      const titleY = PAGE.margin + 62;
      doc.font(fontName).fontSize(29).text("EMPLOYEE STATEMENT", PAGE.margin, titleY);
      doc
        .moveTo(PAGE.margin, titleY + 34)
        .lineTo(doc.page.width - PAGE.margin, titleY + 34)
        .lineWidth(1)
        .strokeColor(COLORS.line)
        .stroke();
      doc.y = titleY + 44;
    } else {
      doc.y = PAGE.margin + 72;
    }
  };

  const drawFooter = () => {
    const footerY = doc.page.height - PAGE.margin - 12;
    doc.font(fontName).fontSize(9.5).fillColor(COLORS.blue);
    doc.text(BRAND.website, PAGE.margin, footerY, { width: 160, underline: true });
    doc.text(BRAND.email, PAGE.margin + 180, footerY, {
      width: 190,
      underline: true,
    });
    doc.fillColor(COLORS.ink).text(BRAND.phone, PAGE.margin + 390, footerY);
  };

  const drawInfoLine = (label: string, value: string, x = PAGE.margin) => {
    doc
      .font(fontName)
      .fontSize(10.5)
      .fillColor(COLORS.ink)
      .text(label, x, doc.y, { continued: true })
      .text(` ${value}`);
  };

  const drawMonthTable = (month: PdfMonthRow) => {
    ensureSpace(120);
    doc.moveDown(0.3);
    doc.font(fontName).fontSize(13.5).fillColor(COLORS.blue).text(month.monthLabel);
    doc.moveDown(0.2);

    const columnX = [
      PAGE.margin,
      PAGE.margin + 82,
      PAGE.margin + 168,
      PAGE.margin + 254,
      PAGE.margin + 340,
      PAGE.margin + 425,
      doc.page.width - PAGE.margin,
    ];
    const drawCell = (
      text: string,
      x: number,
      y: number,
      width: number,
      align: "left" | "right" = "left",
    ) => {
      doc.font(fontName).fontSize(8.75).fillColor(COLORS.ink).text(text, x + 4, y + 6, {
        width: width - 8,
        align,
      });
    };

    const headerY = doc.y + 4;
    const rowHeight = 26;
    const summaryHeight = 24;
    const headers = [
      "Month",
      "Invoice no.",
      "Dollar inward",
      "Onboarding",
      "Reimbursements",
      "Reimb. labels",
      "Offboarding",
    ];

    doc
      .rect(columnX[0], headerY, columnX[columnX.length - 1] - columnX[0], rowHeight)
      .fillAndStroke(COLORS.panel, COLORS.line);
    for (let i = 1; i < columnX.length - 1; i += 1) {
      doc.moveTo(columnX[i], headerY).lineTo(columnX[i], headerY + rowHeight).stroke();
    }
    headers.forEach((header, index) => {
      drawCell(
        header,
        columnX[index],
        headerY,
        columnX[index + 1] - columnX[index],
        index >= 2 && index !== 5 ? "right" : "left",
      );
    });

    let y = headerY + rowHeight;
    for (const row of month.rows) {
      ensureSpace(rowHeight + summaryHeight * 2 + 16);
      if (y + rowHeight > doc.page.height - PAGE.margin - PAGE.footerGap) {
        drawFooter();
        doc.addPage();
        drawHeader(false);
        y = doc.y + 10;
      }

      doc
        .rect(columnX[0], y, columnX[columnX.length - 1] - columnX[0], rowHeight)
        .stroke(COLORS.line);
      for (let i = 1; i < columnX.length - 1; i += 1) {
        doc.moveTo(columnX[i], y).lineTo(columnX[i], y + rowHeight).stroke();
      }

      drawCell(month.monthLabel, columnX[0], y, columnX[1] - columnX[0]);
      drawCell(row.invoiceNumber, columnX[1], y, columnX[2] - columnX[1]);
      drawCell(row.dollarInward, columnX[2], y, columnX[3] - columnX[2], "right");
      drawCell(
        row.onboardingAdvance,
        columnX[3],
        y,
        columnX[4] - columnX[3],
        "right",
      );
      drawCell(
        row.reimbursements,
        columnX[4],
        y,
        columnX[5] - columnX[4],
        "right",
      );
      drawCell(
        row.reimbursementLabels || "-",
        columnX[5],
        y,
        columnX[6] - columnX[5] - 68,
      );
      drawCell(row.offboardingDeduction, columnX[6] - 68, y, 68, "right");
      y += rowHeight;
    }

    const drawSummaryRow = (label: string, value: string) => {
      doc
        .rect(columnX[0], y, columnX[columnX.length - 1] - columnX[0], summaryHeight)
        .fillAndStroke("#eef3f8", COLORS.line);
      doc
        .font(fontName)
        .fontSize(9.25)
        .fillColor(COLORS.ink)
        .text(label, columnX[0] + 6, y + 6, {
          width: columnX[columnX.length - 2] - columnX[0] - 8,
        });
      doc.text(value, columnX[columnX.length - 2], y + 6, {
        width: columnX[columnX.length - 1] - columnX[columnX.length - 2] - 6,
        align: "right",
      });
      y += summaryHeight;
    };

    drawSummaryRow("Effective dollar inward", month.effectiveDollarInward);
    drawSummaryRow("Monthly $ paid", month.monthlyDollarPaid);

    doc.y = y + 10;
  };

  drawHeader(true);
  doc.moveDown(0.3);
  doc.font(fontName).fontSize(15.5).fillColor(COLORS.blue).text("Statement Details");
  doc.moveDown(0.2);
  drawInfoLine("Company:", model.header.companyName);
  drawInfoLine("Employee:", model.header.employeeName);
  drawInfoLine("Selected range:", model.header.dateRangeLabel);
  drawInfoLine("Generated date:", model.header.generatedDate);

  for (const month of model.months) {
    drawMonthTable(month);
  }

  ensureSpace(120);
  doc.moveDown(0.3);
  doc.font(fontName).fontSize(14).fillColor(COLORS.blue).text("Totals");
  doc.moveDown(0.2);
  [
    ["Dollar inward", model.totals.dollarInward],
    ["Onboarding advance", model.totals.onboardingAdvance],
    ["Employee reimbursements (USD)", model.totals.reimbursements],
    ["Offboarding deduction", model.totals.offboardingDeduction],
    ["Effective dollar inward", model.totals.effectiveDollarInward],
    ["Monthly $ paid", model.totals.monthlyDollarPaid],
  ].forEach(([label, value]) => {
    doc
      .font(fontName)
      .fontSize(10.5)
      .fillColor(COLORS.ink)
      .text(label, PAGE.margin, doc.y, { continued: true })
      .text(` ${value}`);
  });

  drawFooter();
  doc.end();

  await new Promise<void>((resolve) => doc.on("end", resolve));
  return Buffer.concat(chunks);
}
