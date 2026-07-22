import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  buildMonthlyPayrollRows,
  calculateSalaryPaidInrCents,
  normalizePayrollMonthKey,
  type MonthlyPayrollPayment,
  type MonthlyPayrollRow,
  type PayrollStatus,
} from "./payroll";
import type { Employee } from "./types";

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;

type DbEmployee = {
  id: string;
  company_id: string;
  full_name: string;
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
};

const nowIso = () => new Date().toISOString();
const nextPayrollId = () =>
  `salary_payment_${nowIso().replace(/[-:.TZ]/g, "").slice(0, 14)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

async function getSupabaseOrThrow() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
}

function mapEmployee(row: DbEmployee): Employee {
  return {
    id: row.id,
    companyId: row.company_id,
    fullName: row.full_name,
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

async function listCompanyEmployees(supabase: SupabaseClient, companyId: string) {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("company_id", companyId)
    .order("full_name");

  if (error) throw error;
  return (data ?? []).map((row) => mapEmployee(row as DbEmployee));
}

export async function listMonthlyPayrollRows(input: {
  companyId: string;
  month: string;
}): Promise<MonthlyPayrollRow[]> {
  const month = normalizePayrollMonthKey(input.month);
  const supabase = await getSupabaseOrThrow();

  const [employees, paymentsResult] = await Promise.all([
    listCompanyEmployees(supabase, input.companyId),
    supabase
      .from("employee_salary_payments")
      .select("*")
      .eq("company_id", input.companyId)
      .eq("month", month),
  ]);

  if (paymentsResult.error) throw paymentsResult.error;

  return buildMonthlyPayrollRows({
    companyId: input.companyId,
    month,
    employees,
    payments: (paymentsResult.data ?? []).map((row) =>
      mapSalaryPayment(row as DbSalaryPayment),
    ),
  });
}

export async function saveMonthlyPayrollRows(input: {
  companyId: string;
  month: string;
  status: PayrollStatus;
  rows: SaveMonthlyPayrollRowInput[];
  actorUserId: string;
  updateEmployeeMaster: boolean;
}) {
  const month = normalizePayrollMonthKey(input.month);
  const supabase = await getSupabaseOrThrow();
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

  const { data: existingRows, error: existingError } = await supabase
    .from("employee_salary_payments")
    .select("id, employee_id")
    .eq("company_id", input.companyId)
    .eq("month", month);
  if (existingError) throw existingError;

  const existingIdByEmployeeId = new Map(
    (existingRows ?? []).map((row) => [
      String((row as { employee_id: string }).employee_id),
      String((row as { id: string }).id),
    ]),
  );

  const rows = input.rows.map((row) => ({
    id: existingIdByEmployeeId.get(row.employeeId) ?? nextPayrollId(),
    employee_id: row.employeeId,
    company_id: input.companyId,
    month,
    employee_name_snapshot: row.employeeName,
    paid_usd_inr_rate: row.paidUsdInrRate ?? 0,
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
  }));

  if (rows.length > 0) {
    const { error } = await supabase.from("employee_salary_payments").upsert(rows, {
      onConflict: "employee_id,company_id,month",
    });
    if (error) throw error;
  }

  if (input.updateEmployeeMaster) {
    for (const row of input.rows) {
      const { error } = await supabase
        .from("employees")
        .update({
          default_actual_paid_inr_cents: row.monthlyPaidInrCents,
          default_basic_inr_cents: row.basicInrCents,
          default_special_allowance_inr_cents: row.specialAllowanceInrCents,
          default_insurance_inr_cents: row.insuranceInrCents,
          default_bonus_inr_cents: row.bonusInrCents,
          default_pf_inr_cents: row.pfInrCents,
          default_tds_inr_cents: row.tdsInrCents,
        })
        .eq("id", row.employeeId)
        .eq("company_id", input.companyId);
      if (error) throw error;
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
    const { error } = await supabase.from("employee_salary_payment_audit").insert(auditRows);
    if (error) throw error;
  }
}
