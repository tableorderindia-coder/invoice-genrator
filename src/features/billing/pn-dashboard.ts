export type PnSourceRow = {
  employeeId: string;
  employeeName: string;
  year: number;
  month: number;
  dollarInwardUsdCents: number;
  employeeMonthlyUsdCents: number;
  cashoutUsdInrRate: number;
  paidUsdInrRate: number;
  pfInrCents: number;
  tdsInrCents: number;
  actualPaidInrCents: number;
  fxCommissionInrCents: number;
  totalCommissionUsdCents: number;
  commissionEarnedInrCents: number;
};

export type PnEmployeeMonthRow = {
  year: number;
  month: number;
  dollarInwardUsdCents: number;
  employeeMonthlyUsdCents: number;
  cashoutUsdInrRate: number;
  paidUsdInrRate: number;
  pfInrCents: number;
  tdsInrCents: number;
  actualPaidInrCents: number;
  fxCommissionInrCents: number;
  totalCommissionUsdCents: number;
  commissionEarnedInrCents: number;
  grossEarningsInrCents: number;
};

export type PnEmployeeSection = {
  employeeId: string;
  employeeName: string;
  rows: PnEmployeeMonthRow[];
  totalGrossEarningsInrCents: number;
};

export type PnPeriodType = "monthly" | "yearly";

export type PnPeriodRow = {
  year: number;
  month?: number;
  dollarInwardUsdCents: number;
  employeeMonthlyUsdCents: number;
  pfInrCents: number;
  tdsInrCents: number;
  actualPaidInrCents: number;
  fxCommissionInrCents: number;
  totalCommissionUsdCents: number;
  commissionEarnedInrCents: number;
  grossEarningsInrCents: number;
  expensesInrCents: number;
  netPlInrCents: number;
};

const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;
const yearKey = (year: number) => `${year}`;

const averageRate = (rows: PnSourceRow[], key: "cashoutUsdInrRate" | "paidUsdInrRate") => {
  if (rows.length === 0) return 0;
  const positive = rows.map((row) => row[key]).filter((value) => value > 0);
  if (positive.length === 0) return 0;
  return positive.reduce((sum, value) => sum + value, 0) / positive.length;
};

const sumBy = (rows: PnSourceRow[], key: keyof PnSourceRow) =>
  rows.reduce((sum, row) => sum + Number(row[key]), 0);

const toEmployeeMonthRow = (rows: PnSourceRow[]): PnEmployeeMonthRow => {
  const first = rows[0];
  const fxCommissionInrCents = sumBy(rows, "fxCommissionInrCents");
  const commissionEarnedInrCents = sumBy(rows, "commissionEarnedInrCents");
  return {
    year: first.year,
    month: first.month,
    dollarInwardUsdCents: sumBy(rows, "dollarInwardUsdCents"),
    employeeMonthlyUsdCents: sumBy(rows, "employeeMonthlyUsdCents"),
    cashoutUsdInrRate: averageRate(rows, "cashoutUsdInrRate"),
    paidUsdInrRate: averageRate(rows, "paidUsdInrRate"),
    pfInrCents: sumBy(rows, "pfInrCents"),
    tdsInrCents: sumBy(rows, "tdsInrCents"),
    actualPaidInrCents: sumBy(rows, "actualPaidInrCents"),
    fxCommissionInrCents,
    totalCommissionUsdCents: sumBy(rows, "totalCommissionUsdCents"),
    commissionEarnedInrCents,
    grossEarningsInrCents: fxCommissionInrCents + commissionEarnedInrCents,
  };
};

export function buildPnEmployeeSections(rows: PnSourceRow[]): PnEmployeeSection[] {
  const employeeMap = new Map<string, PnSourceRow[]>();
  for (const row of rows) {
    const list = employeeMap.get(row.employeeId) ?? [];
    list.push(row);
    employeeMap.set(row.employeeId, list);
  }

  const sections: PnEmployeeSection[] = [];
  for (const [employeeId, employeeRows] of employeeMap.entries()) {
    const byMonth = new Map<string, PnSourceRow[]>();
    for (const row of employeeRows) {
      const key = monthKey(row.year, row.month);
      const list = byMonth.get(key) ?? [];
      list.push(row);
      byMonth.set(key, list);
    }

    const monthRows = [...byMonth.values()]
      .map((bucket) => toEmployeeMonthRow(bucket))
      .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month));

    sections.push({
      employeeId,
      employeeName: employeeRows[0].employeeName,
      rows: monthRows,
      totalGrossEarningsInrCents: monthRows.reduce(
        (sum, monthRow) => sum + monthRow.grossEarningsInrCents,
        0,
      ),
    });
  }

  return sections.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export function buildPnPeriodRows(input: {
  rows: PnSourceRow[];
  periodType: PnPeriodType;
  expenseByKey: Map<string, number>;
}): PnPeriodRow[] {
  const grouped = new Map<string, PnSourceRow[]>();
  for (const row of input.rows) {
    const key =
      input.periodType === "monthly" ? monthKey(row.year, row.month) : yearKey(row.year);
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  return [...grouped.entries()]
    .map(([key, bucket]) => {
      const first = bucket[0];
      const month = input.periodType === "monthly" ? first.month : undefined;
      const fxCommissionInrCents = sumBy(bucket, "fxCommissionInrCents");
      const commissionEarnedInrCents = sumBy(bucket, "commissionEarnedInrCents");
      const grossEarningsInrCents = fxCommissionInrCents + commissionEarnedInrCents;
      const expensesInrCents = input.expenseByKey.get(key) ?? 0;

      return {
        year: first.year,
        month,
        dollarInwardUsdCents: sumBy(bucket, "dollarInwardUsdCents"),
        employeeMonthlyUsdCents: sumBy(bucket, "employeeMonthlyUsdCents"),
        pfInrCents: sumBy(bucket, "pfInrCents"),
        tdsInrCents: sumBy(bucket, "tdsInrCents"),
        actualPaidInrCents: sumBy(bucket, "actualPaidInrCents"),
        fxCommissionInrCents,
        totalCommissionUsdCents: sumBy(bucket, "totalCommissionUsdCents"),
        commissionEarnedInrCents,
        grossEarningsInrCents,
        expensesInrCents,
        netPlInrCents: grossEarningsInrCents - expensesInrCents,
      };
    })
    .sort((a, b) => {
      const left = a.year * 100 + (a.month ?? 0);
      const right = b.year * 100 + (b.month ?? 0);
      return left - right;
    });
}
