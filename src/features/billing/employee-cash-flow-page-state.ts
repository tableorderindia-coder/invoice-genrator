type SearchValue = string | string[] | undefined;

function getTodayMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function resolveEmployeeCashFlowMonthKey(
  input?: SearchValue,
  legacyYear?: SearchValue,
  now = new Date(),
) {
  const monthValue = Array.isArray(input) ? input[0] : input;
  if (monthValue && /^\d{4}-\d{2}$/.test(monthValue)) {
    return monthValue;
  }

  const legacyMonth = Array.isArray(input) ? input[0] : input;
  const yearValue = Array.isArray(legacyYear) ? legacyYear[0] : legacyYear;
  if (legacyMonth && yearValue) {
    const monthNumber = Number.parseInt(legacyMonth, 10);
    const yearNumber = Number.parseInt(yearValue, 10);
    if (Number.isFinite(monthNumber) && Number.isFinite(yearNumber)) {
      return `${yearNumber}-${String(monthNumber).padStart(2, "0")}`;
    }
  }

  return getTodayMonthKey(now);
}

export function buildEmployeeCashFlowInvoiceOptionsInput(companyId: string) {
  return companyId ? { companyId } : null;
}
