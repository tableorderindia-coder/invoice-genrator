import { getDaysInMonth } from "./utils";
import type { MonthlyPayrollRow } from "./payroll";
import type { Employee } from "./types";

export type PayslipAmountRow = {
  label: string;
  amountInrCents: number;
  sortOrder: number;
};

export type PayslipTdsEarningRow = {
  label: string;
  grossInrCents: number;
  exemptInrCents: number;
  taxableInrCents: number;
  sortOrder: number;
};

export type PayslipTaxPaidMonth = {
  monthCode: string;
  monthKey: string;
  amountInrCents: number;
  sortOrder: number;
};

export type PayslipEarningTemplateRow = {
  label: string;
  kind: "percentage" | "fixed";
  value?: number;
  valueInrCents?: number;
  sortOrder: number;
};

export type PayslipDeductionTemplateRow = {
  label: string;
  source: "pf" | "tds" | "fixed";
  valueInrCents?: number;
  sortOrder: number;
};

export type PayslipTemplate = {
  earnings: PayslipEarningTemplateRow[];
  deductions?: PayslipDeductionTemplateRow[];
  tdsIncomeTaxDeductions?: PayslipAmountRow[];
};

export type PayslipRecordInput = {
  companyId: string;
  month: string;
  employee: Employee;
  payrollRow: MonthlyPayrollRow;
  template?: PayslipTemplate;
  previousTaxPaidByMonth?: Map<string, number>;
};

export type PayslipModel = {
  companyId: string;
  employeeId: string;
  employeeName: string;
  month: string;
  panNumber: string;
  pfUan: string;
  joiningDate: string;
  designation: string;
  effectiveWorkDays: number;
  earnings: PayslipAmountRow[];
  deductions: PayslipAmountRow[];
  tdsEarnings: PayslipTdsEarningRow[];
  tdsIncomeTaxDeductions: PayslipAmountRow[];
  taxPaidMonths: PayslipTaxPaidMonth[];
};

export type PayslipTotals = {
  totalEarningsInrCents: number;
  totalDeductionsInrCents: number;
  netPayInrCents: number;
};

const DEFAULT_TEMPLATE: PayslipTemplate = {
  earnings: [
    { label: "BASIC", kind: "percentage", value: 40, sortOrder: 1 },
    { label: "SPECIAL ALLOWANCE", kind: "percentage", value: 60, sortOrder: 2 },
    { label: "INSURANCE", kind: "fixed", valueInrCents: 0, sortOrder: 3 },
  ],
  deductions: [
    { label: "PF", source: "pf", sortOrder: 1 },
    { label: "INCOME TAX", source: "tds", sortOrder: 2 },
  ],
  tdsIncomeTaxDeductions: [
    { label: "Profession Tax", amountInrCents: 0, sortOrder: 1 },
    { label: "Standard Deduction", amountInrCents: 75_000_00, sortOrder: 2 },
    { label: "Total Tax", amountInrCents: 0, sortOrder: 3 },
    { label: "Education Cess", amountInrCents: 0, sortOrder: 4 },
    { label: "Tax Deducted (Previous Employer)", amountInrCents: 0, sortOrder: 5 },
  ],
};

const FISCAL_MONTHS = [
  { code: "APR", month: 4 },
  { code: "MAY", month: 5 },
  { code: "JUN", month: 6 },
  { code: "JUL", month: 7 },
  { code: "AUG", month: 8 },
  { code: "SEP", month: 9 },
  { code: "OCT", month: 10 },
  { code: "NOV", month: 11 },
  { code: "DEC", month: 12 },
  { code: "JAN", month: 1 },
  { code: "FEB", month: 2 },
  { code: "MAR", month: 3 },
];

