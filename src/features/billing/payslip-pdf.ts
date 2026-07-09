import { existsSync } from "node:fs";
import path from "node:path";

import PDFDocument from "pdfkit";

import {
  calculatePayslipTotals,
  formatPayslipAmountInWords,
  type PayslipAmountRow,
  type PayslipTaxPaidMonth,
  type PayslipTdsEarningRow,
} from "./payslip";
import type { SavedPayslip } from "./payslip-store";

const PAGE = {
  marginX: 28,
  marginTop: 32,
  width: 595.28,
};

const COLORS = {
  ink: "#111111",
  line: "#606060",
  grey: "#c9c9c9",
  muted: "#777777",
};

export async function buildPayslipPdf(input: {
  payslip: SavedPayslip;
  companyName: string;
  companyAddress: string;
}) {
  const bundledFontPath = path.join(process.cwd(), "assets", "fonts", "Inter-Variable.ttf");
  const windowsFallbackFontPath = "C:\\Windows\\Fonts\\arial.ttf";
  const doc = new PDFDocument({
    margin: PAGE.marginX,
    size: "A4",
    font: existsSync(bundledFontPath)
      ? bundledFontPath
      : existsSync(windowsFallbackFontPath)
        ? windowsFallbackFontPath
        : undefined,
  });
  const chunks: Buffer[] = [];
  const fontName = "payslip-regular";

  doc.on("data", (chunk) => chunks.push(chunk));
  if (existsSync(bundledFontPath)) {
    doc.registerFont(fontName, bundledFontPath);
  } else if (existsSync(windowsFallbackFontPath)) {
    doc.registerFont(fontName, windowsFallbackFontPath);
  }
  doc.font(fontName);

  drawHeader(doc, input);
  drawEmployeeIdentity(doc, input.payslip);
  drawEarningsAndDeductions(doc, input.payslip);
  drawTdsSection(doc, input.payslip);
  drawFooter(doc);

  doc.end();
  return await new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  input: { payslip: SavedPayslip; companyName: string; companyAddress: string },
) {
  doc.fontSize(15).fillColor(COLORS.ink).text(input.companyName, PAGE.marginX, 32, {
    width: PAGE.width - PAGE.marginX * 2,
    align: "center",
  });
  doc.fontSize(8.5).text(input.companyAddress, PAGE.marginX, 53, {
    width: PAGE.width - PAGE.marginX * 2,
    align: "center",
  });
  doc.fontSize(13).text(`Payslip for the month of ${formatPayslipMonth(input.payslip.month)}`, PAGE.marginX, 78, {
    width: PAGE.width - PAGE.marginX * 2,
    align: "center",
  });
}

function drawEmployeeIdentity(doc: PDFKit.PDFDocument, payslip: SavedPayslip) {
  const y = 112;
  const height = 50;
  const leftX = PAGE.marginX;
  const midX = PAGE.width / 2;
  const width = PAGE.width - PAGE.marginX * 2;

  drawRect(doc, leftX, y, width, height);
  verticalLine(doc, midX, y, height);
  doc.fontSize(9.5).fillColor(COLORS.ink);
  labelValue(doc, "Name:", payslip.employeeName, leftX + 4, y + 6, 140, 235);
  labelValue(doc, "Joining Date:", formatDateSlash(payslip.joiningDate), leftX + 4, y + 18, 140, 235);
  labelValue(doc, "Designation:", payslip.designation, leftX + 4, y + 30, 140, 235);
  labelValue(doc, "Effective Work Days:", String(payslip.effectiveWorkDays), leftX + 4, y + 42, 140, 235);
  labelValue(doc, "PAN Number:", payslip.panNumber, midX + 4, y + 6, 130, 205);
  labelValue(doc, "PF UAN:", payslip.pfUan, midX + 4, y + 18, 130, 205);
  doc.y = y + height + 18;
}

