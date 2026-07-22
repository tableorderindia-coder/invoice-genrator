import PDFDocument from "pdfkit";

import type { CompanyExpense } from "./types";
import { formatMonthYear } from "./utils";

export type ExpenseExportRow = {
  month: string;
  label: string;
  amountInr: string;
};

function decimalInr(cents: number) {
  return (Math.round(cents) / 100).toFixed(2);
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function pdfBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export function buildExpenseExportRows(expenses: CompanyExpense[]): ExpenseExportRow[] {
  const rows = expenses.map((expense) => ({
    month: formatMonthYear(expense.month, expense.year),
    label: expense.label || "(No label)",
    amountInr: decimalInr(expense.amountInrCents),
  }));
  const totalInrCents = expenses.reduce((sum, expense) => sum + expense.amountInrCents, 0);
  return [...rows, { month: "Total", label: "", amountInr: decimalInr(totalInrCents) }];
}

export function buildExpenseExportCsv(expenses: CompanyExpense[]) {
  const header = ["Month", "Expense label", "Expense INR"];
  const rows = buildExpenseExportRows(expenses);
  return [
    header.join(","),
    ...rows.map((row) => [row.month, row.label, row.amountInr].map(csvCell).join(",")),
  ].join("\n");
}

export async function buildExpenseExportPdf(input: {
  companyLabel: string;
  periodLabel: string;
  expenses: CompanyExpense[];
}) {
  const doc = new PDFDocument({ size: "A4", margin: 36 });
  const rows = buildExpenseExportRows(input.expenses);
  const tableX = 36;
  const widths = [120, 280, 100];
  let y = 104;

  doc.fontSize(18).font("Helvetica-Bold").text("Company Expenses", 36, 36);
  doc.fontSize(10).font("Helvetica").text(input.companyLabel, 36, 62);
  doc.text(input.periodLabel, 36, 78);

  function drawHeader() {
    doc.font("Helvetica-Bold").fontSize(9);
    ["Month", "Expense label", "Expense INR"].forEach((label, index) => {
      doc.text(label, tableX + widths.slice(0, index).reduce((sum, width) => sum + width, 0), y, {
        width: widths[index],
      });
    });
    y += 18;
    doc.moveTo(tableX, y - 6).lineTo(tableX + widths.reduce((sum, width) => sum + width, 0), y - 6).stroke();
    doc.font("Helvetica").fontSize(9);
  }

  drawHeader();
  for (const row of rows) {
    if (y > 760) {
      doc.addPage();
      y = 48;
      drawHeader();
    }
    const isTotal = row.month === "Total";
    doc.font(isTotal ? "Helvetica-Bold" : "Helvetica");
    doc.text(row.month, tableX, y, { width: widths[0] });
    doc.text(row.label, tableX + widths[0], y, { width: widths[1] });
    doc.text(row.amountInr, tableX + widths[0] + widths[1], y, {
      width: widths[2],
      align: "right",
    });
    y += 18;
  }

  return pdfBuffer(doc);
}
