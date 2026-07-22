import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPnDashboardData } from "./store";
import type {
  PnDashboardData,
  PnEmployeeEditableRow,
  PnEmployeeEditableSection,
  PnEmployeeMonthRow,
  PnEmployeeSection,
  PnPeriodRow,
  PnPeriodType,
} from "./types";

export type PnEmployeeMonthSummaryRow = PnEmployeeEditableRow & {
  companyId: string;
  employeeId: string;
  employeeName: string;
  paymentMonth: string;
  rebuiltAt: string;
  sourceUpdatedAt?: string | null;
};

export type PnCompanyMonthSummaryRow = Omit<PnPeriodRow, "month" | "fiscalLabel"> & {
  companyId: string;
  paymentMonth: string;
  month: number;
  rebuiltAt: string;
  sourceUpdatedAt?: string | null;
};

type DbEmployeeSummary = {
  company_id: string;
  employee_id: string;
  employee_name_snapshot: string;
  payment_month: string;
  year: number;
  month: number;
  payout_id: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  days_worked: number | string;
  days_in_month: number | string;
  dollar_inward_usd_cents: number;
  base_dollar_inward_usd_cents: number;
  onboarding_advance_usd_cents: number;
  reimbursement_usd_cents: number;
  reimbursement_labels_text: string | null;
  reimbursement_inr_cents: number;
  appraisal_advance_usd_cents: number;
  appraisal_advance_inr_cents: number;
  offboarding_deduction_usd_cents: number;
  effective_dollar_inward_usd_cents: number;
  cash_in_inr_cents: number;
  cashout_usd_inr_rate: number | string;
  paid_usd_inr_rate: number | string;
  monthly_paid_inr_cents: number;
  salary_paid_inr_cents: number;
  pf_inr_cents: number;
  tds_inr_cents: number;
  actual_paid_inr_cents: number;
  fx_commission_inr_cents: number;
  total_commission_usd_cents: number;
  commission_earned_inr_cents: number;
  gross_earnings_inr_cents: number;
  net_profit_inr_cents: number;
  is_security_deposit_month: boolean;
  source_updated_at: string | null;
  rebuilt_at: string;
};

type DbCompanySummary = {
  company_id: string;
  payment_month: string;
  year: number;
  month: number;
  dollar_inward_usd_cents: number;
  onboarding_advance_usd_cents: number;
  reimbursement_usd_cents: number;
  reimbursement_labels_text: string | null;
  reimbursement_inr_cents: number;
  appraisal_advance_usd_cents: number;
  appraisal_advance_inr_cents: number;
  offboarding_deduction_usd_cents: number;
  effective_dollar_inward_usd_cents: number;
  cashout_usd_inr_rate: number | string;
  cash_in_inr_cents: number;
  paid_usd_inr_rate: number | string;
  monthly_paid_inr_cents: number;
  pf_inr_cents: number;
  tds_inr_cents: number;
  actual_paid_inr_cents: number;
  salary_paid_inr_cents: number;
  fx_commission_inr_cents: number;
  total_commission_usd_cents: number;
  commission_earned_inr_cents: number;
  gross_earnings_inr_cents: number;
  expenses_inr_cents: number;
  company_reimbursement_usd_cents: number;
  company_reimbursement_inr_cents: number;
  net_pl_inr_cents: number;
  source_updated_at: string | null;
  rebuilt_at: string;
};

const employeeSummarySelect = `
  company_id,
  employee_id,
  employee_name_snapshot,
  payment_month,
  year,
  month,
  payout_id,
  invoice_id,
  invoice_number,
  days_worked,
  days_in_month,
  dollar_inward_usd_cents,
  base_dollar_inward_usd_cents,
  onboarding_advance_usd_cents,
  reimbursement_usd_cents,
  reimbursement_labels_text,
  reimbursement_inr_cents,
  appraisal_advance_usd_cents,
  appraisal_advance_inr_cents,
  offboarding_deduction_usd_cents,
  effective_dollar_inward_usd_cents,
  cash_in_inr_cents,
  cashout_usd_inr_rate,
  paid_usd_inr_rate,
  monthly_paid_inr_cents,
  salary_paid_inr_cents,
  pf_inr_cents,
  tds_inr_cents,
  actual_paid_inr_cents,
  fx_commission_inr_cents,
  total_commission_usd_cents,
  commission_earned_inr_cents,
  gross_earnings_inr_cents,
  net_profit_inr_cents,
  is_security_deposit_month,
  source_updated_at,
  rebuilt_at
`;