function drawEarningsAndDeductions(doc: PDFKit.PDFDocument, payslip: SavedPayslip) {
  const startY = doc.y;
  const leftX = PAGE.marginX;
  const width = PAGE.width - PAGE.marginX * 2;
  const midX = PAGE.width / 2;
  const rowHeight = 14;
  const maxRows = Math.max(payslip.earnings.length, payslip.deductions.length, 3);
  const bodyHeight = maxRows * rowHeight + 8;
  const totals = calculatePayslipTotals(payslip);

  drawRect(doc, leftX, startY, width, rowHeight + bodyHeight + rowHeight + 34);
  horizontalLine(doc, leftX, startY + rowHeight, width);
  verticalLine(doc, midX, startY, rowHeight + bodyHeight + rowHeight);
  doc.fontSize(9.2).fillColor(COLORS.ink);
  text(doc, "Earnings", leftX + 4, startY + 3, 190, "left", true);
  text(doc, "Amount", midX - 72, startY + 3, 68, "right", true);
  text(doc, "Deductions", midX + 4, startY + 3, 190, "left", true);
  text(doc, "Amount", PAGE.width - PAGE.marginX - 72, startY + 3, 68, "right", true);

  for (let index = 0; index < maxRows; index += 1) {
    const y = startY + rowHeight + 6 + index * rowHeight;
    const earning = payslip.earnings[index];
    const deduction = payslip.deductions[index];
    if (earning) {
      text(doc, earning.label, leftX + 4, y, 190);
      text(doc, formatInrPlain(earning.amountInrCents), midX - 72, y, 68, "right");
    }
    if (deduction) {
      text(doc, deduction.label, midX + 4, y, 190);
      text(doc, formatInrPlain(deduction.amountInrCents), PAGE.width - PAGE.marginX - 72, y, 68, "right");
    }
  }

  const totalY = startY + rowHeight + bodyHeight;
  horizontalLine(doc, leftX, totalY, width);
  text(doc, "Total Earnings", leftX + 4, totalY + 4, 170, "left", true);
  text(doc, formatInrPlain(totals.totalEarningsInrCents), midX - 72, totalY + 4, 68, "right", true);
  text(doc, "Total Deduction", midX + 4, totalY + 4, 170, "left", true);
  text(doc, formatInrPlain(totals.totalDeductionsInrCents), PAGE.width - PAGE.marginX - 72, totalY + 4, 68, "right", true);
  horizontalLine(doc, leftX, totalY + rowHeight, width);
  text(doc, "Net Pay for the month :", leftX + 4, totalY + rowHeight + 8, 96);
  text(doc, formatInrPlain(totals.netPayInrCents), leftX + 102, totalY + rowHeight + 8, 90, "left", true);
  text(doc, `(${formatPayslipAmountInWords(totals.netPayInrCents)})`, leftX + 4, totalY + rowHeight + 23, width - 8);
  doc.y = totalY + rowHeight + 46;
}

function drawTdsSection(doc: PDFKit.PDFDocument, payslip: SavedPayslip) {
  const startY = doc.y;
  const leftX = PAGE.marginX;
  const width = PAGE.width - PAGE.marginX * 2;
  const midX = leftX + 320;
  const headerHeight = 15;
  const rowHeight = 14;
  const leftRows = Math.max(payslip.tdsEarnings.length, 4);
  const rightRows = Math.max(payslip.tdsIncomeTaxDeductions.length, 10);
  const bodyHeight = Math.max(leftRows * rowHeight, rightRows * rowHeight + 64);

  doc.rect(leftX, startY, width, headerHeight).fillAndStroke(COLORS.grey, COLORS.line);
  doc.fillColor(COLORS.ink).fontSize(9.2).text("TDS Details", leftX, startY + 3, {
    width,
    align: "center",
  });

  const tableY = startY + headerHeight;
  drawRect(doc, leftX, tableY, width, bodyHeight);
  verticalLine(doc, midX, tableY, bodyHeight);
  horizontalLine(doc, leftX, tableY + rowHeight, width);
  text(doc, "Description", leftX + 4, tableY + 3, 110, "left", true);
  text(doc, "Gross", leftX + 132, tableY + 3, 54, "right", true);
  text(doc, "Exempt", leftX + 190, tableY + 3, 54, "right", true);
  text(doc, "Taxable", leftX + 248, tableY + 3, 54, "right", true);
  text(doc, "Income Tax Deduction", midX + 4, tableY + 3, width - (midX - leftX) - 8, "center", true);

  payslip.tdsEarnings.forEach((row, index) => drawTdsEarningRow(doc, row, leftX, tableY + rowHeight + index * rowHeight));
  payslip.tdsIncomeTaxDeductions.forEach((row, index) => drawTaxDeductionRow(doc, row, midX, tableY + rowHeight + index * rowHeight));
  drawTaxPaidGrid(doc, payslip.taxPaidMonths, midX, tableY + rowHeight + rightRows * rowHeight + 4, PAGE.width - PAGE.marginX - midX);
  doc.y = tableY + bodyHeight + 8;
}

