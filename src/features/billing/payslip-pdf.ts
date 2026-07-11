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
  width: 595.28,
  marginX: 19,
};

const COLORS = {
  ink: "#000000",
  line: "#555555",
  grey: "#c9c9c9",
  muted: "#666666",
};

const FONT = {
  regular: "Times-Roman",
  bold: "Times-Bold",
};

export async function buildPayslipPdf(input: {
  payslip: SavedPayslip;
  companyName: string;
  companyAddress: string;
}) {
  const doc = new PDFDocument({
    margin: PAGE.marginX,
    size: "A4",
    font: FONT.regular,
  });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk));
  doc.font(FONT.regular);

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
  const width = contentWidth();
  drawText(doc, input.companyName, PAGE.marginX, 27, width, {
    align: "center",
    bold: true,
    size: 12.8,
  });
  drawText(doc, input.companyAddress, PAGE.marginX, 40, width, {
    align: "center",
    size: 7.8,
  });
  drawText(doc, `Payslip for the month of ${formatPayslipMonth(input.payslip.month)}`, PAGE.marginX, 58, width, {
    align: "center",
    bold: true,
    size: 12.2,
  });
}

function drawEmployeeIdentity(doc: PDFKit.PDFDocument, payslip: SavedPayslip) {
  const x = PAGE.marginX;
  const y = 79;
  const width = contentWidth();
  const height = 49;
  const midX = x + width / 2;

  drawRect(doc, x, y, width, height);
  verticalLine(doc, midX, y, height);

  labelValue(doc, "Name:", payslip.employeeName, x + 3, y + 5, 140, 135);
  labelValue(doc, "Joining Date:", formatDateSlash(payslip.joiningDate), x + 3, y + 17, 140, 135);
  labelValue(doc, "Designation:", payslip.designation, x + 3, y + 29, 140, 135);
  labelValue(doc, "Effective Work Days:", String(payslip.effectiveWorkDays), x + 3, y + 41, 140, 135);
  labelValue(doc, "PAN Number:", payslip.panNumber, midX + 3, y + 5, 140, 135);
  labelValue(doc, "PF UAN:", payslip.pfUan, midX + 3, y + 17, 140, 135);

  doc.y = y + height + 12;
}

function drawEarningsAndDeductions(doc: PDFKit.PDFDocument, payslip: SavedPayslip) {
  const x = PAGE.marginX;
  const y = doc.y;
  const width = contentWidth();
  const halfWidth = width / 2;
  const midX = x + halfWidth;
  const headerH = 16;
  const rowH = 14;
  const visibleRows = Math.max(payslip.earnings.length, payslip.deductions.length, 3);
  const bodyH = visibleRows * rowH + 12;
  const totalH = 18;
  const netH = 34;
  const topTableH = headerH + bodyH + totalH;
  const totals = calculatePayslipTotals(payslip);

  drawRect(doc, x, y, width, topTableH + netH);
  verticalLine(doc, midX, y, topTableH);
  horizontalLine(doc, x, y + headerH, width);
  horizontalLine(doc, x, y + headerH + bodyH, width);
  horizontalLine(doc, x, y + topTableH, width);

  drawText(doc, "Earnings", x + 3, y + 4, 150, { bold: true });
  drawText(doc, "Amount", midX - 70, y + 4, 66, { align: "right", bold: true });
  drawText(doc, "Deductions", midX + 3, y + 4, 150, { bold: true });
  drawText(doc, "Amount", x + width - 70, y + 4, 66, { align: "right", bold: true });

  for (let index = 0; index < visibleRows; index += 1) {
    const rowY = y + headerH + 6 + index * rowH;
    const earning = payslip.earnings[index];
    const deduction = payslip.deductions[index];
    if (earning) {
      drawText(doc, earning.label, x + 3, rowY, 160);
      drawText(doc, formatInrPlain(earning.amountInrCents), midX - 90, rowY, 86, { align: "right" });
    }
    if (deduction) {
      drawText(doc, deduction.label, midX + 3, rowY, 160);
      drawText(doc, formatInrPlain(deduction.amountInrCents), x + width - 90, rowY, 86, { align: "right" });
    }
  }

  const totalY = y + headerH + bodyH + 4;
  drawText(doc, "Total Earnings", x + 3, totalY, 160, { bold: true });
  drawText(doc, formatInrPlain(totals.totalEarningsInrCents), midX - 90, totalY, 86, {
    align: "right",
    bold: true,
  });
  drawText(doc, "Total Deduction", midX + 3, totalY, 160, { bold: true });
  drawText(doc, formatInrPlain(totals.totalDeductionsInrCents), x + width - 90, totalY, 86, {
    align: "right",
    bold: true,
  });

  const netY = y + topTableH + 8;
  drawText(doc, "Net Pay for the month :", x + 3, netY, 105);
  drawText(doc, formatInrPlain(totals.netPayInrCents), x + 107, netY, 105, { bold: true });
  drawText(doc, `(${formatPayslipAmountInWords(totals.netPayInrCents)})`, x + 3, netY + 16, width - 6);

  doc.y = y + topTableH + netH;
}

