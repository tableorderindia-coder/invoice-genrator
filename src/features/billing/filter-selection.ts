import { formatMonthYear } from "./utils";

type MultiSelectInput = string | string[] | undefined;

type CompanySelectionOption = {
  id: string;
};

export type FinancialYearSelection = {
  value: string;
  startYear: number;
  endYear: number;
  startMonth: 4;
  endMonth: 3;
  label: string;
};

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

export function resolveSelectedCompanyId(input: {
  companyId?: MultiSelectInput;
  companies: CompanySelectionOption[];
}) {
  const requestedCompanyId = normalizeMultiSelectValue(input.companyId)[0] ?? "";
  const companyIds = new Set(input.companies.map((company) => company.id));

  if (requestedCompanyId && companyIds.has(requestedCompanyId)) {
    return requestedCompanyId;
  }

  return input.companies[0]?.id ?? "";
}

export function resolveSelectedCompanyIds(input: {
  companyIds?: MultiSelectInput;
  companyId?: MultiSelectInput;
  companies: CompanySelectionOption[];
}) {
  const companyIdSet = new Set(input.companies.map((company) => company.id));
  const requestedCompanyIds = [
    ...normalizeMultiSelectValue(input.companyIds),
    ...normalizeMultiSelectValue(input.companyId),
  ].filter((companyId) => companyIdSet.has(companyId));
  const selectedCompanyIds = [...new Set(requestedCompanyIds)];

  return selectedCompanyIds.length > 0
    ? selectedCompanyIds
    : input.companies.map((company) => company.id);
}

export function resolveFinancialYearFromDate(date = new Date()): FinancialYearSelection {
  const month = date.getMonth() + 1;
  const calendarYear = date.getFullYear();
  const startYear = month >= 4 ? calendarYear : calendarYear - 1;
  const endYear = startYear + 1;

  return {
    value: `${startYear}-${endYear}`,
    startYear,
    endYear,
    startMonth: 4,
    endMonth: 3,
    label: `Apr ${startYear} - Mar ${endYear}`,
  };
}

export function parseFinancialYear(
  value?: string,
  availableOptions?: Array<Pick<FinancialYearSelection, "value">>,
): FinancialYearSelection {
  const match = /^(\d{4})-(\d{4})$/.exec(String(value ?? ""));
  if (!match) {
    if (availableOptions && availableOptions.length > 0) {
      const current = resolveFinancialYearFromDate();
      const option = availableOptions.find((item) => item.value === current.value) ?? availableOptions[0];
      return parseFinancialYear(option?.value);
    }
    return resolveFinancialYearFromDate();
  }

  const startYear = Number.parseInt(match[1] ?? "", 10);
  const endYear = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(startYear) || endYear !== startYear + 1) {
    return parseFinancialYear(undefined, availableOptions);
  }

  const parsedValue = `${startYear}-${endYear}`;
  if (
    availableOptions &&
    availableOptions.length > 0 &&
    !availableOptions.some((item) => item.value === parsedValue)
  ) {
    return parseFinancialYear(undefined, availableOptions);
  }

  return {
    value: parsedValue,
    startYear,
    endYear,
    startMonth: 4,
    endMonth: 3,
    label: `Apr ${startYear} - Mar ${endYear}`,
  };
}

export function isMonthInFinancialYear(
  input: { year: number; month: number },
  financialYearValue: string,
) {
  const financialYear = parseFinancialYear(financialYearValue);
  const monthKey = input.year * 100 + input.month;

  return (
    monthKey >= financialYear.startYear * 100 + financialYear.startMonth &&
    monthKey <= financialYear.endYear * 100 + financialYear.endMonth
  );
}

export function filterRowsByFinancialYear<TRow extends { year: number; month: number }>(
  rows: TRow[],
  financialYearValue: string,
) {
  return rows.filter((row) => isMonthInFinancialYear(row, financialYearValue));
}

