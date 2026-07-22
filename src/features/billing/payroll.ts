import type { Employee } from "./types";

export type PayrollStatus = "draft" | "in_review" | "verified";

export type PayrollSource = "employee-default" | "monthly-payroll";

export type MonthlyPayrollPayment = {
  id?: string;
  employeeId: string;
  companyId: string;
  month: string;
  employeeNameSnapshot: string;
  paidUsdInrRate: number;
  basicInrCents: number;
  specialAllowanceInrCents: number;
  insuranceInrCents: number;
  bonusInrCents: number;
  monthlyPaidInrCents: number;
  daysWorked: number;
  daysInMonth: number;
  actualPaidInrCents: number;
  salaryPaidInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
  paidStatus: boolean;
  paidDate?: string;
  status: PayrollStatus;
  notes?: string;
  overrideNote?: string;
  updatedAt?: string;
};

export type MonthlyPayrollRow = {
  id?: string;
  employeeId: string;
  companyId: string;
  month: string;
  employeeName: string;
  source: PayrollSource;
  paidUsdInrRate: number;
  basicInrCents: number;
  specialAllowanceInrCents: number;
  insuranceInrCents: number;
  bonusInrCents: number;
  monthlyPaidInrCents: number;
  daysWorked: number;
  daysInMonth: number;
  actualPaidInrCents: number;
  salaryPaidInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
  paidStatus: boolean;
  paidDate?: string;
  status: PayrollStatus;
  notes?: string;
  overrideNote?: string;
  updatedAt?: string;
  employeeIsActive?: boolean;
};

export type MonthlyPayrollSummary = {
  employeeCount: number;
  monthlyPaidInrCents: number;
  actualPaidInrCents: number;
  salaryPaidInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
  netPaidInrCents: number;
};

export function normalizePayrollMonthKey(input: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(input.trim());
  if (!match) {
    throw new Error("Payroll month is invalid.");
  }

  const month = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Payroll month is invalid.");
  }

  return `${match[1]}-${match[2]}`;
}

export function getDaysInPayrollMonth(input: string) {
  const monthKey = normalizePayrollMonthKey(input);
  const [yearText, monthText] = monthKey.split("-");
  const year = Number.parseInt(yearText ?? "", 10);
  const month = Number.parseInt(monthText ?? "", 10);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function normalizePayrollDaysWorked(input: number, daysInMonth: number) {
  if (!Number.isFinite(input) || input < 0) {
    return 0;
  }
  const rounded = Math.round(input * 100) / 100;
  if (!Number.isFinite(daysInMonth) || daysInMonth <= 0) {
    return rounded;
  }
  return Math.min(rounded, daysInMonth);
}

function nonNegativeCents(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value ?? 0));
}

export function calculateMonthlyPaidInrCents(input: {
  basicInrCents: number;
  specialAllowanceInrCents: number;
  insuranceInrCents: number;
  bonusInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
}) {
  return (
    nonNegativeCents(input.basicInrCents) +
    nonNegativeCents(input.specialAllowanceInrCents) +
    nonNegativeCents(input.insuranceInrCents) +
    nonNegativeCents(input.bonusInrCents) +
    nonNegativeCents(input.pfInrCents) +
    nonNegativeCents(input.tdsInrCents)
  );
}

export function calculateActualPaidInrCents(input: {
  monthlyPaidInrCents: number;
  daysWorked: number;
  daysInMonth: number;
}) {
  const monthlyPaidInrCents = Math.max(0, Math.round(input.monthlyPaidInrCents));
  if (!Number.isFinite(input.daysInMonth) || input.daysInMonth <= 0) {
    return monthlyPaidInrCents;
  }
  const daysWorked = normalizePayrollDaysWorked(input.daysWorked, input.daysInMonth);
  return Math.round((monthlyPaidInrCents * daysWorked) / input.daysInMonth);
}

