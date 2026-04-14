import { formatMonthYear } from "./utils";

type MultiSelectInput = string | string[] | undefined;

export function normalizeMultiSelectValue(input?: MultiSelectInput) {
  const values = Array.isArray(input) ? input : input ? [input] : [];
  const normalized = values.flatMap((value) =>
    String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

  return [...new Set(normalized)];
}

export function formatPaymentMonthLabel(paymentMonth: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(paymentMonth);
  if (!match) {
    return paymentMonth;
  }

  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return paymentMonth;
  }

  return formatMonthYear(month, year);
}

export function filterSavedCashFlowRows<
  TRow extends { employeeId: string; paymentMonth: string },
>(
  rows: TRow[],
  filters: { employeeIds?: string[]; paymentMonths?: string[] },
) {
  const employeeIds = filters.employeeIds ?? [];
  const paymentMonths = filters.paymentMonths ?? [];

  return rows.filter((row) => {
    const employeeMatches =
      employeeIds.length === 0 || employeeIds.includes(row.employeeId);
    if (!employeeMatches) {
      return false;
    }

    return paymentMonths.length === 0 || paymentMonths.includes(row.paymentMonth);
  });
}