export function getFinancialYearOptions(rows: Array<{ year: number; month: number }>) {
  const startYears = new Set<number>();
  for (const row of rows) {
    if (!Number.isFinite(row.year) || !Number.isFinite(row.month)) continue;
    if (row.month < 1 || row.month > 12) continue;
    startYears.add(row.month >= 4 ? row.year : row.year - 1);
  }

  return [...startYears]
    .sort((left, right) => right - left)
    .map((startYear) => parseFinancialYear(`${startYear}-${startYear + 1}`));
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

export function resolveSavedCashFlowFilters(input: {
  employeeIds?: MultiSelectInput;
  paymentMonths?: MultiSelectInput;
}) {
  return {
    employeeIds: normalizeMultiSelectValue(input.employeeIds),
    paymentMonths: normalizeMultiSelectValue(input.paymentMonths),
  };
}

export function resolveDashboardColumnSelection(input: {
  selectedColumns?: MultiSelectInput;
  allowedColumns: string[];
  defaultColumns?: string[];
}) {
  const allowedColumnSet = new Set(input.allowedColumns);
  const selectedColumns = normalizeMultiSelectValue(input.selectedColumns).filter((value) =>
    allowedColumnSet.has(value),
  );

  if (input.selectedColumns !== undefined) {
    return selectedColumns;
  }

  return (input.defaultColumns ?? input.allowedColumns).filter((value) =>
    allowedColumnSet.has(value),
  );
}

export function buildEmployeeCashFlowFilterFieldEntries(input: {
  companyId: string;
  month: string;
  tab: "compose" | "saved";
  invoiceIds?: MultiSelectInput;
  employeeIds?: MultiSelectInput;
  paymentMonths?: MultiSelectInput;
  includeCompanyId?: boolean;
  includeMonth?: boolean;
  includeTab?: boolean;
}) {
  const fields: Array<{ name: string; value: string }> = [];

  if (input.includeCompanyId !== false && input.companyId) {
    fields.push({ name: "companyId", value: input.companyId });
  }

  if (input.includeMonth !== false && input.month) {
    fields.push({ name: "month", value: input.month });
  }

  if (input.includeTab) {
    fields.push({ name: "tab", value: input.tab });
  }

  if (input.tab === "compose") {
    fields.push(
      ...normalizeMultiSelectValue(input.invoiceIds).map((value) => ({
        name: "invoiceId",
        value,
      })),
    );
  } else {
    fields.push(
      ...normalizeMultiSelectValue(input.employeeIds).map((value) => ({
        name: "employeeIds",
        value,
      })),
      ...normalizeMultiSelectValue(input.paymentMonths).map((value) => ({
        name: "paymentMonths",
        value,
      })),
    );
  }

  return fields;
}

export function buildDashboardFilterFieldEntries(input: {
  companyId?: string;
  companyIds?: MultiSelectInput;
  financialYear?: string;
  periodType: "monthly" | "yearly";
  view: "employee" | "period";
  employeeIds?: MultiSelectInput;
  paymentMonths?: MultiSelectInput;
  allEmployees?: boolean;
  allMonths?: boolean;
  employeeColumns?: MultiSelectInput;
  periodColumns?: MultiSelectInput;
  includeCompanyId?: boolean;
  includePeriodType?: boolean;
  includeView?: boolean;
  includeEmployeeIds?: boolean;
  includePaymentMonths?: boolean;
  includeAllEmployees?: boolean;
  includeAllMonths?: boolean;
  includeEmployeeColumns?: boolean;
  includePeriodColumns?: boolean;
}) {
  const fields: Array<{ name: string; value: string }> = [];

  if (input.includeCompanyId !== false) {
    const companyIds = normalizeMultiSelectValue(input.companyIds);
    if (companyIds.length > 0) {
      fields.push(
        ...companyIds.map((value) => ({
          name: "companyIds",
          value,
        })),
      );
    } else if (input.companyId) {
      fields.push({ name: "companyId", value: input.companyId });
    }
  }

  if (input.financialYear) {
    fields.push({ name: "financialYear", value: input.financialYear });
  }

  if (input.includePeriodType !== false && input.periodType) {
    fields.push({ name: "periodType", value: input.periodType });
  }

  if (input.includeView !== false && input.view) {
    fields.push({ name: "view", value: input.view });
  }

  if (input.includeEmployeeIds !== false) {
    fields.push(
      ...normalizeMultiSelectValue(input.employeeIds).map((value) => ({
        name: "employeeIds",
        value,
      })),
    );
  }

  if (input.includePaymentMonths !== false) {
    fields.push(
      ...normalizeMultiSelectValue(input.paymentMonths).map((value) => ({
        name: "paymentMonths",
        value,
      })),
    );
  }

  if (input.includeAllEmployees !== false && input.allEmployees) {
    fields.push({ name: "allEmployees", value: "1" });
  }

  if (input.includeAllMonths !== false && input.allMonths) {
    fields.push({ name: "allMonths", value: "1" });
  }

  if (input.includeEmployeeColumns !== false) {
    const employeeColumns = normalizeMultiSelectValue(input.employeeColumns);
    fields.push(
      ...(input.employeeColumns !== undefined && employeeColumns.length === 0
        ? [{ name: "employeeColumns", value: "__none__" }]
        : employeeColumns.map((value) => ({
        name: "employeeColumns",
        value,
          }))),
    );
  }

  if (input.includePeriodColumns !== false) {
    const periodColumns = normalizeMultiSelectValue(input.periodColumns);
    fields.push(
      ...(input.periodColumns !== undefined && periodColumns.length === 0
        ? [{ name: "periodColumns", value: "__none__" }]
        : periodColumns.map((value) => ({
        name: "periodColumns",
        value,
          }))),
    );
  }

  return fields;
}
