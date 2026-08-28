import { query } from "@/lib/db/pool";

import {
  buildMonthlyPayrollRows,
  calculateSalaryPaidInrCents,
  normalizePayrollMonthKey,
  type MonthlyPayrollPayment,
  type MonthlyPayrollRow,
  type PayrollStatus,
} from "./payroll";
import type { Employee } from "./types";

type DbEmployee = {
  id: string;
  company_id: string;
  full_name: string;
  pan_number?: string | null;
  pf_uan?: string | null;
  phone_number?: string | null;
  designation: string;
  default_team: string;
  billing_rate_usd_cents: number;
  default_paid_usd_inr_rate?: number | null;
  default_actual_paid_inr_cents?: number | null;
  default_basic_inr_cents?: number | null;
  default_special_allowance_inr_cents?: number | null;
  default_insurance_inr_cents?: number | null;
  default_bonus_inr_cents?: number | null;
  default_pf_inr_cents?: number | null;
  default_tds_inr_cents?: number | null;
  hrs_per_week: number;
  active_from: string;
  active_to: string | null;
  is_active: boolean;
  created_at: string;
};

type DbSalaryPayment = {
  id: string;
  employee_id: string;
  company_id: string;
  month: string;
  employee_name_snapshot?: string | null;
  paid_usd_inr_rate?: number | null;
  basic_inr_cents?: number | null;
  special_allowance_inr_cents?: number | null;
  insurance_inr_cents?: number | null;
  bonus_inr_cents?: number | null;
  monthly_paid_inr_cents?: number | null;
  days_worked?: number | null;
  days_in_month?: number | null;
  actual_paid_inr_cents?: number | null;
  salary_paid_inr_cents?: number | null;
  pf_inr_cents?: number | null;
  tds_inr_cents?: number | null;
  paid_status?: boolean | null;
  paid_date?: string | null;
  status?: PayrollStatus | null;
  notes?: string | null;
  override_note?: string | null;
  updated_at?: string | null;
};

type DbExistingPaymentRow = {
  id: string;
  employee_id: string;
};

type DbEmployeeRateRow = {
  id: string;
  default_paid_usd_inr_rate: number | string | null;
};

export type SaveMonthlyPayrollRowInput = {
  employeeId: string;
  employeeName: string;
  paidUsdInrRate?: number;
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
  paidStatus?: boolean;
  paidDate?: string;
  notes?: string;
  overrideNote?: string;
  importedPanNumber?: string;
  importedPfUan?: string;
  importedDesignation?: string;
  importedActiveFrom?: string;
};

