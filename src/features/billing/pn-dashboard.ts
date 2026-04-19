import type {
  PnEmployeeEditableSection,
  PnEmployeeMonthRow,
  PnEmployeeSection,
  PnPeriodRow,
  PnPeriodType,
} from "./types";

export type PnSourceRow = {
  employeeId: string;
  employeeName: string;
  year: number;
  month: number;
  daysWorked: number;
  daysInMonth: number;
  dollarInwardUsdCents: number;
  onboardingAdvanceUsdCents: number;
  reimbursementUsdCents: number;
  reimbursementLabelsText: string;
  appraisalAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
  effectiveDollarInwardUsdCents: number;
  employeeMonthlyUsdCents: number;
  cashoutUsdInrRate: number;
  paidUsdInrRate: number;
  pfInrCents: number;
  tdsInrCents: number;
  actualPaidInrCents: number;
  fxCommissionInrCents: number;
  totalCommissionUsdCents: number;
  commissionEarnedInrCents: number;
  cashInInrCents: number;
  salaryPaidInrCents: number;
  netProfitInrCents: number;
};

export type PnEditableSourceRow = PnSourceRow & {
  rowId: string;
  invoiceId: string;
  invoiceNumber: string;
  baseDollarInwardUsdCents: number;
  onboardingAdvanceUsdCents: number;
  reimbursementUsdCents: number;
  reimbursementLabelsText: string;
  appraisalAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
  effectiveDollarInwardUsdCents: number;
  cashInInrCents: number;
  salaryPaidInrCents: number;
  grossEarningsInrCents: number;
  netProfitInrCents: number;
  isSecurityDepositMonth?: boolean;
};

const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;
const fiscalYearKey = (year: number, month: number) =>
  month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
const fiscalYearLabel = (year: number, month: number) => {
  const startYear = month >= 4 ? year : year - 1;
  return `Apr ${startYear}–Mar ${startYear + 1}`;
};

const averageRate = (rows: PnSourceRow[], key: "cashoutUsdInrRate" | "paidUsdInrRate") => {
  if (rows.length === 0) return 0;
  const positive = rows.map((row) => row[key]).filter((value) => value > 0);
  if (positive.length === 0) return 0;
  return positive.reduce((sum, value) => sum + value, 0) / positive.length;
};

const sumBy = (rows: PnSourceRow[], key: keyof PnSourceRow) =>
  rows.reduce((sum, row) => sum + Number(row[key]), 0);

const sumEditableBy = (rows: PnEditableSourceRow[], key: keyof PnEditableSourceRow) =>
  rows.reduce((sum, row) => sum + Number(row[key]), 0);