function drawTdsSection(doc: PDFKit.PDFDocument, payslip: SavedPayslip) {
  const x = PAGE.marginX;
  const y = doc.y;
  const width = contentWidth();
  const headerH = 15;
  const rowH = 14;
  const leftW = 335;
  const rightX = x + leftW + 5;
  const rightW = x + width - rightX;
  const leftHeaderH = 14;
  const leftRows = Math.max(payslip.tdsEarnings.length, 3);
  const leftBlankH = 16;
  const leftTableH = leftHeaderH + leftRows * rowH + leftBlankH;
  const rightRows = Math.max(payslip.tdsIncomeTaxDeductions.length, 10);
  const taxDeductionH = leftHeaderH + rightRows * rowH;
  const taxPaidTitleH = 15;
  const taxPaidGridH = rowH * 4;
  const rightTableH = taxDeductionH + taxPaidTitleH + taxPaidGridH;

  doc.rect(x, y, width, headerH).fillAndStroke(COLORS.grey, COLORS.line);
  drawText(doc, "TDS Details", x, y + 3, width, { align: "center", bold: true });

  const tableY = y + headerH;
  drawTdsEarningsGrid(doc, payslip.tdsEarnings, x, tableY, leftW, leftTableH, leftRows);
  drawTaxDeductionGrid(doc, payslip.tdsIncomeTaxDeductions, rightX, tableY, rightW, rightRows);
  drawTaxPaidGrid(
    doc,
    payslip.taxPaidMonths,
    rightX,
    tableY + taxDeductionH,
    rightW,
    taxPaidTitleH,
    taxPaidGridH,
  );

  doc.y = tableY + Math.max(leftTableH, rightTableH);
}

function drawTdsEarningsGrid(
  doc: PDFKit.PDFDocument,
  rows: PayslipTdsEarningRow[],
  x: number,
  y: number,
  width: number,
  height: number,
  visibleRows: number,
) {
  const headerH = 14;
  const rowH = 14;
  const descW = 119;
  const amountW = (width - descW) / 3;
  const grossX = x + descW;
  const exemptX = grossX + amountW;
  const taxableX = exemptX + amountW;

  drawRect(doc, x, y, width, height);
  verticalLine(doc, grossX, y, headerH + visibleRows * rowH);
  verticalLine(doc, exemptX, y, headerH + visibleRows * rowH);
  verticalLine(doc, taxableX, y, headerH + visibleRows * rowH);

  horizontalLine(doc, x, y + headerH, width);
  for (let index = 1; index <= visibleRows; index += 1) {
    horizontalLine(doc, x, y + headerH + index * rowH, width);
  }

  drawText(doc, "Description", x + 3, y + 3, descW - 6, { bold: true });
  drawText(doc, "Gross", grossX + 3, y + 3, amountW - 6, { align: "right", bold: true });
  drawText(doc, "Exempt", exemptX + 3, y + 3, amountW - 6, { align: "right", bold: true });
  drawText(doc, "Taxable", taxableX + 3, y + 3, amountW - 6, { align: "right", bold: true });

  for (let index = 0; index < visibleRows; index += 1) {
    const row = rows[index];
    if (!row) continue;
    const rowY = y + headerH + 3 + index * rowH;
    drawText(doc, row.label, x + 3, rowY, descW - 6);
    drawText(doc, formatInrPlain(row.grossInrCents), grossX + 3, rowY, amountW - 6, { align: "right" });
    drawText(doc, formatInrPlain(row.exemptInrCents), exemptX + 3, rowY, amountW - 6, { align: "right" });
    drawText(doc, formatInrPlain(row.taxableInrCents), taxableX + 3, rowY, amountW - 6, { align: "right" });
  }
}

