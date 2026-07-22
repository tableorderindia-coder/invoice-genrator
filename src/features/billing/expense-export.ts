import PDFDocument from "pdfkit";

import { drawPdfTable } from "./pdf-table";
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
  const y = 104;

  doc.fontSize(18).font("Helvetica-Bold").text("Company Expenses", 36, 36);
  doc.fontSize(10).font("Helvetica").text(input.companyLabel, 36, 62);
  doc.text(input.periodLabel, 36, 78);

  drawPdfTable(doc, {
    x: tableX,
    y,
    widths,
    rows: [
      ["Month", "Expense label", "Expense INR"],
      ...rows.map((row) => [row.month, row.label, row.amountInr]),
    ],
    pageBottom: 780,
    fontSize: 9,
    padding: 5,
  });

  return pdfBuffer(doc);
}
