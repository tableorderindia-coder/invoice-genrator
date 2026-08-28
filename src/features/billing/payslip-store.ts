import { query } from "@/lib/db/pool";

import {
  buildDefaultPayslip,
  type PayslipAmountRow,
  type PayslipModel,
  type PayslipTaxPaidMonth,
  type PayslipTdsEarningRow,
  type PayslipTemplate,
} from "./payslip";
import type { MonthlyPayrollRow } from "./payroll";
import { listMonthlyPayrollRows } from "./payroll-store";
import { listEmployees } from "./store";
import type { Employee } from "./types";

type DbPayslip = {
  id: string;
  company_id: string;
  employee_id: string;
  month: string;
  employee_name_snapshot: string;
  pan_number: string | null;
  pf_uan: string | null;
  joining_date: string;
  designation_snapshot: string;
  effective_work_days: number;
  earnings: PayslipAmountRow[];
  deductions: PayslipAmountRow[];
  tds_earnings: PayslipTdsEarningRow[];
  tds_income_tax_deductions: PayslipAmountRow[];
  tax_paid_months: PayslipTaxPaidMonth[];
  updated_at?: string | null;
};

type DbPayslipTemplate = {
  employee_id: string;
  earnings: PayslipTemplate["earnings"] | null;
  deductions: PayslipTemplate["deductions"] | null;
  tds_income_tax_deductions: PayslipAmountRow[] | null;
};

type DbTaxPaid = {
  employee_id: string;
  month: string;
  deductions: PayslipAmountRow[];
};

export type SavedPayslip = PayslipModel & {
  id?: string;
  updatedAt?: string;
};

export type SavePayslipInput = SavedPayslip;