const companySummarySelect = `
  company_id,
  payment_month,
  year,
  month,
  dollar_inward_usd_cents,
  onboarding_advance_usd_cents,
  reimbursement_usd_cents,
  reimbursement_labels_text,
  reimbursement_inr_cents,
  appraisal_advance_usd_cents,
  appraisal_advance_inr_cents,
  offboarding_deduction_usd_cents,
  effective_dollar_inward_usd_cents,
  cashout_usd_inr_rate,
  cash_in_inr_cents,
  paid_usd_inr_rate,
  monthly_paid_inr_cents,
  pf_inr_cents,
  tds_inr_cents,
  actual_paid_inr_cents,
  salary_paid_inr_cents,
  fx_commission_inr_cents,
  total_commission_usd_cents,
  commission_earned_inr_cents,
  gross_earnings_inr_cents,
  expenses_inr_cents,
  company_reimbursement_usd_cents,
  company_reimbursement_inr_cents,
  net_pl_inr_cents,
  source_updated_at,
  rebuilt_at
`;

const numberValue = (value: number | string | null | undefined) => Number(value ?? 0);
const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;
const hasMonth = (row: PnPeriodRow): row is PnPeriodRow & { month: number } =>
  typeof row.month === "number";

async function getSupabaseOrThrow() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before running the app.",
    );
  }

  return client;
}

function fiscalYearKey(row: Pick<PnCompanyMonthSummaryRow, "year" | "month">) {
  return row.month >= 4 ? `${row.year}-${row.year + 1}` : `${row.year - 1}-${row.year}`;
}

function fiscalLabel(row: Pick<PnCompanyMonthSummaryRow, "year" | "month">) {
  const startYear = row.month >= 4 ? row.year : row.year - 1;
  return `Apr ${startYear}-Mar ${startYear + 1}`;
}