export function buildDefaultPayslip(input: PayslipRecordInput): PayslipModel {
  const [yearText, monthText] = input.month.split("-");
  const year = Number.parseInt(yearText ?? "", 10);
  const month = Number.parseInt(monthText ?? "", 10);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error("Payslip month is invalid.");
  }

  const template = mergeTemplate(input.template);
  const earnings = buildEarnings(template.earnings, input.payrollRow.salaryPaidInrCents);
  const deductions = buildDeductions(template.deductions ?? [], input.payrollRow);
  const tdsEarnings = earnings.map((earning) => ({
    label: earning.label,
    grossInrCents: earning.amountInrCents * 12,
    exemptInrCents: 0,
    taxableInrCents: earning.amountInrCents * 12,
    sortOrder: earning.sortOrder,
  }));
  const taxPaidMonths = buildTaxPaidMonths({
    selectedYear: year,
    selectedMonth: month,
    previousTaxPaidByMonth: input.previousTaxPaidByMonth ?? new Map(),
  });

  return {
    companyId: input.companyId,
    employeeId: input.employee.id,
    employeeName: input.payrollRow.employeeName || input.employee.fullName,
    month: input.month,
    panNumber: input.employee.panNumber ?? "",
    pfUan: input.employee.pfUan ?? "",
    joiningDate: input.employee.activeFrom,
    designation: input.employee.designation,
    effectiveWorkDays: getDaysInMonth(month, year),
    earnings,
    deductions,
    tdsEarnings,
    tdsIncomeTaxDeductions: buildTdsIncomeTaxDeductions({
      tdsEarnings,
      templateRows: template.tdsIncomeTaxDeductions ?? [],
      currentMonthTdsInrCents: input.payrollRow.tdsInrCents,
      taxPaidMonths,
    }),
    taxPaidMonths,
  };
}

export function calculatePayslipTotals(input: {
  earnings: PayslipAmountRow[];
  deductions: PayslipAmountRow[];
}): PayslipTotals {
  const totalEarningsInrCents = sumAmountRows(input.earnings);
  const totalDeductionsInrCents = sumAmountRows(input.deductions);

  return {
    totalEarningsInrCents,
    totalDeductionsInrCents,
    netPayInrCents: totalEarningsInrCents - totalDeductionsInrCents,
  };
}

export function formatPayslipAmountInWords(cents: number) {
  const rupees = Math.max(0, Math.round(cents / 100));
  return `Rupees ${toIndianWords(rupees)} Only`;
}

function mergeTemplate(template?: PayslipTemplate): PayslipTemplate {
  return {
    earnings: template?.earnings?.length ? template.earnings : DEFAULT_TEMPLATE.earnings,
    deductions: template?.deductions?.length ? template.deductions : DEFAULT_TEMPLATE.deductions,
    tdsIncomeTaxDeductions: mergeTdsTemplateRows(template?.tdsIncomeTaxDeductions),
  };
}

function mergeTdsTemplateRows(rows?: PayslipAmountRow[]) {
  const defaultsByLabel = new Map(
    DEFAULT_TEMPLATE.tdsIncomeTaxDeductions?.map((row) => [row.label, row]) ?? [],
  );
  for (const row of rows ?? []) {
    defaultsByLabel.set(row.label, row);
  }
  return [...defaultsByLabel.values()].sort((left, right) => left.sortOrder - right.sortOrder);
}

function buildEarnings(rows: PayslipEarningTemplateRow[], salaryInrCents: number) {
  let allocated = 0;
  const sortedRows = [...rows].sort((left, right) => left.sortOrder - right.sortOrder);

  return sortedRows.map((row, index) => {
    const isLastPercentageRow =
      row.kind === "percentage" &&
      sortedRows.slice(index + 1).every((nextRow) => nextRow.kind !== "percentage");
    const amountInrCents =
      row.kind === "fixed"
        ? Math.max(0, Math.round(row.valueInrCents ?? 0))
        : isLastPercentageRow
          ? Math.max(0, salaryInrCents - allocated)
          : Math.round((salaryInrCents * Math.max(0, row.value ?? 0)) / 10_000) * 100;
    allocated += amountInrCents;

    return {
      label: row.label,
      amountInrCents,
      sortOrder: row.sortOrder,
    };
  });
}

