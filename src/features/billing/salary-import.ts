import type { MonthlyPayrollRow } from "./payroll";

export type SalaryImportCell = string | number | boolean | Date | null | undefined;

export type SalaryImportRow = {
  rowNumber: number;
  employeeName: string;
  payrollMonth: string;
  daysWorked: number;
  basicInrCents: number;
  specialAllowanceInrCents: number;
  insuranceInrCents: number;
  bonusInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
  panNumber?: string;
  pfUan?: string;
  designation?: string;
  joiningDate?: string;
};

export type SalaryImportParseResult = {
  rows: SalaryImportRow[];
  skippedRows: number;
  errors: string[];
};

export type SalaryImportMatch = {
  employeeId: string;
  employeeName: string;
  importRow: SalaryImportRow;
  matchType: "pan" | "name";
};

export type SalaryImportMatchResult = {
  matches: SalaryImportMatch[];
  unmatched: SalaryImportRow[];
  duplicates: SalaryImportRow[];
};

export const SALARY_IMPORT_HEADERS = [
  "Name",
  "Month",
  "Year",
  "Days Worked",
  "Basic",
  "Special Allowance",
  "Insurance",
  "Bonus",
  "PF(Employee)",
  "Income Tax",
  "PAN Number",
  "PF UAN",
  "Designation",
  "Joining Date",
] as const;

const MONTHS = new Map([
  ["january", 1],
  ["jan", 1],
  ["february", 2],
  ["feb", 2],
  ["march", 3],
  ["mar", 3],
  ["april", 4],
  ["apr", 4],
  ["may", 5],
  ["june", 6],
  ["jun", 6],
  ["july", 7],
  ["jul", 7],
  ["august", 8],
  ["aug", 8],
  ["september", 9],
  ["sep", 9],
  ["october", 10],
  ["oct", 10],
  ["november", 11],
  ["nov", 11],
  ["december", 12],
  ["dec", 12],
]);

function text(value: SalaryImportCell) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizedText(value: SalaryImportCell) {
  return text(value).replace(/\s+/g, " ");
}

function normalizedKey(value: SalaryImportCell) {
  return normalizedText(value).toLowerCase();
}