const nowIso = () => new Date().toISOString();
const nextPayrollId = () =>
  `salary_payment_${nowIso().replace(/[-:.TZ]/g, "").slice(0, 14)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

function mapEmployee(row: DbEmployee): Employee {
  return {
    id: row.id,
    companyId: row.company_id,
    fullName: row.full_name,
    panNumber: row.pan_number ?? undefined,
    pfUan: row.pf_uan ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    designation: row.designation,
    defaultTeam: row.default_team,
    billingRateUsdCents: row.billing_rate_usd_cents,
    defaultPaidUsdInrRate: Number(row.default_paid_usd_inr_rate ?? 0),
    defaultActualPaidInrCents: Number(row.default_actual_paid_inr_cents ?? 0),
    defaultBasicInrCents: Number(row.default_basic_inr_cents ?? 0),
    defaultSpecialAllowanceInrCents: Number(row.default_special_allowance_inr_cents ?? 0),
    defaultInsuranceInrCents: Number(row.default_insurance_inr_cents ?? 0),
    defaultBonusInrCents: Number(row.default_bonus_inr_cents ?? 0),
    defaultPfInrCents: Number(row.default_pf_inr_cents ?? 0),
    defaultTdsInrCents: Number(row.default_tds_inr_cents ?? 0),
    hrsPerWeek: Number(row.hrs_per_week),
    activeFrom: row.active_from,
    activeTo: row.active_to ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapSalaryPayment(row: DbSalaryPayment): MonthlyPayrollPayment {
  return {
    id: row.id,
    employeeId: row.employee_id,
    companyId: row.company_id,
    month: row.month,
    employeeNameSnapshot: row.employee_name_snapshot ?? "",
    paidUsdInrRate: Number(row.paid_usd_inr_rate ?? 0),
    basicInrCents: Number(row.basic_inr_cents ?? 0),
    specialAllowanceInrCents: Number(row.special_allowance_inr_cents ?? 0),
    insuranceInrCents: Number(row.insurance_inr_cents ?? 0),
    bonusInrCents: Number(row.bonus_inr_cents ?? 0),
    monthlyPaidInrCents: Number(row.monthly_paid_inr_cents ?? row.salary_paid_inr_cents ?? 0),
    daysWorked: Number(row.days_worked ?? 0),
    daysInMonth: Number(row.days_in_month ?? 0),
    actualPaidInrCents: Number(row.actual_paid_inr_cents ?? row.salary_paid_inr_cents ?? 0),
    salaryPaidInrCents: Number(row.salary_paid_inr_cents ?? 0),
    pfInrCents: Number(row.pf_inr_cents ?? 0),
    tdsInrCents: Number(row.tds_inr_cents ?? 0),
    paidStatus: Boolean(row.paid_status),
    paidDate: row.paid_date ?? undefined,
    status: row.status ?? "draft",
    notes: row.notes ?? undefined,
    overrideNote: row.override_note ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

async function listCompanyEmployees(companyId: string) {
  const { rows } = await query<DbEmployee>(
    `select * from public.employees where company_id = $1 order by full_name`,
    [companyId],
  );
  return rows.map((row) => mapEmployee(row));
}

export async function listMonthlyPayrollRows(input: {
  companyId: string;
  month: string;
}): Promise<MonthlyPayrollRow[]> {
  const month = normalizePayrollMonthKey(input.month);

  const [employees, paymentsResult] = await Promise.all([
    listCompanyEmployees(input.companyId),
    query<DbSalaryPayment>(
      `select * from public.employee_salary_payments where company_id = $1 and month = $2`,
      [input.companyId, month],
    ),
  ]);

  return buildMonthlyPayrollRows({
    companyId: input.companyId,
    month,
    employees,
    payments: paymentsResult.rows.map((row) => mapSalaryPayment(row)),
  });
}

export async function saveMonthlyPayrollRows(input: {
  companyId: string;
  month: string;
  status: PayrollStatus;
  rows: SaveMonthlyPayrollRowInput[];
  actorUserId: string;
  updateEmployeeMaster: boolean;
  updateEmployeeIdentityFromImport?: boolean;
}) {
  const month = normalizePayrollMonthKey(input.month);
  const timestamp = nowIso();

  for (const row of input.rows) {
    const expectedSalaryPaidInrCents = calculateSalaryPaidInrCents({
      actualPaidInrCents: row.actualPaidInrCents,
      pfInrCents: row.pfInrCents,
      tdsInrCents: row.tdsInrCents,
    });
    if (expectedSalaryPaidInrCents !== row.salaryPaidInrCents) {
      throw new Error(
        `Salary paid for ${row.employeeName} must equal actual paid minus PF and TDS.`,
      );
    }
  }

  const [existingRowsResult, employeeRowsResult] = await Promise.all([
    query<DbExistingPaymentRow>(
      `select id, employee_id from public.employee_salary_payments where company_id = $1 and month = $2`,
      [input.companyId, month],
    ),
    query<DbEmployeeRateRow>(
      `select id, default_paid_usd_inr_rate from public.employees where company_id = $1`,
      [input.companyId],
    ),
  ]);

  const existingIdByEmployeeId = new Map(
    existingRowsResult.rows.map((row) => [String(row.employee_id), String(row.id)]),
  );
  const employeePaidRateById = new Map(
    employeeRowsResult.rows.map((row) => [
      String(row.id),
      Number(row.default_paid_usd_inr_rate ?? 0),
    ]),
  );

  const rows = input.rows.map((row) => {
    const paidUsdInrRate =
      row.paidUsdInrRate && row.paidUsdInrRate > 0
        ? row.paidUsdInrRate
        : employeePaidRateById.get(row.employeeId) ?? 0;

    return {
      id: existingIdByEmployeeId.get(row.employeeId) ?? nextPayrollId(),
      employee_id: row.employeeId,
      company_id: input.companyId,
      month,
      employee_name_snapshot: row.employeeName,
      paid_usd_inr_rate: paidUsdInrRate,
      basic_inr_cents: row.basicInrCents,
      special_allowance_inr_cents: row.specialAllowanceInrCents,
      insurance_inr_cents: row.insuranceInrCents,
      bonus_inr_cents: row.bonusInrCents,
      monthly_paid_inr_cents: row.monthlyPaidInrCents,
      days_worked: row.daysWorked,
      days_in_month: row.daysInMonth,
      actual_paid_inr_cents: row.actualPaidInrCents,
      salary_paid_inr_cents: row.salaryPaidInrCents,
      pf_inr_cents: row.pfInrCents,
      tds_inr_cents: row.tdsInrCents,
      paid_status: row.paidStatus ?? false,
      paid_date: row.paidDate ?? null,
      status: input.status,
      verified_at: input.status === "verified" ? timestamp : null,
      verified_by: input.status === "verified" ? input.actorUserId : null,
      notes: row.notes || null,
      override_note: row.overrideNote || null,
      override_at: row.overrideNote ? timestamp : null,
      override_by: row.overrideNote ? input.actorUserId : null,
      updated_at: timestamp,
    };
  });

  if (rows.length > 0) {
    const columns = [
      "id",
      "employee_id",
      "company_id",
      "month",
      "employee_name_snapshot",
      "paid_usd_inr_rate",
      "basic_inr_cents",
      "special_allowance_inr_cents",
      "insurance_inr_cents",
      "bonus_inr_cents",
      "monthly_paid_inr_cents",
      "days_worked",
      "days_in_month",
      "actual_paid_inr_cents",
      "salary_paid_inr_cents",
      "pf_inr_cents",
      "tds_inr_cents",
      "paid_status",
      "paid_date",
      "status",
      "verified_at",
      "verified_by",
      "notes",
      "override_note",
      "override_at",
      "override_by",
      "updated_at",
    ] as const;

    const valuesSql: string[] = [];
    const params: unknown[] = [];
    rows.forEach((row, rowIndex) => {
      const rowValues = columns.map((column) => (row as Record<string, unknown>)[column]);
      const placeholders = rowValues.map(
        (_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`,
      );
      valuesSql.push(`(${placeholders.join(", ")})`);
      params.push(...rowValues);
    });

    const updateSet = columns
      .filter((column) => !["employee_id", "company_id", "month"].includes(column))
      .map((column) => `${column} = excluded.${column}`)
      .join(", ");

    await query(
      `insert into public.employee_salary_payments (${columns.join(", ")})
       values ${valuesSql.join(", ")}
       on conflict (employee_id, company_id, month) do update set ${updateSet}`,
      params,
    );
  }

  if (input.updateEmployeeMaster) {
    for (const row of input.rows) {
      const paidUsdInrRate =
        row.paidUsdInrRate && row.paidUsdInrRate > 0
          ? row.paidUsdInrRate
          : employeePaidRateById.get(row.employeeId) ?? 0;

      const setClauses = [
        "default_actual_paid_inr_cents = $2",
        "default_basic_inr_cents = $3",
        "default_special_allowance_inr_cents = $4",
        "default_insurance_inr_cents = $5",
        "default_bonus_inr_cents = $6",
        "default_pf_inr_cents = $7",
        "default_tds_inr_cents = $8",
      ];
      const params: unknown[] = [
        row.employeeId,
        row.monthlyPaidInrCents,
        row.basicInrCents,
        row.specialAllowanceInrCents,
        row.insuranceInrCents,
        row.bonusInrCents,
        row.pfInrCents,
        row.tdsInrCents,
      ];
      if (paidUsdInrRate > 0) {
        params.push(paidUsdInrRate);
        setClauses.push(`default_paid_usd_inr_rate = $${params.length}`);
      }
      params.push(input.companyId);

      await query(
        `update public.employees set ${setClauses.join(", ")} where id = $1 and company_id = $${params.length}`,
        params,
      );
    }
  }

  if (input.updateEmployeeIdentityFromImport) {
    for (const row of input.rows) {
      const setClauses: string[] = [];
      const params: unknown[] = [];
      if (row.importedPanNumber) {
        params.push(row.importedPanNumber);
        setClauses.push(`pan_number = $${params.length}`);
      }
      if (row.importedPfUan) {
        params.push(row.importedPfUan);
        setClauses.push(`pf_uan = $${params.length}`);
      }
      if (row.importedDesignation) {
        params.push(row.importedDesignation);
        setClauses.push(`designation = $${params.length}`);
      }
      if (row.importedActiveFrom) {
        params.push(row.importedActiveFrom);
        setClauses.push(`active_from = $${params.length}`);
      }
      if (setClauses.length === 0) continue;

      params.push(row.employeeId);
      const employeeIdParamIndex = params.length;
      params.push(input.companyId);
      const companyIdParamIndex = params.length;

      await query(
        `update public.employees set ${setClauses.join(", ")} where id = $${employeeIdParamIndex} and company_id = $${companyIdParamIndex}`,
        params,
      );
    }
  }

  const auditRows = input.rows
    .filter((row) => row.overrideNote)
    .map((row) => ({
      id: `salary_override_${timestamp.replace(/[-:.TZ]/g, "").slice(0, 14)}_${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      employee_id: row.employeeId,
      company_id: input.companyId,
      month,
      actor_user_id: input.actorUserId,
      salary_paid_inr_cents: row.salaryPaidInrCents,
      pf_inr_cents: row.pfInrCents,
      tds_inr_cents: row.tdsInrCents,
      override_note: row.overrideNote,
      created_at: timestamp,
    }));

  if (auditRows.length > 0) {
    const columns = [
      "id",
      "employee_id",
      "company_id",
      "month",
      "actor_user_id",
      "salary_paid_inr_cents",
      "pf_inr_cents",
      "tds_inr_cents",
      "override_note",
      "created_at",
    ] as const;

    const valuesSql: string[] = [];
    const params: unknown[] = [];
    auditRows.forEach((row, rowIndex) => {
      const rowValues = columns.map((column) => (row as Record<string, unknown>)[column]);
      const placeholders = rowValues.map(
        (_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`,
      );
      valuesSql.push(`(${placeholders.join(", ")})`);
      params.push(...rowValues);
    });

    await query(
      `insert into public.employee_salary_payment_audit (${columns.join(", ")})
       values ${valuesSql.join(", ")}`,
      params,
    );
  }
}