function drawTdsEarningRow(doc: PDFKit.PDFDocument, row: PayslipTdsEarningRow, x: number, y: number) {
  text(doc, row.label, x + 4, y + 3, 120);
  text(doc, formatInrPlain(row.grossInrCents), x + 132, y + 3, 54, "right");
  text(doc, formatInrPlain(row.exemptInrCents), x + 190, y + 3, 54, "right");
  text(doc, formatInrPlain(row.taxableInrCents), x + 248, y + 3, 54, "right");
}

function drawTaxDeductionRow(doc: PDFKit.PDFDocument, row: PayslipAmountRow, x: number, y: number) {
  horizontalLine(doc, x, y, PAGE.width - PAGE.marginX - x);
  doc.fontSize(7.4).fillColor(COLORS.ink).text(row.label, x + 4, y + 3, {
    width: PAGE.width - PAGE.marginX - 76 - x,
    align: "left",
    lineBreak: false,
  });
  text(doc, formatInrPlain(row.amountInrCents), PAGE.width - PAGE.marginX - 68, y + 3, 64, "right");
}

function drawTaxPaidGrid(
  doc: PDFKit.PDFDocument,
  months: PayslipTaxPaidMonth[],
  x: number,
  y: number,
  width: number,
) {
  const cellW = width / 6;
  const rowH = 14;
  horizontalLine(doc, x, y, width);
  text(doc, "Tax Paid Details", x, y + 4, width, "center", true);
  for (let row = 0; row < 2; row += 1) {
    const monthY = y + 18 + row * rowH * 2;
    const amountY = monthY + rowH;
    for (let col = 0; col < 6; col += 1) {
      const month = months[row * 6 + col];
      const cellX = x + col * cellW;
      drawRect(doc, cellX, monthY, cellW, rowH);
      drawRect(doc, cellX, amountY, cellW, rowH);
      if (month) {
        text(doc, month.monthCode, cellX, monthY + 3, cellW, "center", true);
        text(doc, formatInrPlain(month.amountInrCents), cellX, amountY + 3, cellW, "center");
      }
    }
  }
}

function drawFooter(doc: PDFKit.PDFDocument) {
  const y = 760;
  horizontalLine(doc, PAGE.marginX, y, PAGE.width - PAGE.marginX * 2);
  doc.fillColor(COLORS.muted).fontSize(8).text(
    "This is a computer generated payslip and does not require a signature",
    PAGE.marginX,
    y + 6,
    { width: PAGE.width - PAGE.marginX * 2, align: "center" },
  );
}

function labelValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  labelWidth: number,
  valueWidth: number,
) {
  text(doc, label, x, y, labelWidth);
  text(doc, value, x + labelWidth, y, valueWidth);
}

function text(
  doc: PDFKit.PDFDocument,
  value: string,
  x: number,
  y: number,
  width: number,
  align: "left" | "center" | "right" = "left",
  bold = false,
) {
  doc.fontSize(bold ? 8.9 : 8.8).fillColor(COLORS.ink).text(value, x, y, { width, align, lineBreak: false });
}

function drawRect(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number) {
  doc.rect(x, y, width, height).lineWidth(0.5).strokeColor(COLORS.line).stroke();
}

function horizontalLine(doc: PDFKit.PDFDocument, x: number, y: number, width: number) {
  doc.moveTo(x, y).lineTo(x + width, y).lineWidth(0.5).strokeColor(COLORS.line).stroke();
}

function verticalLine(doc: PDFKit.PDFDocument, x: number, y: number, height: number) {
  doc.moveTo(x, y).lineTo(x, y + height).lineWidth(0.5).strokeColor(COLORS.line).stroke();
}

function formatInrPlain(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatPayslipMonth(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number.parseInt(yearText ?? "", 10);
  const month = Number.parseInt(monthText ?? "", 10);
  return `${new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(year, month - 1, 1))} - ${year}`;
}

function formatDateSlash(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}