const toEmployeeMonthRow = (rows: PnSourceRow[]): PnEmployeeMonthRow => {
  const first = rows[0];
  const fxCommissionInrCents = sumBy(rows, "fxCommissionInrCents");
  const commissionEarnedInrCents = sumBy(rows, "commissionEarnedInrCents");
  return {
    year: first.year,
    month: first.month,
    daysWorked: sumBy(rows, "daysWorked"),
    daysInMonth: sumBy(rows, "daysInMonth"),
    dollarInwardUsdCents: sumBy(rows, "dollarInwardUsdCents"),
    reimbursementUsdCents: sumBy(rows, "reimbursementUsdCents"),
    reimbursementLabelsText: rows
      .map((row) => row.reimbursementLabelsText)
      .filter(Boolean)
      .join(", "),
    reimbursementInrCents: rows.reduce(
      (sum, row) => sum + Math.round(row.reimbursementUsdCents * row.cashoutUsdInrRate),
      0,
    ),
    appraisalAdvanceUsdCents: sumBy(rows, "appraisalAdvanceUsdCents"),
    appraisalAdvanceInrCents: rows.reduce(
      (sum, row) => sum + Math.round(row.appraisalAdvanceUsdCents * row.cashoutUsdInrRate),
      0,
    ),
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

const mergeEditableRowsByMonth = (rows: PnEditableSourceRow[]) => {
  const grouped = new Map<string, PnEditableSourceRow[]>();
  for (const row of rows) {
    const key = `${row.employeeId}:${monthKey(row.year, row.month)}`;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  return [...grouped.values()].map((bucket) => {
    const last = bucket[bucket.length - 1];
    const labels = new Set<string>();
    const invoiceNumbers = new Set<string>();

    for (const row of bucket) {
      if (row.reimbursementLabelsText) {
        row.reimbursementLabelsText
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean)
          .forEach((label) => labels.add(label));
      }
      if (row.invoiceNumber) {
        row.invoiceNumber
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
          .forEach((value) => invoiceNumbers.add(value));
      }
    }

    const grossEarningsInrCents = sumEditableBy(bucket, "grossEarningsInrCents");

    return {
      ...last,
      rowId: last.rowId,
      invoiceId: last.invoiceId,
      invoiceNumber: [...invoiceNumbers].sort().join(", "),
      daysWorked: sumEditableBy(bucket, "daysWorked"),
      daysInMonth: last.daysInMonth,
      baseDollarInwardUsdCents: sumEditableBy(bucket, "baseDollarInwardUsdCents"),
      onboardingAdvanceUsdCents: sumEditableBy(bucket, "onboardingAdvanceUsdCents"),
      reimbursementUsdCents: sumEditableBy(bucket, "reimbursementUsdCents"),
      reimbursementLabelsText: [...labels].join(", "),
      appraisalAdvanceUsdCents: sumEditableBy(bucket, "appraisalAdvanceUsdCents"),
      offboardingDeductionUsdCents: sumEditableBy(bucket, "offboardingDeductionUsdCents"),
      effectiveDollarInwardUsdCents: sumEditableBy(
        bucket,
        "effectiveDollarInwardUsdCents",
      ),
      cashInInrCents: sumEditableBy(bucket, "cashInInrCents"),
      employeeMonthlyUsdCents: sumEditableBy(bucket, "employeeMonthlyUsdCents"),
      cashoutUsdInrRate: last.cashoutUsdInrRate,
      paidUsdInrRate: last.paidUsdInrRate,
      salaryPaidInrCents: sumEditableBy(bucket, "salaryPaidInrCents"),
      pfInrCents: sumEditableBy(bucket, "pfInrCents"),
      tdsInrCents: sumEditableBy(bucket, "tdsInrCents"),
      actualPaidInrCents: sumEditableBy(bucket, "actualPaidInrCents"),
      fxCommissionInrCents: sumEditableBy(bucket, "fxCommissionInrCents"),
      totalCommissionUsdCents: sumEditableBy(bucket, "totalCommissionUsdCents"),
      commissionEarnedInrCents: sumEditableBy(bucket, "commissionEarnedInrCents"),
      grossEarningsInrCents,
      netProfitInrCents: sumEditableBy(bucket, "netProfitInrCents"),
      isSecurityDepositMonth: last.isSecurityDepositMonth,
    };
  });
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

export function buildPnEmployeeEditableSections(
  rows: PnEditableSourceRow[],
): PnEmployeeEditableSection[] {
  const grouped = new Map<string, PnEmployeeEditableSection>();

  const mergedRows = mergeEditableRowsByMonth(rows);

  for (const row of mergedRows) {
    const existing =
      grouped.get(row.employeeId) ??
      {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        rows: [],
        totalGrossEarningsInrCents: 0,
        totalNetProfitInrCents: 0,
      };

    existing.rows.push({
      payoutId: row.rowId,
      invoiceId: row.invoiceId,
      invoiceNumber: row.invoiceNumber,
      year: row.year,
      month: row.month,
      daysWorked: row.daysWorked,
      daysInMonth: row.daysInMonth,
      dollarInwardUsdCents: row.baseDollarInwardUsdCents,
      baseDollarInwardUsdCents: row.baseDollarInwardUsdCents,
      onboardingAdvanceUsdCents: row.onboardingAdvanceUsdCents,
      reimbursementUsdCents: row.reimbursementUsdCents,
      reimbursementLabelsText: row.reimbursementLabelsText,
      reimbursementInrCents: Math.round(row.reimbursementUsdCents * row.cashoutUsdInrRate),
      appraisalAdvanceUsdCents: row.appraisalAdvanceUsdCents,
      appraisalAdvanceInrCents: Math.round(
        row.appraisalAdvanceUsdCents * row.cashoutUsdInrRate,
      ),
      offboardingDeductionUsdCents: row.offboardingDeductionUsdCents,
      effectiveDollarInwardUsdCents: row.effectiveDollarInwardUsdCents,
      cashInInrCents: row.cashInInrCents,
      employeeMonthlyUsdCents: row.employeeMonthlyUsdCents,
      cashoutUsdInrRate: row.cashoutUsdInrRate,
      paidUsdInrRate: row.paidUsdInrRate,
      salaryPaidInrCents: row.salaryPaidInrCents,
      pfInrCents: row.pfInrCents,
      tdsInrCents: row.tdsInrCents,
      actualPaidInrCents: row.actualPaidInrCents,
      fxCommissionInrCents: row.fxCommissionInrCents,
      totalCommissionUsdCents: row.totalCommissionUsdCents,
      commissionEarnedInrCents: row.commissionEarnedInrCents,
      grossEarningsInrCents: row.grossEarningsInrCents,
      netProfitInrCents: row.netProfitInrCents,
      isSecurityDepositMonth: row.isSecurityDepositMonth ?? false,
    });
    existing.totalGrossEarningsInrCents += row.grossEarningsInrCents;
    existing.totalNetProfitInrCents += row.netProfitInrCents;

    grouped.set(row.employeeId, existing);
  }

  return [...grouped.values()]
    .map((section) => ({
      ...section,
      rows: section.rows.sort((a, b) => {
        const left = a.year * 100 + a.month;
        const right = b.year * 100 + b.month;
        if (left !== right) return left - right;
        return a.invoiceNumber.localeCompare(b.invoiceNumber);
      }),
    }))
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export function buildPnPeriodRows(input: {
  rows: PnSourceRow[];
  periodType: PnPeriodType;
  expenseByKey: Map<string, number>;
  companyLevelReimbursementUsdByKey: Map<string, number>;
}): PnPeriodRow[] {
  const grouped = new Map<string, PnSourceRow[]>();
  for (const row of input.rows) {
    const key =
      input.periodType === "monthly"
        ? monthKey(row.year, row.month)
        : fiscalYearKey(row.year, row.month);
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  return [...grouped.entries()]
    .map(([key, bucket]) => {
      const first = bucket[0];
      const month = input.periodType === "monthly" ? first.month : undefined;
      const fiscalLabel =
        input.periodType === "yearly"
          ? fiscalYearLabel(first.year, first.month)
          : undefined;
      const periodYear =
        input.periodType === "yearly"
          ? first.month >= 4
            ? first.year
            : first.year - 1
          : first.year;
      const fxCommissionInrCents = sumBy(bucket, "fxCommissionInrCents");
      const commissionEarnedInrCents = sumBy(bucket, "commissionEarnedInrCents");
      const grossEarningsInrCents = fxCommissionInrCents + commissionEarnedInrCents;
      const expensesInrCents = input.expenseByKey.get(key) ?? 0;
      const netProfitInrCents = sumBy(bucket, "netProfitInrCents");
      const employeeReimbursementUsdCents = sumBy(bucket, "reimbursementUsdCents");
      const employeeReimbursementInrCents = bucket.reduce(
        (sum, row) => sum + Math.round(row.reimbursementUsdCents * row.cashoutUsdInrRate),
        0,
      );
      const companyLevelReimbursementUsdCents =
        input.companyLevelReimbursementUsdByKey.get(key) ?? 0;
      const companyLevelReimbursementInrCents = Math.round(
        (companyLevelReimbursementUsdCents / 100) * averageRate(bucket, "cashoutUsdInrRate") * 100,
      );
      const appraisalAdvanceUsdCents = sumBy(bucket, "appraisalAdvanceUsdCents");
      const appraisalAdvanceInrCents = bucket.reduce(
        (sum, row) => sum + Math.round(row.appraisalAdvanceUsdCents * row.cashoutUsdInrRate),
        0,
      );
      const reimbursementUsdCents =
        employeeReimbursementUsdCents + companyLevelReimbursementUsdCents;
      const reimbursementInrCents =
        employeeReimbursementInrCents + companyLevelReimbursementInrCents;
      const reimbursementLabels = new Set<string>();
      for (const row of bucket) {
        if (!row.reimbursementLabelsText) continue;
        row.reimbursementLabelsText
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean)
          .forEach((label) => reimbursementLabels.add(label));
      }
      const cashoutUsdInrRate = averageRate(bucket, "cashoutUsdInrRate");
      const paidUsdInrRate = averageRate(bucket, "paidUsdInrRate");
      const monthlyPaidInrCents = bucket.reduce(
        (sum, row) => sum + Math.round(row.employeeMonthlyUsdCents * row.paidUsdInrRate),
        0,
      );
      const salaryPaidInrCents =
        sumBy(bucket, "actualPaidInrCents") -
        sumBy(bucket, "pfInrCents") -
        sumBy(bucket, "tdsInrCents");

      return {
        year: periodYear,
        month,
        fiscalLabel,
        dollarInwardUsdCents: sumBy(bucket, "dollarInwardUsdCents"),
        onboardingAdvanceUsdCents: sumBy(bucket, "onboardingAdvanceUsdCents"),
        reimbursementUsdCents,
        reimbursementLabelsText: [...reimbursementLabels].join(", "),
        reimbursementInrCents,
        appraisalAdvanceUsdCents,
        appraisalAdvanceInrCents,
        offboardingDeductionUsdCents: sumBy(bucket, "offboardingDeductionUsdCents"),
        effectiveDollarInwardUsdCents: sumBy(bucket, "effectiveDollarInwardUsdCents"),
        cashoutUsdInrRate,
        cashInInrCents: sumBy(bucket, "cashInInrCents"),
        employeeMonthlyUsdCents: sumBy(bucket, "employeeMonthlyUsdCents"),
        paidUsdInrRate,
        monthlyPaidInrCents,
        pfInrCents: sumBy(bucket, "pfInrCents"),
        tdsInrCents: sumBy(bucket, "tdsInrCents"),
        actualPaidInrCents: sumBy(bucket, "actualPaidInrCents"),
        salaryPaidInrCents,
        fxCommissionInrCents,
        totalCommissionUsdCents: sumBy(bucket, "totalCommissionUsdCents"),
        commissionEarnedInrCents,
        grossEarningsInrCents,
        expensesInrCents,
        companyReimbursementUsdCents: companyLevelReimbursementUsdCents,
        companyReimbursementInrCents: companyLevelReimbursementInrCents,
        netPlInrCents: netProfitInrCents,
      };
    })
    .sort((a, b) => {
      const left = a.year * 100 + (a.month ?? 0);
      const right = b.year * 100 + (b.month ?? 0);
      return left - right;
    });
}
