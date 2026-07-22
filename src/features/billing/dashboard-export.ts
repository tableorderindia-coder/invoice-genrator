import PDFDocument from "pdfkit";

import {
  buildEmployeeSectionTotals,
  buildPeriodTotals,
} from "./dashboard-table-totals";
import { drawPdfTable, splitWidePdfTable } from "./pdf-table";
import type { OverviewPnlSummaryRow } from "./overview-pnl-summary";
import type {
  PnDashboardData,
  PnEmployeeEditableRow,
  PnPeriodRow,
  PnPeriodType,
} from "./types";
import { formatInr, formatMonthYear, formatRate, formatSignedInr, formatUsd } from "./utils";

type CsvTable = {
  headers: string[];
  rows: string[][];
};

function csvCell(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function csvFromTable(table: CsvTable) {
  return [
    table.headers.join(","),
    ...table.rows.map((row) => row.map(csvCell).join(",")),
  ].join("\n");
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

function periodLabel(row: PnPeriodRow, periodType: PnPeriodType) {
  if (periodType === "yearly") return row.fiscalLabel ?? String(row.year);
  return formatMonthYear(row.month ?? 1, row.year);
}

function employeeRow(employeeName: string, row: PnEmployeeEditableRow) {
  return [
    employeeName,
    formatMonthYear(row.month, row.year),
    row.invoiceNumber,
    String(row.daysWorked),
    formatUsd(row.dollarInwardUsdCents),
    formatUsd(row.onboardingAdvanceUsdCents),
    formatUsd(row.reimbursementUsdCents),
    row.reimbursementLabelsText,
    formatInr(row.reimbursementInrCents),
    formatUsd(row.appraisalAdvanceUsdCents),
    formatInr(row.appraisalAdvanceInrCents),
    formatUsd(row.offboardingDeductionUsdCents),
    formatUsd(row.effectiveDollarInwardUsdCents),
    formatRate(row.cashoutUsdInrRate),
    formatInr(row.cashInInrCents),
    formatRate(row.paidUsdInrRate),
    formatInr(row.monthlyPaidInrCents),
    formatInr(row.actualPaidInrCents),
    formatInr(row.pfInrCents),
    formatInr(row.tdsInrCents),
    formatInr(row.salaryPaidInrCents),
    formatInr(row.fxCommissionInrCents),
    formatUsd(row.totalCommissionUsdCents),
    formatInr(row.commissionEarnedInrCents),
    formatInr(row.grossEarningsInrCents),
    formatSignedInr(row.netProfitInrCents),
  ];
}

function employeeTotalRow(employeeName: string, rows: PnEmployeeEditableRow[]) {
  const totals = buildEmployeeSectionTotals(rows);
  return [
    employeeName,
    "",
    "",
    String(totals.daysWorked),
    formatUsd(totals.dollarInwardUsdCents),
    formatUsd(totals.onboardingAdvanceUsdCents),
    formatUsd(totals.reimbursementUsdCents),
    "",
    formatInr(totals.reimbursementInrCents),
    formatUsd(totals.appraisalAdvanceUsdCents),
    formatInr(totals.appraisalAdvanceInrCents),
    formatUsd(totals.offboardingDeductionUsdCents),
    formatUsd(totals.effectiveDollarInwardUsdCents),
    formatRate(totals.cashoutUsdInrRate),
    formatInr(totals.cashInInrCents),
    formatRate(totals.paidUsdInrRate),
    formatInr(totals.monthlyPaidInrCents),
    formatInr(totals.actualPaidInrCents),
    formatInr(totals.pfInrCents),
    formatInr(totals.tdsInrCents),
    formatInr(totals.salaryPaidInrCents),
    formatInr(totals.fxCommissionInrCents),
    formatUsd(totals.totalCommissionUsdCents),
    formatInr(totals.commissionEarnedInrCents),
    formatInr(totals.grossEarningsInrCents),
    formatSignedInr(totals.netProfitInrCents),
  ];
}

export function buildDashboardEmployeeTable(data: PnDashboardData): CsvTable {
  const headers = [
    "Employee",
    "Month",
    "Invoice",
    "Days worked",
    "Dollar inward USD",
    "Onboarding advance USD",
    "Employee reimbursements USD",
    "Employee reimbursement labels",
    "Employee reimbursements INR",
    "Appraisal advance USD",
    "Appraisal advance INR",
    "Offboarding deduction USD",
    "Effective dollar inward USD",
    "Received / exchanged rate",
    "Total cash inward INR",
    "Peg rate",
    "Monthly paid INR",
    "Actual paid INR",
    "PF INR",
    "TDS INR",
    "Salary paid INR",
    "Forex gain INR",
    "Total commission USD",
    "Operating margin INR",
    "Total earning INR",
    "Net Profit INR",
  ];
  const rows = data.employeeEditableSections.flatMap((section) => [
    ...section.rows.map((row) => employeeRow(section.employeeName, row)),
    employeeTotalRow("Totals", section.rows),
  ]);
  return { headers, rows };
}

export function buildDashboardEmployeeCsv(data: PnDashboardData) {
  return csvFromTable(buildDashboardEmployeeTable(data));
}

export function buildDashboardPeriodTable(
  data: PnDashboardData,
  periodType: PnPeriodType,
  options: { includeExpenses: boolean; includeReimbursements: boolean },
): CsvTable {
  const headers = [
    "Period",
    "Dollar inward USD",
    "Onboarding advance USD",
    "Employee reimbursements USD",
    "Employee reimbursement labels",
    "Employee reimbursements INR",
    "Appraisal advance USD",
    "Appraisal advance INR",
    "Offboarding deduction USD",
    "Effective dollar inward USD",
    "Received / exchanged rate",
    "Total cash inward INR",
    "Peg rate",
    "Monthly paid INR",
    "Actual paid INR",
    "PF INR",
    "TDS INR",
    "Salary paid INR",
    "Forex gain INR",
    "Total commission USD",
    "Operating margin INR",
    "Total earning INR",
    "Expenses INR",
    "Company reimbursements USD",
    "Company reimbursements INR",
    "Net P/L INR",
  ];
  const toRow = (row: PnPeriodRow) => [
    periodLabel(row, periodType),
    formatUsd(row.dollarInwardUsdCents),
    formatUsd(row.onboardingAdvanceUsdCents),
    formatUsd(row.reimbursementUsdCents),
    row.reimbursementLabelsText,
    formatInr(row.reimbursementInrCents),
    formatUsd(row.appraisalAdvanceUsdCents),
    formatInr(row.appraisalAdvanceInrCents),
    formatUsd(row.offboardingDeductionUsdCents),
    formatUsd(row.effectiveDollarInwardUsdCents),
    formatRate(row.cashoutUsdInrRate),
    formatInr(row.cashInInrCents),
    formatRate(row.paidUsdInrRate),
    formatInr(row.monthlyPaidInrCents),
    formatInr(row.actualPaidInrCents),
    formatInr(row.pfInrCents),
    formatInr(row.tdsInrCents),
    formatInr(row.salaryPaidInrCents),
    formatInr(row.fxCommissionInrCents),
    formatUsd(row.totalCommissionUsdCents),
    formatInr(row.commissionEarnedInrCents),
    formatInr(row.grossEarningsInrCents),
    formatInr(row.expensesInrCents),
    formatUsd(row.companyReimbursementUsdCents),
    formatInr(row.companyReimbursementInrCents),
    formatSignedInr(buildPeriodTotals([row], options).netPlInrCents),
  ];
  const totals = buildPeriodTotals(data.periodRows, options);
  const totalRow = [
    "Totals",
    formatUsd(totals.dollarInwardUsdCents),
    formatUsd(totals.onboardingAdvanceUsdCents),
    formatUsd(totals.reimbursementUsdCents),
    "",
    formatInr(totals.reimbursementInrCents),
    formatUsd(totals.appraisalAdvanceUsdCents),
    formatInr(totals.appraisalAdvanceInrCents),
    formatUsd(totals.offboardingDeductionUsdCents),
    formatUsd(totals.effectiveDollarInwardUsdCents),
    formatRate(totals.cashoutUsdInrRate),
    formatInr(totals.cashInInrCents),
    formatRate(totals.paidUsdInrRate),
    formatInr(totals.monthlyPaidInrCents),
    formatInr(totals.actualPaidInrCents),
    formatInr(totals.pfInrCents),
    formatInr(totals.tdsInrCents),
    formatInr(totals.salaryPaidInrCents),
    formatInr(totals.fxCommissionInrCents),
    formatUsd(totals.totalCommissionUsdCents),
    formatInr(totals.commissionEarnedInrCents),
    formatInr(totals.grossEarningsInrCents),
    formatInr(totals.expensesInrCents),
    formatUsd(totals.companyReimbursementUsdCents),
    formatInr(totals.companyReimbursementInrCents),
    formatSignedInr(totals.netPlInrCents),
  ];
  return { headers, rows: [...data.periodRows.map(toRow), totalRow] };
}

export function buildDashboardPeriodCsv(
  data: PnDashboardData,
  periodType: PnPeriodType,
  options: { includeExpenses: boolean; includeReimbursements: boolean },
) {
  return csvFromTable(buildDashboardPeriodTable(data, periodType, options));
}

export function buildDashboardCompanyTable(rows: OverviewPnlSummaryRow[]): CsvTable {
  const headers = [
    "Company",
    "Period",
    "Total dollar inward",
    "Total cash inward INR",
    "Monthly paid INR",
    "Actual paid INR",
    "Salary paid INR",
    "PF paid INR",
    "TDS paid INR",
    "FX commission INR",
    "Total commission USD",
    "Commission earned INR",
    "Gross earnings INR",
    "Expenses INR",
    "Reimbursements USD",
    "Reimbursements INR",
    "Net P/L INR",
  ];
  return {
    headers,
    rows: rows.map((row) => [
      row.companyName,
      row.periodLabel,
      formatUsd(row.totals.dollarInwardUsdCents),
      formatInr(row.totals.cashInInrCents),
      formatInr(row.totals.monthlyPaidInrCents),
      formatInr(row.totals.actualPaidInrCents),
      formatInr(row.totals.salaryPaidInrCents),
      formatInr(row.totals.pfInrCents),
      formatInr(row.totals.tdsInrCents),
      formatInr(row.totals.fxCommissionInrCents),
      formatUsd(row.totals.totalCommissionUsdCents),
      formatInr(row.totals.commissionEarnedInrCents),
      formatInr(row.totals.grossEarningsInrCents),
      formatInr(row.totals.expensesInrCents),
      formatUsd(row.totals.companyReimbursementUsdCents),
      formatInr(row.totals.companyReimbursementInrCents),
      formatSignedInr(row.totals.netPlInrCents),
    ]),
  };
}

export function buildDashboardCompanyCsv(rows: OverviewPnlSummaryRow[]) {
  return csvFromTable(buildDashboardCompanyTable(rows));
}

export async function buildDashboardExportPdf(input: {
  title: string;
  subtitle: string;
  rows: string[][];
}) {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 24 });
  let y = 72;
  const pageWidth = doc.page.width - 48;

  doc.font("Helvetica-Bold").fontSize(16).text(input.title, 24, 24);
  doc.font("Helvetica").fontSize(9).text(input.subtitle, 24, 46);

  const tableChunks = splitWidePdfTable(input.rows, 8);
  for (const [chunkIndex, rows] of tableChunks.entries()) {
    if (chunkIndex > 0) {
      doc.addPage();
      y = 48;
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#0f172a")
        .text(`${input.title} (${chunkIndex + 1}/${tableChunks.length})`, 24, 24);
    }
    const firstColumnWidth = Math.min(120, Math.max(82, pageWidth * 0.18));
    const remainingWidth = pageWidth - firstColumnWidth;
    const otherColumnCount = Math.max(1, (rows[0]?.length ?? 1) - 1);
    const widths = [
      firstColumnWidth,
      ...Array.from({ length: otherColumnCount }, () => remainingWidth / otherColumnCount),
    ];
    y = drawPdfTable(doc, {
      x: 24,
      y,
      widths,
      rows,
      pageBottom: doc.page.height - 36,
      fontSize: 7,
      padding: 3,
    });
  }

  return pdfBuffer(doc);
}