const nowIso = () => new Date().toISOString();
const nextPayslipId = () =>
  `payslip_${nowIso().replace(/[-:.TZ]/g, "").slice(0, 14)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

export function preparePayslipRecords(input: {
  companyId: string;
  month: string;
  employees: Employee[];
  payrollRows: MonthlyPayrollRow[];
  templatesByEmployeeId: Map<string, PayslipTemplate>;
  existingPayslips: SavedPayslip[];
  previousTaxPaidByEmployeeId: Map<string, Map<string, number>>;
  resetEmployeeIds?: Set<string>;
}): SavedPayslip[] {
  const employeesById = new Map(input.employees.map((employee) => [employee.id, employee]));
  const existingByEmployeeId = new Map(
    input.existingPayslips
      .filter((payslip) => payslip.companyId === input.companyId && payslip.month === input.month)
      .map((payslip) => [payslip.employeeId, payslip]),
  );
  const resetEmployeeIds = input.resetEmployeeIds ?? new Set<string>();

  return input.payrollRows
    .filter((row) => row.companyId === input.companyId && row.month === input.month && row.source === "monthly-payroll")
    .filter((row) => {
      const employee = employeesById.get(row.employeeId);
      return employee?.isActive !== false || existingByEmployeeId.has(row.employeeId);
    })
    .map((payrollRow) => {
      const existing = existingByEmployeeId.get(payrollRow.employeeId);
      if (existing && !resetEmployeeIds.has(payrollRow.employeeId)) {
        return existing;
      }

      const employee = employeesById.get(payrollRow.employeeId);
      if (!employee) {
        throw new Error(`Employee ${payrollRow.employeeName} was not found for payslip generation.`);
      }

      return {
        id: existing?.id,
        ...buildDefaultPayslip({
          companyId: input.companyId,
          month: input.month,
          employee,
          payrollRow,
          template: input.templatesByEmployeeId.get(payrollRow.employeeId),
          previousTaxPaidByMonth: input.previousTaxPaidByEmployeeId.get(payrollRow.employeeId),
        }),
      };
    })
    .sort((left, right) => left.employeeName.localeCompare(right.employeeName));
}

export async function prepareAndSavePayslips(input: {
  companyId: string;
  month: string;
  resetEmployeeIds?: Set<string>;
}) {
  const [employees, payrollRows, templatesByEmployeeId, existingPayslips, previousTaxPaidByEmployeeId] =
    await Promise.all([
      listEmployees(input.companyId),
      listMonthlyPayrollRows({ companyId: input.companyId, month: input.month }),
      listPayslipTemplatesByEmployeeId(input.companyId),
      listPayslipRecords({ companyId: input.companyId, month: input.month }),
      listPreviousTaxPaidByEmployeeId(input.companyId, input.month),
    ]);

  const records = preparePayslipRecords({
    companyId: input.companyId,
    month: input.month,
    employees,
    payrollRows,
    templatesByEmployeeId,
    existingPayslips,
    previousTaxPaidByEmployeeId,
    resetEmployeeIds: input.resetEmployeeIds,
  });

  await savePayslipRecords(records);
  return records;
}

export async function listPayslipRecords(input: {
  companyId: string;
  month: string;
}): Promise<SavedPayslip[]> {
  const { rows } = await query<DbPayslip>(
    `select * from public.employee_payslips
     where company_id = $1 and month = $2
     order by employee_name_snapshot`,
    [input.companyId, input.month],
  );
  return rows.map((row) => mapPayslip(row));
}

export async function getPayslipRecord(input: {
  payslipId: string;
  companyId?: string;
}): Promise<SavedPayslip | undefined> {
  const conditions = ["id = $1"];
  const params: unknown[] = [input.payslipId];
  if (input.companyId) {
    params.push(input.companyId);
    conditions.push(`company_id = $${params.length}`);
  }

  const { rows } = await query<DbPayslip>(
    `select * from public.employee_payslips where ${conditions.join(" and ")} limit 1`,
    params,
  );
  return rows[0] ? mapPayslip(rows[0]) : undefined;
}

export async function savePayslipRecord(input: SavePayslipInput) {
  await savePayslipRecords([input]);
}

async function savePayslipRecords(records: SavePayslipInput[]) {
  if (records.length === 0) {
    return;
  }
  const timestamp = nowIso();
  const payload = records.map((record) => ({
    id: record.id ?? nextPayslipId(),
    company_id: record.companyId,
    employee_id: record.employeeId,
    month: record.month,
    employee_name_snapshot: record.employeeName,
    pan_number: record.panNumber || null,
    pf_uan: record.pfUan || null,
    joining_date: record.joiningDate,
    designation_snapshot: record.designation,
    effective_work_days: record.effectiveWorkDays,
    earnings: record.earnings,
    deductions: record.deductions,
    tds_earnings: record.tdsEarnings,
    tds_income_tax_deductions: record.tdsIncomeTaxDeductions,
    tax_paid_months: record.taxPaidMonths,
    updated_at: timestamp,
  }));

  const payslipColumns = [
    "id",
    "company_id",
    "employee_id",
    "month",
    "employee_name_snapshot",
    "pan_number",
    "pf_uan",
    "joining_date",
    "designation_snapshot",
    "effective_work_days",
    "earnings",
    "deductions",
    "tds_earnings",
    "tds_income_tax_deductions",
    "tax_paid_months",
    "updated_at",
  ] as const;
  const payslipJsonColumns = new Set([
    "earnings",
    "deductions",
    "tds_earnings",
    "tds_income_tax_deductions",
    "tax_paid_months",
  ]);

  const payslipValuesSql: string[] = [];
  const payslipParams: unknown[] = [];
  payload.forEach((row, rowIndex) => {
    const rowValues = payslipColumns.map((column) => {
      const value = (row as Record<string, unknown>)[column];
      return payslipJsonColumns.has(column) ? JSON.stringify(value) : value;
    });
    const placeholders = rowValues.map(
      (_, colIndex) => `$${rowIndex * payslipColumns.length + colIndex + 1}`,
    );
    payslipValuesSql.push(`(${placeholders.join(", ")})`);
    payslipParams.push(...rowValues);
  });

  const payslipUpdateSet = payslipColumns
    .filter((column) => !["company_id", "employee_id", "month"].includes(column))
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");

  await query(
    `insert into public.employee_payslips (${payslipColumns.join(", ")})
     values ${payslipValuesSql.join(", ")}
     on conflict (company_id, employee_id, month) do update set ${payslipUpdateSet}`,
    payslipParams,
  );

  const templatePayload = records.map((record) => ({
    id: `payslip_template_${record.employeeId}`,
    employee_id: record.employeeId,
    company_id: record.companyId,
    earnings: buildTemplateEarnings(record),
    deductions: record.deductions.map((row) => ({
      label: row.label,
      source:
        row.label.toUpperCase() === "PF"
          ? "pf"
          : row.label.toUpperCase() === "INCOME TAX"
            ? "tds"
            : "fixed",
      valueInrCents: row.amountInrCents,
      sortOrder: row.sortOrder,
    })),
    tds_income_tax_deductions: record.tdsIncomeTaxDeductions
      .filter((row) =>
        ![
          "Income after Section 10 Exemption",
          "Taxable Income",
          "Tax Deducted Till Date",
          "Tax to be Deducted",
          "Monthly Projected Tax",
        ].includes(row.label),
      )
      .map((row) => ({
        label: row.label,
        amountInrCents: row.amountInrCents,
        sortOrder: row.sortOrder,
      })),
    updated_at: timestamp,
  }));

  const templateColumns = [
    "id",
    "employee_id",
    "company_id",
    "earnings",
    "deductions",
    "tds_income_tax_deductions",
    "updated_at",
  ] as const;
  const templateJsonColumns = new Set(["earnings", "deductions", "tds_income_tax_deductions"]);

  const templateValuesSql: string[] = [];
  const templateParams: unknown[] = [];
  templatePayload.forEach((row, rowIndex) => {
    const rowValues = templateColumns.map((column) => {
      const value = (row as Record<string, unknown>)[column];
      return templateJsonColumns.has(column) ? JSON.stringify(value) : value;
    });
    const placeholders = rowValues.map(
      (_, colIndex) => `$${rowIndex * templateColumns.length + colIndex + 1}`,
    );
    templateValuesSql.push(`(${placeholders.join(", ")})`);
    templateParams.push(...rowValues);
  });

  const templateUpdateSet = templateColumns
    .filter((column) => !["company_id", "employee_id"].includes(column))
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");

  await query(
    `insert into public.employee_payslip_templates (${templateColumns.join(", ")})
     values ${templateValuesSql.join(", ")}
     on conflict (company_id, employee_id) do update set ${templateUpdateSet}`,
    templateParams,
  );
}

function buildTemplateEarnings(record: SavePayslipInput) {
  const totalEarnings = record.earnings.reduce((sum, row) => sum + row.amountInrCents, 0);
  return record.earnings.map((row) => ({
    label: row.label,
    kind: totalEarnings > 0 ? "percentage" : "fixed",
    value: totalEarnings > 0 ? Number(((row.amountInrCents / totalEarnings) * 100).toFixed(4)) : undefined,
    valueInrCents: totalEarnings > 0 ? undefined : row.amountInrCents,
    sortOrder: row.sortOrder,
  }));
}

async function listPayslipTemplatesByEmployeeId(companyId: string) {
  const { rows } = await query<DbPayslipTemplate>(
    `select employee_id, earnings, deductions, tds_income_tax_deductions
     from public.employee_payslip_templates
     where company_id = $1`,
    [companyId],
  );

  return new Map(
    rows.map((row) => {
      return [
        row.employee_id,
        {
          earnings: row.earnings ?? [],
          deductions: row.deductions ?? [],
          tdsIncomeTaxDeductions: row.tds_income_tax_deductions ?? [],
        } satisfies PayslipTemplate,
      ] as const;
    }),
  );
}

async function listPreviousTaxPaidByEmployeeId(companyId: string, selectedMonth: string) {
  const fiscalMonths = fiscalMonthKeys(selectedMonth);
  const { rows } = await query<DbTaxPaid>(
    `select employee_id, month, deductions
     from public.employee_payslips
     where company_id = $1 and month = any($2::text[])`,
    [companyId, fiscalMonths],
  );

  const byEmployee = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const employeeMap = byEmployee.get(row.employee_id) ?? new Map<string, number>();
    const tdsDeduction =
      row.deductions.find((deduction) => deduction.label.toUpperCase() === "INCOME TAX")?.amountInrCents ?? 0;
    employeeMap.set(row.month, tdsDeduction);
    byEmployee.set(row.employee_id, employeeMap);
  }
  return byEmployee;
}

function fiscalMonthKeys(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number.parseInt(yearText ?? "", 10);
  const month = Number.parseInt(monthText ?? "", 10);
  const fiscalStartYear = month >= 4 ? year : year - 1;
  return [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((fiscalMonth) => {
    const fiscalYear = fiscalMonth >= 4 ? fiscalStartYear : fiscalStartYear + 1;
    return `${fiscalYear}-${String(fiscalMonth).padStart(2, "0")}`;
  });
}

function mapPayslip(row: DbPayslip): SavedPayslip {
  return {
    id: row.id,
    companyId: row.company_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name_snapshot,
    month: row.month,
    panNumber: row.pan_number ?? "",
    pfUan: row.pf_uan ?? "",
    joiningDate: row.joining_date,
    designation: row.designation_snapshot,
    effectiveWorkDays: Number(row.effective_work_days),
    earnings: row.earnings ?? [],
    deductions: row.deductions ?? [],
    tdsEarnings: row.tds_earnings ?? [],
    tdsIncomeTaxDeductions: row.tds_income_tax_deductions ?? [],
    taxPaidMonths: row.tax_paid_months ?? [],
    updatedAt: row.updated_at ?? undefined,
  };
}
