import type {
  PnEmployeeEditableRow,
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
  advanceOverrideInrCents?: number | null;
  reimbursementUsdCents: number;
  reimbursementLabelsText: string;
  appraisalAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
  effectiveDollarInwardUsdCents: number;
  cashoutUsdInrRate: number;
  paidUsdInrRate: number;
  monthlyPaidInrCents: number;
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
  isSalaryOnly?: boolean;
};

export type PnSalaryOnlySourceInput = {
  id: string;
  employeeId: string;
  employeeName: string;
  paymentMonth: string;
  daysWorked: number;
  daysInMonth: number;
  paidUsdInrRate: number;
  monthlyPaidInrCents: number;
  salaryPaidInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
  actualPaidInrCents: number;
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

export function buildPnSalaryOnlySourceRows(input: {
  salaryRows: PnSalaryOnlySourceInput[];
  existingEmployeeMonthKeys: Set<string>;
}): PnEditableSourceRow[] {
  return input.salaryRows.flatMap((salary) => {
    if (
      input.existingEmployeeMonthKeys.has(
        `${salary.employeeId}|${salary.paymentMonth}`,
      )
    ) {
      return [];
    }

    const [yearPart, monthPart] = salary.paymentMonth.split("-");
    const year = Number.parseInt(yearPart ?? "", 10);
    const month = Number.parseInt(monthPart ?? "", 10);
    const totalPayoutInrCents =
      salary.salaryPaidInrCents + salary.pfInrCents + salary.tdsInrCents;
    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      month < 1 ||
      month > 12 ||
      totalPayoutInrCents <= 0
    ) {
      return [];
    }

    return [
      {
        rowId: `salary_only:${salary.id}`,
        invoiceId: "",
        invoiceNumber: "Salary only",
        employeeId: salary.employeeId,
        employeeName: salary.employeeName,
        year,
        month,
        daysWorked: salary.daysWorked,
        daysInMonth: salary.daysInMonth,
        dollarInwardUsdCents: 0,
        baseDollarInwardUsdCents: 0,
        onboardingAdvanceUsdCents: 0,
        reimbursementUsdCents: 0,
        reimbursementLabelsText: "",
        appraisalAdvanceUsdCents: 0,
        offboardingDeductionUsdCents: 0,
        effectiveDollarInwardUsdCents: 0,
        cashoutUsdInrRate: 0,
        paidUsdInrRate: salary.paidUsdInrRate,
        monthlyPaidInrCents: salary.monthlyPaidInrCents,
        pfInrCents: salary.pfInrCents,
        tdsInrCents: salary.tdsInrCents,
        actualPaidInrCents: salary.actualPaidInrCents,
        fxCommissionInrCents: 0,
        totalCommissionUsdCents: 0,
        commissionEarnedInrCents: -totalPayoutInrCents,
        cashInInrCents: 0,
        salaryPaidInrCents: salary.salaryPaidInrCents,
        grossEarningsInrCents: -totalPayoutInrCents,
        netProfitInrCents: -totalPayoutInrCents,
        isSecurityDepositMonth: false,
        isSalaryOnly: true,
      },
    ];
  });
}

function weightedPeriodRate(
  rows: Array<
    Pick<
      PnSourceRow,
      "effectiveDollarInwardUsdCents" | "cashoutUsdInrRate" | "paidUsdInrRate"
    >
  >,
  rateKey: "cashoutUsdInrRate" | "paidUsdInrRate",
) {
  const eligibleRows = rateKey === "paidUsdInrRate"
    ? rows.filter((row) => row.paidUsdInrRate > 0)
    : rows;
  const totalWeight = eligibleRows.reduce(
    (sum, row) => sum + row.effectiveDollarInwardUsdCents,
    0,
  );
  if (totalWeight <= 0) return 0;
  return (
    eligibleRows.reduce(
      (sum, row) => sum + row[rateKey] * row.effectiveDollarInwardUsdCents,
      0,
    ) / totalWeight
  );
}