export function calculateSalaryPaidInrCents(input: {
  actualPaidInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
}) {
  const salaryPaidInrCents =
    nonNegativeCents(input.actualPaidInrCents) -
    nonNegativeCents(input.pfInrCents) -
    nonNegativeCents(input.tdsInrCents);
  if (salaryPaidInrCents < 0) {
    throw new Error("Salary paid cannot be negative.");
  }
  return salaryPaidInrCents;
}

function buildFallbackBasicInrCents(input: {
  monthlyPaidInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
}) {
  return Math.max(
    0,
    nonNegativeCents(input.monthlyPaidInrCents) -
      nonNegativeCents(input.pfInrCents) -
      nonNegativeCents(input.tdsInrCents),
  );
}

function hasSalaryComponentSplit(input: {
  basicInrCents?: number;
  specialAllowanceInrCents?: number;
  insuranceInrCents?: number;
  bonusInrCents?: number;
}) {
  return (
    nonNegativeCents(input.basicInrCents) > 0 ||
    nonNegativeCents(input.specialAllowanceInrCents) > 0 ||
    nonNegativeCents(input.insuranceInrCents) > 0 ||
    nonNegativeCents(input.bonusInrCents) > 0
  );
}

export function buildMonthlyPayrollRows(input: {
  companyId: string;
  month: string;
  employees: Employee[];
  payments: MonthlyPayrollPayment[];
}): MonthlyPayrollRow[] {
  const month = normalizePayrollMonthKey(input.month);
  const defaultDaysInMonth = getDaysInPayrollMonth(month);
  const paymentsByEmployeeId = new Map(
    input.payments
      .filter((payment) => payment.companyId === input.companyId && payment.month === month)
      .map((payment) => [payment.employeeId, payment]),
  );

  return input.employees
    .filter(
      (employee) =>
        employee.companyId === input.companyId &&
        (employee.isActive || paymentsByEmployeeId.has(employee.id)),
    )
    .map((employee) => {
      const payment = paymentsByEmployeeId.get(employee.id);
      if (payment) {
        const daysInMonth = payment.daysInMonth > 0 ? payment.daysInMonth : defaultDaysInMonth;
        const daysWorked = normalizePayrollDaysWorked(payment.daysWorked, daysInMonth);
        const baseMonthlyPaidInrCents =
          payment.monthlyPaidInrCents > 0
            ? payment.monthlyPaidInrCents
            : payment.actualPaidInrCents > 0
              ? payment.actualPaidInrCents
              : payment.salaryPaidInrCents + payment.pfInrCents + payment.tdsInrCents;
        const componentSplitExists = hasSalaryComponentSplit(payment);
        const basicInrCents = componentSplitExists
          ? payment.basicInrCents
          : buildFallbackBasicInrCents({
              monthlyPaidInrCents: baseMonthlyPaidInrCents,
              pfInrCents: payment.pfInrCents,
              tdsInrCents: payment.tdsInrCents,
            });
        const specialAllowanceInrCents = componentSplitExists ? payment.specialAllowanceInrCents : 0;
        const insuranceInrCents = componentSplitExists ? payment.insuranceInrCents : 0;
        const bonusInrCents = componentSplitExists ? payment.bonusInrCents : 0;
        const monthlyPaidInrCents = calculateMonthlyPaidInrCents({
          basicInrCents,
          specialAllowanceInrCents,
          insuranceInrCents,
          bonusInrCents,
          pfInrCents: payment.pfInrCents,
          tdsInrCents: payment.tdsInrCents,
        });
        const actualPaidInrCents = calculateActualPaidInrCents({
          monthlyPaidInrCents,
          daysWorked,
          daysInMonth,
        });
        return {
          id: payment.id,
          employeeId: employee.id,
          companyId: input.companyId,
          month,
          employeeName: payment.employeeNameSnapshot || employee.fullName,
          source: "monthly-payroll",
          paidUsdInrRate: payment.paidUsdInrRate,
          basicInrCents,
          specialAllowanceInrCents,
          insuranceInrCents,
          bonusInrCents,
          monthlyPaidInrCents,
          daysWorked,
          daysInMonth,
          actualPaidInrCents,
          salaryPaidInrCents: calculateSalaryPaidInrCents({
            actualPaidInrCents,
            pfInrCents: payment.pfInrCents,
            tdsInrCents: payment.tdsInrCents,
          }),
          pfInrCents: payment.pfInrCents,
          tdsInrCents: payment.tdsInrCents,
          paidStatus: payment.paidStatus,
          paidDate: payment.paidDate,
          status: payment.status,
          notes: payment.notes,
          overrideNote: payment.overrideNote,
          updatedAt: payment.updatedAt,
          employeeIsActive: employee.isActive,
        } satisfies MonthlyPayrollRow;
      }

      const employeeComponentSplitExists = hasSalaryComponentSplit({
        basicInrCents: employee.defaultBasicInrCents,
        specialAllowanceInrCents: employee.defaultSpecialAllowanceInrCents,
        insuranceInrCents: employee.defaultInsuranceInrCents,
        bonusInrCents: employee.defaultBonusInrCents,
      });
      const basicInrCents = employeeComponentSplitExists
        ? employee.defaultBasicInrCents
        : buildFallbackBasicInrCents({
            monthlyPaidInrCents: employee.defaultActualPaidInrCents,
            pfInrCents: employee.defaultPfInrCents,
            tdsInrCents: employee.defaultTdsInrCents,
          });
      const specialAllowanceInrCents = employeeComponentSplitExists
        ? employee.defaultSpecialAllowanceInrCents
        : 0;
      const insuranceInrCents = employeeComponentSplitExists ? employee.defaultInsuranceInrCents : 0;
      const bonusInrCents = employeeComponentSplitExists ? employee.defaultBonusInrCents : 0;
      const monthlyPaidInrCents = calculateMonthlyPaidInrCents({
        basicInrCents,
        specialAllowanceInrCents,
        insuranceInrCents,
        bonusInrCents,
        pfInrCents: employee.defaultPfInrCents,
        tdsInrCents: employee.defaultTdsInrCents,
      });
      const actualPaidInrCents = monthlyPaidInrCents;

      return {
        employeeId: employee.id,
        companyId: input.companyId,
        month,
        employeeName: employee.fullName,
        source: "employee-default",
        paidUsdInrRate: employee.defaultPaidUsdInrRate,
        basicInrCents,
        specialAllowanceInrCents,
        insuranceInrCents,
        bonusInrCents,
        monthlyPaidInrCents,
        daysWorked: defaultDaysInMonth,
        daysInMonth: defaultDaysInMonth,
        actualPaidInrCents,
        salaryPaidInrCents: calculateSalaryPaidInrCents({
          actualPaidInrCents,
          pfInrCents: employee.defaultPfInrCents,
          tdsInrCents: employee.defaultTdsInrCents,
        }),
        pfInrCents: employee.defaultPfInrCents,
        tdsInrCents: employee.defaultTdsInrCents,
        paidStatus: false,
        status: "draft",
        employeeIsActive: employee.isActive,
      } satisfies MonthlyPayrollRow;
    })
    .sort((left, right) => left.employeeName.localeCompare(right.employeeName));
}

export function summarizePayrollRows(rows: MonthlyPayrollRow[]): MonthlyPayrollSummary {
  return rows.reduce(
    (summary, row) => ({
      employeeCount: summary.employeeCount + 1,
      monthlyPaidInrCents: summary.monthlyPaidInrCents + row.monthlyPaidInrCents,
      actualPaidInrCents: summary.actualPaidInrCents + row.actualPaidInrCents,
      salaryPaidInrCents: summary.salaryPaidInrCents + row.salaryPaidInrCents,
      pfInrCents: summary.pfInrCents + row.pfInrCents,
      tdsInrCents: summary.tdsInrCents + row.tdsInrCents,
      netPaidInrCents: summary.netPaidInrCents + row.salaryPaidInrCents,
    }),
    {
      employeeCount: 0,
      monthlyPaidInrCents: 0,
      actualPaidInrCents: 0,
      salaryPaidInrCents: 0,
      pfInrCents: 0,
      tdsInrCents: 0,
      netPaidInrCents: 0,
    },
  );
}