function averagePositive(rows: PnCompanyMonthSummaryRow[], key: "cashoutUsdInrRate" | "paidUsdInrRate") {
  const values = rows.map((row) => row[key]).filter((value) => value > 0);
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sumCompanyRows(rows: PnCompanyMonthSummaryRow[], key: keyof PnCompanyMonthSummaryRow) {
  return rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
}

function toEmployeeSummaryRow(row: DbEmployeeSummary): PnEmployeeMonthSummaryRow {
  return {
    companyId: row.company_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name_snapshot,
    paymentMonth: row.payment_month,
    payoutId: row.payout_id ?? "",
    invoiceId: row.invoice_id ?? "",
    invoiceNumber: row.invoice_number ?? "",
    year: row.year,
    month: row.month,
    daysWorked: numberValue(row.days_worked),
    daysInMonth: numberValue(row.days_in_month),
    dollarInwardUsdCents: numberValue(row.dollar_inward_usd_cents),
    baseDollarInwardUsdCents: numberValue(row.base_dollar_inward_usd_cents),
    onboardingAdvanceUsdCents: numberValue(row.onboarding_advance_usd_cents),
    reimbursementUsdCents: numberValue(row.reimbursement_usd_cents),
    reimbursementLabelsText: row.reimbursement_labels_text ?? "",
    reimbursementInrCents: numberValue(row.reimbursement_inr_cents),
    appraisalAdvanceUsdCents: numberValue(row.appraisal_advance_usd_cents),
    appraisalAdvanceInrCents: numberValue(row.appraisal_advance_inr_cents),
    offboardingDeductionUsdCents: numberValue(row.offboarding_deduction_usd_cents),
    effectiveDollarInwardUsdCents: numberValue(row.effective_dollar_inward_usd_cents),
    cashInInrCents: numberValue(row.cash_in_inr_cents),
    cashoutUsdInrRate: numberValue(row.cashout_usd_inr_rate),
    paidUsdInrRate: numberValue(row.paid_usd_inr_rate),
    monthlyPaidInrCents: numberValue(row.monthly_paid_inr_cents),
    salaryPaidInrCents: numberValue(row.salary_paid_inr_cents),
    pfInrCents: numberValue(row.pf_inr_cents),
    tdsInrCents: numberValue(row.tds_inr_cents),
    actualPaidInrCents: numberValue(row.actual_paid_inr_cents),
    fxCommissionInrCents: numberValue(row.fx_commission_inr_cents),
    totalCommissionUsdCents: numberValue(row.total_commission_usd_cents),
    commissionEarnedInrCents: numberValue(row.commission_earned_inr_cents),
    grossEarningsInrCents: numberValue(row.gross_earnings_inr_cents),
    netProfitInrCents: numberValue(row.net_profit_inr_cents),
    isSecurityDepositMonth: row.is_security_deposit_month,
    sourceUpdatedAt: row.source_updated_at,
    rebuiltAt: row.rebuilt_at,
  };
}

function toCompanySummaryRow(row: DbCompanySummary): PnCompanyMonthSummaryRow {
  return {
    companyId: row.company_id,
    paymentMonth: row.payment_month,
    year: row.year,
    month: row.month,
    dollarInwardUsdCents: numberValue(row.dollar_inward_usd_cents),
    onboardingAdvanceUsdCents: numberValue(row.onboarding_advance_usd_cents),
    reimbursementUsdCents: numberValue(row.reimbursement_usd_cents),
    reimbursementLabelsText: row.reimbursement_labels_text ?? "",
    reimbursementInrCents: numberValue(row.reimbursement_inr_cents),
    appraisalAdvanceUsdCents: numberValue(row.appraisal_advance_usd_cents),
    appraisalAdvanceInrCents: numberValue(row.appraisal_advance_inr_cents),
    offboardingDeductionUsdCents: numberValue(row.offboarding_deduction_usd_cents),
    effectiveDollarInwardUsdCents: numberValue(row.effective_dollar_inward_usd_cents),
    cashoutUsdInrRate: numberValue(row.cashout_usd_inr_rate),
    cashInInrCents: numberValue(row.cash_in_inr_cents),
    paidUsdInrRate: numberValue(row.paid_usd_inr_rate),
    monthlyPaidInrCents: numberValue(row.monthly_paid_inr_cents),
    pfInrCents: numberValue(row.pf_inr_cents),
    tdsInrCents: numberValue(row.tds_inr_cents),
    actualPaidInrCents: numberValue(row.actual_paid_inr_cents),
    salaryPaidInrCents: numberValue(row.salary_paid_inr_cents),
    fxCommissionInrCents: numberValue(row.fx_commission_inr_cents),
    totalCommissionUsdCents: numberValue(row.total_commission_usd_cents),
    commissionEarnedInrCents: numberValue(row.commission_earned_inr_cents),
    grossEarningsInrCents: numberValue(row.gross_earnings_inr_cents),
    expensesInrCents: numberValue(row.expenses_inr_cents),
    companyReimbursementUsdCents: numberValue(row.company_reimbursement_usd_cents),
    companyReimbursementInrCents: numberValue(row.company_reimbursement_inr_cents),
    netPlInrCents: numberValue(row.net_pl_inr_cents),
    sourceUpdatedAt: row.source_updated_at,
    rebuiltAt: row.rebuilt_at,
  };
}

function employeeSummaryToMonthRow(row: PnEmployeeMonthSummaryRow): PnEmployeeMonthRow {
  return {
    year: row.year,
    month: row.month,
    daysWorked: row.daysWorked,
    daysInMonth: row.daysInMonth,
    dollarInwardUsdCents: row.dollarInwardUsdCents,
    reimbursementUsdCents: row.reimbursementUsdCents,
    reimbursementLabelsText: row.reimbursementLabelsText,
    reimbursementInrCents: row.reimbursementInrCents,
    appraisalAdvanceUsdCents: row.appraisalAdvanceUsdCents,
    appraisalAdvanceInrCents: row.appraisalAdvanceInrCents,
    cashoutUsdInrRate: row.cashoutUsdInrRate,
    paidUsdInrRate: row.paidUsdInrRate,
    monthlyPaidInrCents: row.monthlyPaidInrCents,
    pfInrCents: row.pfInrCents,
    tdsInrCents: row.tdsInrCents,
    actualPaidInrCents: row.actualPaidInrCents,
    salaryPaidInrCents: row.salaryPaidInrCents,
    fxCommissionInrCents: row.fxCommissionInrCents,
    totalCommissionUsdCents: row.totalCommissionUsdCents,
    commissionEarnedInrCents: row.commissionEarnedInrCents,
    grossEarningsInrCents: row.grossEarningsInrCents,
  };
}

function buildEmployeeEditableSections(rows: PnEmployeeMonthSummaryRow[]): PnEmployeeEditableSection[] {
  const grouped = new Map<string, PnEmployeeEditableSection>();
  for (const row of rows) {
    const section =
      grouped.get(row.employeeId) ??
      {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        rows: [],
        totalGrossEarningsInrCents: 0,
        totalNetProfitInrCents: 0,
      };
    section.rows.push(row);
    section.totalGrossEarningsInrCents += row.grossEarningsInrCents;
    section.totalNetProfitInrCents += row.netProfitInrCents;
    grouped.set(row.employeeId, section);
  }

  return [...grouped.values()]
    .map((section) => ({
      ...section,
      rows: section.rows.sort((left, right) => left.year * 100 + left.month - (right.year * 100 + right.month)),
    }))
    .sort((left, right) => left.employeeName.localeCompare(right.employeeName));
}

function buildEmployeeSections(rows: PnEmployeeMonthSummaryRow[]): PnEmployeeSection[] {
  const grouped = new Map<string, PnEmployeeSection>();
  for (const row of rows) {
    const section =
      grouped.get(row.employeeId) ??
      {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        rows: [],
        totalGrossEarningsInrCents: 0,
      };
    section.rows.push(employeeSummaryToMonthRow(row));
    section.totalGrossEarningsInrCents += row.grossEarningsInrCents;
    grouped.set(row.employeeId, section);
  }

  return [...grouped.values()]
    .map((section) => ({
      ...section,
      rows: section.rows.sort((left, right) => left.year * 100 + left.month - (right.year * 100 + right.month)),
    }))
    .sort((left, right) => left.employeeName.localeCompare(right.employeeName));
}

function rollupCompanyRows(rows: PnCompanyMonthSummaryRow[], periodType: PnPeriodType): PnPeriodRow[] {
  if (periodType === "monthly") {
    return [...rows]
      .map((row) => ({
        year: row.year,
        month: row.month,
        dollarInwardUsdCents: row.dollarInwardUsdCents,
        onboardingAdvanceUsdCents: row.onboardingAdvanceUsdCents,
        reimbursementUsdCents: row.reimbursementUsdCents,
        reimbursementLabelsText: row.reimbursementLabelsText,
        reimbursementInrCents: row.reimbursementInrCents,
        appraisalAdvanceUsdCents: row.appraisalAdvanceUsdCents,
        appraisalAdvanceInrCents: row.appraisalAdvanceInrCents,
        offboardingDeductionUsdCents: row.offboardingDeductionUsdCents,
        effectiveDollarInwardUsdCents: row.effectiveDollarInwardUsdCents,
        cashoutUsdInrRate: row.cashoutUsdInrRate,
        cashInInrCents: row.cashInInrCents,
        paidUsdInrRate: row.paidUsdInrRate,
        monthlyPaidInrCents: row.monthlyPaidInrCents,
        pfInrCents: row.pfInrCents,
        tdsInrCents: row.tdsInrCents,
        actualPaidInrCents: row.actualPaidInrCents,
        salaryPaidInrCents: row.salaryPaidInrCents,
        fxCommissionInrCents: row.fxCommissionInrCents,
        totalCommissionUsdCents: row.totalCommissionUsdCents,
        commissionEarnedInrCents: row.commissionEarnedInrCents,
        grossEarningsInrCents: row.grossEarningsInrCents,
        expensesInrCents: row.expensesInrCents,
        companyReimbursementUsdCents: row.companyReimbursementUsdCents,
        companyReimbursementInrCents: row.companyReimbursementInrCents,
        netPlInrCents: row.netPlInrCents,
      }))
      .sort((left, right) => left.year * 100 + (left.month ?? 0) - (right.year * 100 + (right.month ?? 0)));
  }

  const grouped = new Map<string, PnCompanyMonthSummaryRow[]>();
  for (const row of rows) {
    const key = fiscalYearKey(row);
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  return [...grouped.values()]
    .map((bucket) => {
      const first = bucket[0]!;
      const reimbursementLabels = new Set<string>();
      for (const row of bucket) {
        row.reimbursementLabelsText
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean)
          .forEach((label) => reimbursementLabels.add(label));
      }

      return {
        year: first.month >= 4 ? first.year : first.year - 1,
        fiscalLabel: fiscalLabel(first),
        dollarInwardUsdCents: sumCompanyRows(bucket, "dollarInwardUsdCents"),
        onboardingAdvanceUsdCents: sumCompanyRows(bucket, "onboardingAdvanceUsdCents"),
        reimbursementUsdCents: sumCompanyRows(bucket, "reimbursementUsdCents"),
        reimbursementLabelsText: [...reimbursementLabels].join(", "),
        reimbursementInrCents: sumCompanyRows(bucket, "reimbursementInrCents"),
        appraisalAdvanceUsdCents: sumCompanyRows(bucket, "appraisalAdvanceUsdCents"),
        appraisalAdvanceInrCents: sumCompanyRows(bucket, "appraisalAdvanceInrCents"),
        offboardingDeductionUsdCents: sumCompanyRows(bucket, "offboardingDeductionUsdCents"),
        effectiveDollarInwardUsdCents: sumCompanyRows(bucket, "effectiveDollarInwardUsdCents"),
        cashoutUsdInrRate: averagePositive(bucket, "cashoutUsdInrRate"),
        cashInInrCents: sumCompanyRows(bucket, "cashInInrCents"),
        paidUsdInrRate: averagePositive(bucket, "paidUsdInrRate"),
        monthlyPaidInrCents: sumCompanyRows(bucket, "monthlyPaidInrCents"),
        pfInrCents: sumCompanyRows(bucket, "pfInrCents"),
        tdsInrCents: sumCompanyRows(bucket, "tdsInrCents"),
        actualPaidInrCents: sumCompanyRows(bucket, "actualPaidInrCents"),
        salaryPaidInrCents: sumCompanyRows(bucket, "salaryPaidInrCents"),
        fxCommissionInrCents: sumCompanyRows(bucket, "fxCommissionInrCents"),
        totalCommissionUsdCents: sumCompanyRows(bucket, "totalCommissionUsdCents"),
        commissionEarnedInrCents: sumCompanyRows(bucket, "commissionEarnedInrCents"),
        grossEarningsInrCents: sumCompanyRows(bucket, "grossEarningsInrCents"),
        expensesInrCents: sumCompanyRows(bucket, "expensesInrCents"),
        companyReimbursementUsdCents: sumCompanyRows(bucket, "companyReimbursementUsdCents"),
        companyReimbursementInrCents: sumCompanyRows(bucket, "companyReimbursementInrCents"),
        netPlInrCents: sumCompanyRows(bucket, "netPlInrCents"),
      };
    })
    .sort((left, right) => left.year - right.year);
}

export function buildPnDashboardDataFromSummaryRows(input: {
  companyId: string;
  periodType: PnPeriodType;
  employeeRows: PnEmployeeMonthSummaryRow[];
  companyRows: PnCompanyMonthSummaryRow[];
}): PnDashboardData {
  return {
    companyId: input.companyId,
    employeeEditableSections: buildEmployeeEditableSections(input.employeeRows),
    employeeSections: buildEmployeeSections(input.employeeRows),
    periodRows: rollupCompanyRows(input.companyRows, input.periodType),
  };
}

async function listEmployeeSummaryRows(input: {
  companyId: string;
  employeeIds?: string[];
  paymentMonths?: string[];
}) {
  const supabase = await getSupabaseOrThrow();
  let query = supabase
    .from("pn_employee_month_summaries")
    .select(employeeSummarySelect)
    .eq("company_id", input.companyId);

  if (input.employeeIds?.length) {
    query = query.in("employee_id", input.employeeIds);
  }
  if (input.paymentMonths?.length) {
    query = query.in("payment_month", input.paymentMonths);
  }

  const { data, error } = await query.order("employee_name_snapshot").order("payment_month");
  if (error) throw error;
  return ((data ?? []) as DbEmployeeSummary[]).map(toEmployeeSummaryRow);
}

async function listCompanySummaryRows(input: { companyId: string; paymentMonths?: string[] }) {
  const supabase = await getSupabaseOrThrow();
  let query = supabase
    .from("pn_company_month_summaries")
    .select(companySummarySelect)
    .eq("company_id", input.companyId);

  if (input.paymentMonths?.length) {
    query = query.in("payment_month", input.paymentMonths);
  }

  const { data, error } = await query.order("payment_month");
  if (error) throw error;
  return ((data ?? []) as DbCompanySummary[]).map(toCompanySummaryRow);
}

export async function getPnDashboardSummaryData(input: {
  companyId: string;
  periodType: PnPeriodType;
  employeeIds?: string[];
  paymentMonths?: string[];
}): Promise<PnDashboardData> {
  let [employeeRows, companyRows] = await Promise.all([
    listEmployeeSummaryRows(input),
    listCompanySummaryRows(input),
  ]);

  if (employeeRows.length === 0 && companyRows.length === 0) {
    await rebuildPnSummariesForCompany(input.companyId);
    [employeeRows, companyRows] = await Promise.all([
      listEmployeeSummaryRows(input),
      listCompanySummaryRows(input),
    ]);
  }

  return buildPnDashboardDataFromSummaryRows({
    companyId: input.companyId,
    periodType: input.periodType,
    employeeRows,
    companyRows,
  });
}

function employeeSummaryToDb(row: PnEmployeeMonthSummaryRow) {
  return {
    company_id: row.companyId,
    employee_id: row.employeeId,
    employee_name_snapshot: row.employeeName,
    payment_month: row.paymentMonth,
    year: row.year,
    month: row.month,
    payout_id: row.payoutId || null,
    invoice_id: row.invoiceId || null,
    invoice_number: row.invoiceNumber,
    days_worked: row.daysWorked,
    days_in_month: row.daysInMonth,
    dollar_inward_usd_cents: row.dollarInwardUsdCents,
    base_dollar_inward_usd_cents: row.baseDollarInwardUsdCents,
    onboarding_advance_usd_cents: row.onboardingAdvanceUsdCents,
    reimbursement_usd_cents: row.reimbursementUsdCents,
    reimbursement_labels_text: row.reimbursementLabelsText,
    reimbursement_inr_cents: row.reimbursementInrCents,
    appraisal_advance_usd_cents: row.appraisalAdvanceUsdCents,
    appraisal_advance_inr_cents: row.appraisalAdvanceInrCents,
    offboarding_deduction_usd_cents: row.offboardingDeductionUsdCents,
    effective_dollar_inward_usd_cents: row.effectiveDollarInwardUsdCents,
    cash_in_inr_cents: row.cashInInrCents,
    cashout_usd_inr_rate: row.cashoutUsdInrRate,
    paid_usd_inr_rate: row.paidUsdInrRate,
    monthly_paid_inr_cents: row.monthlyPaidInrCents,
    salary_paid_inr_cents: row.salaryPaidInrCents,
    pf_inr_cents: row.pfInrCents,
    tds_inr_cents: row.tdsInrCents,
    actual_paid_inr_cents: row.actualPaidInrCents,
    fx_commission_inr_cents: row.fxCommissionInrCents,
    total_commission_usd_cents: row.totalCommissionUsdCents,
    commission_earned_inr_cents: row.commissionEarnedInrCents,
    gross_earnings_inr_cents: row.grossEarningsInrCents,
    net_profit_inr_cents: row.netProfitInrCents,
    is_security_deposit_month: row.isSecurityDepositMonth,
    source_updated_at: row.sourceUpdatedAt,
    rebuilt_at: row.rebuiltAt,
  };
}

function companySummaryToDb(row: PnCompanyMonthSummaryRow) {
  return {
    company_id: row.companyId,
    payment_month: row.paymentMonth,
    year: row.year,
    month: row.month ?? 1,
    dollar_inward_usd_cents: row.dollarInwardUsdCents,
    onboarding_advance_usd_cents: row.onboardingAdvanceUsdCents,
    reimbursement_usd_cents: row.reimbursementUsdCents,
    reimbursement_labels_text: row.reimbursementLabelsText,
    reimbursement_inr_cents: row.reimbursementInrCents,
    appraisal_advance_usd_cents: row.appraisalAdvanceUsdCents,
    appraisal_advance_inr_cents: row.appraisalAdvanceInrCents,
    offboarding_deduction_usd_cents: row.offboardingDeductionUsdCents,
    effective_dollar_inward_usd_cents: row.effectiveDollarInwardUsdCents,
    cashout_usd_inr_rate: row.cashoutUsdInrRate,
    cash_in_inr_cents: row.cashInInrCents,
    paid_usd_inr_rate: row.paidUsdInrRate,
    monthly_paid_inr_cents: row.monthlyPaidInrCents,
    pf_inr_cents: row.pfInrCents,
    tds_inr_cents: row.tdsInrCents,
    actual_paid_inr_cents: row.actualPaidInrCents,
    salary_paid_inr_cents: row.salaryPaidInrCents,
    fx_commission_inr_cents: row.fxCommissionInrCents,
    total_commission_usd_cents: row.totalCommissionUsdCents,
    commission_earned_inr_cents: row.commissionEarnedInrCents,
    gross_earnings_inr_cents: row.grossEarningsInrCents,
    expenses_inr_cents: row.expensesInrCents,
    company_reimbursement_usd_cents: row.companyReimbursementUsdCents,
    company_reimbursement_inr_cents: row.companyReimbursementInrCents,
    net_pl_inr_cents: row.netPlInrCents,
    source_updated_at: row.sourceUpdatedAt,
    rebuilt_at: row.rebuiltAt,
  };
}

export async function rebuildPnSummariesForCompany(companyId: string) {
  if (!companyId) return;

  const dashboardData = await getPnDashboardData({ companyId, periodType: "monthly" });
  const rebuiltAt = new Date().toISOString();
  const employeeRows: PnEmployeeMonthSummaryRow[] = dashboardData.employeeEditableSections.flatMap(
    (section) =>
      section.rows.map((row) => ({
        ...row,
        companyId,
        employeeId: section.employeeId,
        employeeName: section.employeeName,
        paymentMonth: monthKey(row.year, row.month),
        rebuiltAt,
        sourceUpdatedAt: rebuiltAt,
      })),
  );
  const companyRows: PnCompanyMonthSummaryRow[] = dashboardData.periodRows
    .filter(hasMonth)
    .map((row) => ({
      ...row,
      companyId,
      paymentMonth: monthKey(row.year, row.month),
      rebuiltAt,
      sourceUpdatedAt: rebuiltAt,
    }));

  const supabase = await getSupabaseOrThrow();
  const [employeeDelete, companyDelete] = await Promise.all([
    supabase.from("pn_employee_month_summaries").delete().eq("company_id", companyId),
    supabase.from("pn_company_month_summaries").delete().eq("company_id", companyId),
  ]);
  if (employeeDelete.error) throw employeeDelete.error;
  if (companyDelete.error) throw companyDelete.error;

  if (employeeRows.length > 0) {
    const { error } = await supabase
      .from("pn_employee_month_summaries")
      .upsert(employeeRows.map(employeeSummaryToDb), {
        onConflict: "company_id,employee_id,payment_month",
      });
    if (error) throw error;
  }

  if (companyRows.length > 0) {
    const { error } = await supabase
      .from("pn_company_month_summaries")
      .upsert(companyRows.map(companySummaryToDb), {
        onConflict: "company_id,payment_month",
      });
    if (error) throw error;
  }
}

export async function getInvoiceCompanyId(invoiceId: string) {
  const supabase = await getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("invoices")
    .select("company_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (error) throw error;
  return data?.company_id as string | undefined;
}

export async function getCompanyExpenseCompanyId(expenseId: string) {
  const supabase = await getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("company_expenses")
    .select("company_id")
    .eq("id", expenseId)
    .maybeSingle();
  if (error) throw error;
  return data?.company_id as string | undefined;
}

export async function getEmployeeCashFlowEntryCompanyId(entryId: string) {
  const supabase = await getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("invoice_payment_employee_entries")
    .select("company_id")
    .eq("id", entryId)
    .maybeSingle();
  if (error) throw error;
  return data?.company_id as string | undefined;
}

export async function rebuildPnSummariesForInvoice(invoiceId: string) {
  const companyId = await getInvoiceCompanyId(invoiceId);
  if (companyId) {
    await rebuildPnSummariesForCompany(companyId);
  }
}