export function mergePnPeriodRows(rows: PnPeriodRow[]): PnPeriodRow[] {
  const grouped = new Map<string, PnPeriodRow[]>();
  for (const row of rows) {
    const key = row.fiscalLabel ?? `${row.year}-${String(row.month ?? 0).padStart(2, "0")}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  return [...grouped.values()]
    .map((bucket) => {
      const first = bucket[0]!;
      const sum = (pick: (row: PnPeriodRow) => number) =>
        bucket.reduce((total, row) => total + pick(row), 0);
      const reimbursementLabelsText = [
        ...new Set(
          bucket
            .flatMap((row) => row.reimbursementLabelsText.split(","))
            .map((label) => label.trim())
            .filter(Boolean),
        ),
      ].join(", ");

      return {
        year: first.year,
        month: first.month,
        fiscalLabel: first.fiscalLabel,
        dollarInwardUsdCents: sum((row) => row.dollarInwardUsdCents),
        onboardingAdvanceUsdCents: sum((row) => row.onboardingAdvanceUsdCents),
        advancesInrCents: sum((row) => row.advancesInrCents),
        reimbursementUsdCents: sum((row) => row.reimbursementUsdCents),
        reimbursementLabelsText,
        reimbursementInrCents: sum((row) => row.reimbursementInrCents),
        appraisalAdvanceUsdCents: sum((row) => row.appraisalAdvanceUsdCents),
        appraisalAdvanceInrCents: sum((row) => row.appraisalAdvanceInrCents),
        offboardingDeductionUsdCents: sum((row) => row.offboardingDeductionUsdCents),
        effectiveDollarInwardUsdCents: sum((row) => row.effectiveDollarInwardUsdCents),
        cashoutUsdInrRate: weightedPeriodRate(bucket, "cashoutUsdInrRate"),
        cashInInrCents: sum((row) => row.cashInInrCents),
        paidUsdInrRate: weightedPeriodRate(bucket, "paidUsdInrRate"),
        monthlyPaidInrCents: sum((row) => row.monthlyPaidInrCents),
        pfInrCents: sum((row) => row.pfInrCents),
        tdsInrCents: sum((row) => row.tdsInrCents),
        actualPaidInrCents: sum((row) => row.actualPaidInrCents),
        salaryPaidInrCents: sum((row) => row.salaryPaidInrCents),
        fxCommissionInrCents: sum((row) => row.fxCommissionInrCents),
        totalCommissionUsdCents: sum((row) => row.totalCommissionUsdCents),
        commissionEarnedInrCents: sum((row) => row.commissionEarnedInrCents),
        grossEarningsInrCents: sum((row) => row.grossEarningsInrCents),
        expensesInrCents: sum((row) => row.expensesInrCents),
        companyReimbursementUsdCents: sum((row) => row.companyReimbursementUsdCents),
        companyReimbursementInrCents: sum((row) => row.companyReimbursementInrCents),
        netPlInrCents: sum((row) => row.netPlInrCents),
      };
    })
    .sort(
      (left, right) =>
        left.year * 100 + (left.month ?? 0) - (right.year * 100 + (right.month ?? 0)),
    );
}

const sumBy = (rows: PnSourceRow[], key: keyof PnSourceRow) =>
  rows.reduce((sum, row) => sum + Number(row[key]), 0);

const sumEditableBy = (rows: PnEditableSourceRow[], key: keyof PnEditableSourceRow) =>
  rows.reduce((sum, row) => sum + Number(row[key]), 0);

export function calculatePnPeriodNetPlInrCents(
  row: Pick<
    PnPeriodRow,
    | "grossEarningsInrCents"
    | "companyReimbursementInrCents"
    | "expensesInrCents"
    | "advancesInrCents"
  >,
  options: {
    includeExpenses?: boolean;
    includeAdvances?: boolean;
    includeReimbursements?: boolean;
  } = {},
) {
  const includeExpenses = options.includeExpenses ?? true;
  const includeAdvances = options.includeAdvances ?? true;
  const includeReimbursements = options.includeReimbursements ?? true;
  return (
    row.grossEarningsInrCents +
    (includeReimbursements ? row.companyReimbursementInrCents : 0) -
    (includeExpenses ? row.expensesInrCents : 0) -
    (includeAdvances ? row.advancesInrCents : 0)
  );
}

export function calculatePnEmployeeAdvanceInrCents(
  row: Pick<
    PnEmployeeEditableRow,
    "onboardingAdvanceUsdCents" | "cashoutUsdInrRate" | "advanceOverrideInrCents"
  >,
) {
  if (row.advanceOverrideInrCents != null) {
    return row.advanceOverrideInrCents;
  }
  return Math.round(row.onboardingAdvanceUsdCents * row.cashoutUsdInrRate);
}

export function calculatePnEmployeeNetPlInrCents(
  row: Pick<
    PnEmployeeEditableRow,
    | "onboardingAdvanceUsdCents"
    | "advanceOverrideInrCents"
    | "cashoutUsdInrRate"
    | "cashInInrCents"
    | "salaryPaidInrCents"
    | "pfInrCents"
    | "tdsInrCents"
  >,
  options: { includeAdvances?: boolean } = {},
) {
  return (
    row.cashInInrCents -
    row.salaryPaidInrCents -
    row.pfInrCents -
    row.tdsInrCents -
    ((options.includeAdvances ?? true) ? calculatePnEmployeeAdvanceInrCents(row) : 0)
  );
}

export function sumPnPeriodNetPlInrCents(
  rows: Array<
    Pick<
      PnPeriodRow,
      | "grossEarningsInrCents"
      | "companyReimbursementInrCents"
      | "expensesInrCents"
      | "advancesInrCents"
    >
  >,
  options: {
    includeExpenses?: boolean;
    includeAdvances?: boolean;
    includeReimbursements?: boolean;
  } = {},
) {
  return rows.reduce(
    (sum, row) => sum + calculatePnPeriodNetPlInrCents(row, options),
    0,
  );
}

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
    cashoutUsdInrRate: averageRate(rows, "cashoutUsdInrRate"),
    paidUsdInrRate: averageRate(rows, "paidUsdInrRate"),
    monthlyPaidInrCents: sumBy(rows, "monthlyPaidInrCents"),
    pfInrCents: sumBy(rows, "pfInrCents"),
    tdsInrCents: sumBy(rows, "tdsInrCents"),
    actualPaidInrCents: sumBy(rows, "actualPaidInrCents"),
    salaryPaidInrCents: sumBy(rows, "salaryPaidInrCents"),
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
      cashoutUsdInrRate: last.cashoutUsdInrRate,
      paidUsdInrRate: last.paidUsdInrRate,
      monthlyPaidInrCents: sumEditableBy(bucket, "monthlyPaidInrCents"),
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
      advanceOverrideInrCents: row.advanceOverrideInrCents ?? null,
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
      cashoutUsdInrRate: row.cashoutUsdInrRate,
      paidUsdInrRate: row.paidUsdInrRate,
      monthlyPaidInrCents: row.monthlyPaidInrCents,
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
      isSalaryOnly: row.isSalaryOnly ?? false,
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
      const advancesInrCents = bucket.reduce(
        (sum, row) => sum + calculatePnEmployeeAdvanceInrCents(row),
        0,
      );
      const employeeReimbursementUsdCents = sumBy(bucket, "reimbursementUsdCents");
      const employeeReimbursementInrCents = bucket.reduce(
        (sum, row) => sum + Math.round(row.reimbursementUsdCents * row.cashoutUsdInrRate),
        0,
      );
      const companyLevelReimbursementUsdCents =
        input.companyLevelReimbursementUsdByKey.get(key) ?? 0;
      const companyLevelReimbursementInrCents = Math.round(
        (companyLevelReimbursementUsdCents / 100) *
          weightedPeriodRate(bucket, "cashoutUsdInrRate") *
          100,
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
      const cashoutUsdInrRate = weightedPeriodRate(bucket, "cashoutUsdInrRate");
      const paidUsdInrRate = weightedPeriodRate(bucket, "paidUsdInrRate");
      const salaryPaidInrCents = sumBy(bucket, "salaryPaidInrCents");

      return {
        year: periodYear,
        month,
        fiscalLabel,
        dollarInwardUsdCents: sumBy(bucket, "dollarInwardUsdCents"),
        onboardingAdvanceUsdCents: sumBy(bucket, "onboardingAdvanceUsdCents"),
        advancesInrCents,
        reimbursementUsdCents,
        reimbursementLabelsText: [...reimbursementLabels].join(", "),
        reimbursementInrCents,
        appraisalAdvanceUsdCents,
        appraisalAdvanceInrCents,
        offboardingDeductionUsdCents: sumBy(bucket, "offboardingDeductionUsdCents"),
        effectiveDollarInwardUsdCents: sumBy(bucket, "effectiveDollarInwardUsdCents"),
        cashoutUsdInrRate,
        cashInInrCents: sumBy(bucket, "cashInInrCents"),
        paidUsdInrRate,
        monthlyPaidInrCents: sumBy(bucket, "monthlyPaidInrCents"),
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
        netPlInrCents: calculatePnPeriodNetPlInrCents({
          grossEarningsInrCents,
          companyReimbursementInrCents: companyLevelReimbursementInrCents,
          expensesInrCents,
          advancesInrCents,
        }),
      };
    })
    .sort((a, b) => {
      const left = a.year * 100 + (a.month ?? 0);
      const right = b.year * 100 + (b.month ?? 0);
      return left - right;
    });
}
