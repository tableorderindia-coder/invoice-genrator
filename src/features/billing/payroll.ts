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

export type MonthlyPayrollSummary = {
  employeeCount: number;
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

export function buildMonthlyPayrollRows(input: {
  companyId: string;
  month: string;
  employees: Employee[];
  payments: MonthlyPayrollPayment[];
}): MonthlyPayrollRow[] {
  const month = normalizePayrollMonthKey(input.month);
  const paymentsByEmployeeId = new Map(
    input.payments
      .filter((payment) => payment.companyId === input.companyId && payment.month === month)
      .map((payment) => [payment.employeeId, payment]),
  );

  return input.employees
    .filter((employee) => employee.companyId === input.companyId && employee.isActive)
    .map((employee) => {
      const payment = paymentsByEmployeeId.get(employee.id);
      if (payment) {
        return {
          id: payment.id,
          employeeId: employee.id,
          companyId: input.companyId,
          month,
          employeeName: payment.employeeNameSnapshot || employee.fullName,
          source: "monthly-payroll",
          paidUsdInrRate: payment.paidUsdInrRate,
          salaryPaidInrCents: payment.salaryPaidInrCents,
          pfInrCents: payment.pfInrCents,
          tdsInrCents: payment.tdsInrCents,
          paidStatus: payment.paidStatus,
          paidDate: payment.paidDate,
          status: payment.status,
          notes: payment.notes,
          overrideNote: payment.overrideNote,
          updatedAt: payment.updatedAt,
        } satisfies MonthlyPayrollRow;
      }

      return {
        employeeId: employee.id,
        companyId: input.companyId,
        month,
        employeeName: employee.fullName,
        source: "employee-default",
        paidUsdInrRate: employee.defaultPaidUsdInrRate,
        salaryPaidInrCents: employee.defaultActualPaidInrCents,
        pfInrCents: employee.defaultPfInrCents,
        tdsInrCents: employee.defaultTdsInrCents,
        paidStatus: false,
        status: "draft",
      } satisfies MonthlyPayrollRow;
    })
    .sort((left, right) => left.employeeName.localeCompare(right.employeeName));
}

export function summarizePayrollRows(rows: MonthlyPayrollRow[]): MonthlyPayrollSummary {
  return rows.reduce(
    (summary, row) => ({
      employeeCount: summary.employeeCount + 1,
      salaryPaidInrCents: summary.salaryPaidInrCents + row.salaryPaidInrCents,
      pfInrCents: summary.pfInrCents + row.pfInrCents,
      tdsInrCents: summary.tdsInrCents + row.tdsInrCents,
      netPaidInrCents:
        summary.netPaidInrCents +
        row.salaryPaidInrCents -
        row.pfInrCents -
        row.tdsInrCents,
    }),
    {
      employeeCount: 0,
      salaryPaidInrCents: 0,
      pfInrCents: 0,
      tdsInrCents: 0,
      netPaidInrCents: 0,
    },
  );
}