function panKey(value: SalaryImportCell) {
  return text(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function cents(value: SalaryImportCell) {
  if (typeof value === "number") return Math.round(value * 100);
  const parsed = Number.parseFloat(text(value).replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0;
}

function nonNegativeNumber(value: SalaryImportCell) {
  if (typeof value === "number") return value >= 0 ? value : 0;
  const parsed = Number.parseFloat(text(value).replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function dateText(value: SalaryImportCell) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = text(value);
  if (!raw) return undefined;
  const slashDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashDate) {
    const month = Number.parseInt(slashDate[1] ?? "", 10);
    const day = Number.parseInt(slashDate[2] ?? "", 10);
    const rawYear = Number.parseInt(slashDate[3] ?? "", 10);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const parsed = new Date(raw);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : raw;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }
    if (char === "\"") {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

function headerIndex(headers: SalaryImportCell[], header: string) {
  return headers.findIndex((value) => normalizedKey(value) === normalizedKey(header));
}

function requireHeader(headers: SalaryImportCell[], header: string, errors: string[]) {
  const index = headerIndex(headers, header);
  if (index < 0) errors.push(`Missing required salary import column: ${header}.`);
  return index;
}

function findHeaderRow(rows: SalaryImportCell[][]) {
  return rows.findIndex((row) => row.some((cell) => normalizedKey(cell) === "name"));
}

export function buildSalaryImportTemplateRows() {
  return [
    [...SALARY_IMPORT_HEADERS],
    [
      "Employee Name",
      "July",
      "2026",
      "31",
      "100000",
      "25000",
      "5000",
      "0",
      "1800",
      "5000",
      "ABCDE1234F",
      "100200300",
      "Consultant",
      "2025-04-01",
    ],
  ];
}

export function buildSalaryImportTemplateCsv() {
  return buildSalaryImportTemplateRows()
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, "\"\"")}"`).join(","))
    .join("\n");
}

export function normalizeSalaryImportMonth(monthValue: SalaryImportCell, yearValue: SalaryImportCell) {
  const monthRaw = text(monthValue);
  const year = Number.parseInt(text(yearValue), 10);
  if (!Number.isInteger(year) || year < 1900) {
    throw new Error("Salary import year is invalid.");
  }
  const parsedMonth = Number.parseInt(monthRaw, 10);
  const month = Number.isInteger(parsedMonth) ? parsedMonth : MONTHS.get(monthRaw.toLowerCase());
  if (!month || month < 1 || month > 12) {
    throw new Error("Salary import month is invalid.");
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseSalaryImportCsv(
  csv: string,
  input: { selectedMonth: string; sourceFileName: string },
) {
  const rows = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => splitCsvLine(line));
  return parseSalaryImportSheetRows(rows, input);
}

export function parseSalaryImportSheetRows(
  sheetRows: SalaryImportCell[][],
  input: { selectedMonth: string; sourceFileName: string },
): SalaryImportParseResult {
  const errors: string[] = [];
  const headerRowIndex = findHeaderRow(sheetRows);
  if (headerRowIndex < 0) {
    return {
      rows: [],
      skippedRows: sheetRows.length,
      errors: ["Could not find the salary import header row."],
    };
  }
  const headers = sheetRows[headerRowIndex] ?? [];
  const nameIndex = requireHeader(headers, "Name", errors);
  const monthIndex = requireHeader(headers, "Month", errors);
  const yearIndex = requireHeader(headers, "Year", errors);
  const daysIndex = requireHeader(headers, "Days Worked", errors);
  const basicIndex = requireHeader(headers, "Basic", errors);
  const specialAllowanceIndex = requireHeader(headers, "Special Allowance", errors);
  const insuranceIndex = requireHeader(headers, "Insurance", errors);
  const bonusIndex = requireHeader(headers, "Bonus", errors);
  const pfIndex = requireHeader(headers, "PF(Employee)", errors);
  const tdsIndex = requireHeader(headers, "Income Tax", errors);
  const panIndex = headerIndex(headers, "PAN Number");
  const pfUanIndex = headerIndex(headers, "PF UAN");
  const designationIndex = headerIndex(headers, "Designation");
  const joiningDateIndex = headerIndex(headers, "Joining Date");
  if (errors.length > 0) {
    return { rows: [], skippedRows: Math.max(0, sheetRows.length - headerRowIndex - 1), errors };
  }

  const rows: SalaryImportRow[] = [];
  let skippedRows = 0;
  for (const [offset, row] of sheetRows.slice(headerRowIndex + 1).entries()) {
    const rowNumber = headerRowIndex + offset + 2;
    const employeeName = normalizedText(row[nameIndex]);
    if (!employeeName) {
      skippedRows += 1;
      continue;
    }
    let payrollMonth: string;
    try {
      payrollMonth = normalizeSalaryImportMonth(row[monthIndex], row[yearIndex]);
    } catch (error) {
      errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : "Invalid payroll month."}`);
      continue;
    }
    if (payrollMonth !== input.selectedMonth) {
      return {
        rows: [],
        skippedRows,
        errors: [
          `${input.sourceFileName} is for ${payrollMonth}, but the selected salary month is ${input.selectedMonth}.`,
        ],
      };
    }
    rows.push({
      rowNumber,
      employeeName,
      payrollMonth,
      daysWorked: nonNegativeNumber(row[daysIndex]),
      basicInrCents: cents(row[basicIndex]),
      specialAllowanceInrCents: cents(row[specialAllowanceIndex]),
      insuranceInrCents: cents(row[insuranceIndex]),
      bonusInrCents: cents(row[bonusIndex]),
      pfInrCents: cents(row[pfIndex]),
      tdsInrCents: cents(row[tdsIndex]),
      panNumber: panKey(row[panIndex]) || undefined,
      pfUan: normalizedText(row[pfUanIndex]) || undefined,
      designation: normalizedText(row[designationIndex]) || undefined,
      joiningDate: dateText(row[joiningDateIndex]),
    });
  }

  return { rows, skippedRows, errors };
}

export function matchSalaryImportRows(input: {
  importRows: SalaryImportRow[];
  payrollRows: MonthlyPayrollRow[];
}): SalaryImportMatchResult {
  const byPan = new Map<string, MonthlyPayrollRow>();
  const byName = new Map<string, MonthlyPayrollRow[]>();
  for (const row of input.payrollRows) {
    const rowPan = panKey(row.panNumber);
    if (rowPan) byPan.set(rowPan, row);
    const nameKey = normalizedKey(row.employeeName);
    byName.set(nameKey, [...(byName.get(nameKey) ?? []), row]);
  }

  const matches: SalaryImportMatch[] = [];
  const unmatched: SalaryImportRow[] = [];
  const duplicates: SalaryImportRow[] = [];
  for (const importRow of input.importRows) {
    const panMatch = importRow.panNumber ? byPan.get(panKey(importRow.panNumber)) : undefined;
    if (panMatch) {
      matches.push({
        employeeId: panMatch.employeeId,
        employeeName: panMatch.employeeName,
        importRow,
        matchType: "pan",
      });
      continue;
    }
    const nameMatches = byName.get(normalizedKey(importRow.employeeName)) ?? [];
    if (nameMatches.length === 1 && nameMatches[0]) {
      matches.push({
        employeeId: nameMatches[0].employeeId,
        employeeName: nameMatches[0].employeeName,
        importRow,
        matchType: "name",
      });
    } else if (nameMatches.length > 1) {
      duplicates.push(importRow);
    } else {
      unmatched.push(importRow);
    }
  }
  return { matches, unmatched, duplicates };
}

export function applySalaryImportToRows(input: {
  payrollRows: MonthlyPayrollRow[];
  matches: SalaryImportMatch[];
  sourceFileName: string;
}): MonthlyPayrollRow[] {
  const matchesByEmployeeId = new Map(input.matches.map((match) => [match.employeeId, match]));
  return input.payrollRows.map((row) => {
    const match = matchesByEmployeeId.get(row.employeeId);
    if (!match) return row;
    return {
      ...row,
      daysWorked: match.importRow.daysWorked,
      basicInrCents: match.importRow.basicInrCents,
      specialAllowanceInrCents: match.importRow.specialAllowanceInrCents,
      insuranceInrCents: match.importRow.insuranceInrCents,
      bonusInrCents: match.importRow.bonusInrCents,
      pfInrCents: match.importRow.pfInrCents,
      tdsInrCents: match.importRow.tdsInrCents,
      importedPanNumber: match.importRow.panNumber,
      importedPfUan: match.importRow.pfUan,
      importedDesignation: match.importRow.designation,
      importedActiveFrom: match.importRow.joiningDate,
      notes: `Imported from file: ${input.sourceFileName}`,
    };
  });
}