function drawTaxDeductionGrid(
  doc: PDFKit.PDFDocument,
  rows: PayslipAmountRow[],
  x: number,
  y: number,
  width: number,
  visibleRows: number,
) {
  const headerH = 14;
  const rowH = 14;
  const amountW = 72;
  const amountX = x + width - amountW;
  const height = headerH + visibleRows * rowH;

  drawRect(doc, x, y, width, height);
  horizontalLine(doc, x, y + headerH, width);
  verticalLine(doc, amountX, y + headerH, visibleRows * rowH);
  drawText(doc, "Income Tax Deduction", x, y + 3, width, { align: "center", bold: true });

  for (let index = 0; index < visibleRows; index += 1) {
    const rowY = y + headerH + index * rowH;
    horizontalLine(doc, x, rowY, width);
    const row = rows[index];
    if (!row) continue;
    drawText(doc, row.label, x + 3, rowY + 3, width - amountW - 6, { size: 8.7 });
    drawText(doc, formatInrPlain(row.amountInrCents), amountX + 3, rowY + 3, amountW - 6, {
      align: "right",
      size: 8.7,
    });
  }
}

function drawTaxPaidGrid(
  doc: PDFKit.PDFDocument,
  months: PayslipTaxPaidMonth[],
  x: number,
  y: number,
  width: number,
  titleH: number,
  gridH: number,
) {
  const rowH = gridH / 4;
  const cellW = width / 6;
  drawRect(doc, x, y, width, titleH + gridH);
  horizontalLine(doc, x, y + titleH, width);
  drawText(doc, "Tax Paid Details", x, y + 3, width, { align: "center", bold: true });

  for (let row = 0; row <= 4; row += 1) {
    horizontalLine(doc, x, y + titleH + row * rowH, width);
  }
  for (let col = 1; col < 6; col += 1) {
    verticalLine(doc, x + col * cellW, y + titleH, gridH);
  }

  for (let group = 0; group < 2; group += 1) {
    const monthY = y + titleH + group * rowH * 2 + 3;
    const amountY = monthY + rowH;
    for (let col = 0; col < 6; col += 1) {
      const month = months[group * 6 + col];
      const cellX = x + col * cellW;
      if (!month) continue;
      drawText(doc, month.monthCode, cellX, monthY, cellW, { align: "center", bold: true });
      drawText(doc, formatInrPlain(month.amountInrCents), cellX, amountY, cellW, { align: "center", size: 8 });
    }
  }
}

function drawFooter(doc: PDFKit.PDFDocument) {
  const y = Math.min(760, doc.y + 4);
  horizontalLine(doc, PAGE.marginX, y, contentWidth());
  drawText(
    doc,
    "This is a computer generated payslip and does not require a signature",
    PAGE.marginX,
    y + 6,
    contentWidth(),
    { align: "center", color: COLORS.muted, size: 8 },
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
  drawText(doc, label, x, y, labelWidth);
  drawText(doc, value, x + labelWidth, y, valueWidth);
}

function drawText(
  doc: PDFKit.PDFDocument,
  value: string,
  x: number,
  y: number,
  width: number,
  options: {
    align?: "left" | "center" | "right";
    bold?: boolean;
    color?: string;
    size?: number;
  } = {},
) {
  doc
    .font(options.bold ? FONT.bold : FONT.regular)
    .fontSize(options.size ?? 9)
    .fillColor(options.color ?? COLORS.ink)
    .text(value, x, y, {
      width,
      align: options.align ?? "left",
      lineBreak: false,
    });
}

function drawRect(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number) {
  doc.rect(x, y, width, height).lineWidth(0.65).strokeColor(COLORS.line).stroke();
}

function horizontalLine(doc: PDFKit.PDFDocument, x: number, y: number, width: number) {
  doc.moveTo(x, y).lineTo(x + width, y).lineWidth(0.65).strokeColor(COLORS.line).stroke();
}

function verticalLine(doc: PDFKit.PDFDocument, x: number, y: number, height: number) {
  doc.moveTo(x, y).lineTo(x, y + height).lineWidth(0.65).strokeColor(COLORS.line).stroke();
}

function contentWidth() {
  return PAGE.width - PAGE.marginX * 2;
}

function formatInrPlain(cents: number) {
  return new Intl.NumberFormat("en-US", {
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