function buildDeductions(rows: PayslipDeductionTemplateRow[], payrollRow: MonthlyPayrollRow) {
  const deductions = rows
    .map((row) => ({
      label: row.label,
      amountInrCents:
        row.source === "pf"
          ? payrollRow.pfInrCents
          : row.source === "tds"
            ? payrollRow.tdsInrCents
            : Math.max(0, Math.round(row.valueInrCents ?? 0)),
      sortOrder: row.sortOrder,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  if (!deductions.some((row) => row.label.toUpperCase() === "PF")) {
    deductions.push({ label: "PF", amountInrCents: payrollRow.pfInrCents, sortOrder: deductions.length + 1 });
  }
  if (!deductions.some((row) => row.label.toUpperCase() === "INCOME TAX")) {
    deductions.push({ label: "INCOME TAX", amountInrCents: payrollRow.tdsInrCents, sortOrder: deductions.length + 1 });
  }

  return deductions;
}

function buildTaxPaidMonths(input: {
  selectedYear: number;
  selectedMonth: number;
  previousTaxPaidByMonth: Map<string, number>;
}) {
  const fiscalStartYear = input.selectedMonth >= 4 ? input.selectedYear : input.selectedYear - 1;
  return FISCAL_MONTHS.map((fiscalMonth, index) => {
    const year = fiscalMonth.month >= 4 ? fiscalStartYear : fiscalStartYear + 1;
    const monthKey = `${year}-${String(fiscalMonth.month).padStart(2, "0")}`;
    return {
      monthCode: fiscalMonth.code,
      monthKey,
      amountInrCents: Math.max(0, Math.round(input.previousTaxPaidByMonth.get(monthKey) ?? 0)),
      sortOrder: index + 1,
    };
  });
}

function buildTdsIncomeTaxDeductions(input: {
  tdsEarnings: PayslipTdsEarningRow[];
  templateRows: PayslipAmountRow[];
  currentMonthTdsInrCents: number;
  taxPaidMonths: PayslipTaxPaidMonth[];
}) {
  const incomeAfterExemption = input.tdsEarnings.reduce((sum, row) => sum + row.taxableInrCents, 0);
  const professionTax = findTemplateAmount(input.templateRows, "Profession Tax");
  const standardDeduction = findTemplateAmount(input.templateRows, "Standard Deduction");
  const totalTax = findTemplateAmount(input.templateRows, "Total Tax");
  const educationCess = findTemplateAmount(input.templateRows, "Education Cess");
  const previousEmployerTax = findTemplateAmount(input.templateRows, "Tax Deducted (Previous Employer)");
  const taxableIncome = Math.max(0, incomeAfterExemption - professionTax - standardDeduction);
  const taxDeductedTillDate =
    previousEmployerTax + input.taxPaidMonths.reduce((sum, row) => sum + row.amountInrCents, 0);
  const taxToBeDeducted = Math.max(0, totalTax + educationCess - taxDeductedTillDate);

  return [
    { label: "Income after Section 10 Exemption", amountInrCents: incomeAfterExemption, sortOrder: 1 },
    { label: "Profession Tax", amountInrCents: professionTax, sortOrder: 2 },
    { label: "Standard Deduction", amountInrCents: standardDeduction, sortOrder: 3 },
    { label: "Taxable Income", amountInrCents: taxableIncome, sortOrder: 4 },
    { label: "Total Tax", amountInrCents: totalTax, sortOrder: 5 },
    { label: "Education Cess", amountInrCents: educationCess, sortOrder: 6 },
    { label: "Tax Deducted (Previous Employer)", amountInrCents: previousEmployerTax, sortOrder: 7 },
    { label: "Tax Deducted Till Date", amountInrCents: taxDeductedTillDate, sortOrder: 8 },
    { label: "Tax to be Deducted", amountInrCents: taxToBeDeducted, sortOrder: 9 },
    { label: "Monthly Projected Tax", amountInrCents: input.currentMonthTdsInrCents, sortOrder: 10 },
  ];
}

function findTemplateAmount(rows: PayslipAmountRow[], label: string) {
  return rows.find((row) => row.label.toLowerCase() === label.toLowerCase())?.amountInrCents ?? 0;
}

function sumAmountRows(rows: PayslipAmountRow[]) {
  return rows.reduce((sum, row) => sum + row.amountInrCents, 0);
}

const SMALL_NUMBERS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function toIndianWords(value: number): string {
  if (value === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(value / 10_000_000);
  const lakh = Math.floor((value % 10_000_000) / 100_000);
  const thousand = Math.floor((value % 100_000) / 1_000);
  const hundredRemainder = value % 1_000;

  if (crore) parts.push(`${underHundred(crore)} Crore`);
  if (lakh) parts.push(`${underHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${underHundred(thousand)} Thousand`);
  if (hundredRemainder) parts.push(underThousand(hundredRemainder));

  return parts.join(" ");
}

function underThousand(value: number) {
  const hundred = Math.floor(value / 100);
  const remainder = value % 100;
  const parts: string[] = [];
  if (hundred) parts.push(`${SMALL_NUMBERS[hundred]} Hundred`);
  if (remainder) {
    parts.push(`${hundred ? "and " : ""}${underHundred(remainder)}`);
  }
  return parts.join(" ");
}

function underHundred(value: number) {
  if (value < 20) return SMALL_NUMBERS[value] ?? "";
  const ten = Math.floor(value / 10);
  const remainder = value % 10;
  return [TENS[ten], remainder ? SMALL_NUMBERS[remainder] : ""].filter(Boolean).join(" ");
}
