import { formatMonthYear } from "./utils";

const MONTH_KEY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type ExpensePeriodRange = {
  startMonth: string;
  endMonth: string;
};

export function currentExpenseMonthKey(date = new Date()) {
  return expenseMonthKey(date.getFullYear(), date.getMonth() + 1);
}

export function expenseMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseExpenseMonthKey(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return MONTH_KEY_PATTERN.test(trimmed) ? trimmed : undefined;
}

export function parseExpenseMonthKeyParts(value: string) {
  const monthKey = parseExpenseMonthKey(value);
  if (!monthKey) {
    throw new Error(`Invalid expense month key: ${value}`);
  }

  const [year, month] = monthKey.split("-").map(Number);
  return { year, month };
}

export function normalizeExpensePeriodRange(input: {
  startMonth?: unknown;
  endMonth?: unknown;
  fallbackMonth: string;
}): ExpensePeriodRange {
  const fallbackMonth = parseExpenseMonthKey(input.fallbackMonth) ?? currentExpenseMonthKey();
  const startMonth = parseExpenseMonthKey(input.startMonth) ?? fallbackMonth;
  const endMonth = parseExpenseMonthKey(input.endMonth) ?? startMonth;

  if (startMonth > endMonth) {
    return { startMonth: endMonth, endMonth: startMonth };
  }

  return { startMonth, endMonth };
}

export function isExpenseInPeriod(
  expense: { year: number; month: number },
  range: ExpensePeriodRange,
) {
  const monthKey = expenseMonthKey(expense.year, expense.month);
  return monthKey >= range.startMonth && monthKey <= range.endMonth;
}

export function formatExpensePeriodLabel(startMonth: string, endMonth: string) {
  const start = parseExpenseMonthKeyParts(startMonth);
  if (startMonth === endMonth) {
    return formatMonthYear(start.month, start.year);
  }

  const end = parseExpenseMonthKeyParts(endMonth);
  return `${formatMonthYear(start.month, start.year)} - ${formatMonthYear(end.month, end.year)}`;
}
