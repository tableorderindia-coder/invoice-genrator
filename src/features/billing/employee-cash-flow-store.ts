import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  calculateCashInInrCents,
  calculateEffectiveDollarInwardUsdCents,
  calculateEmployeeMonthNetInrCents,
  resolveEmployeeCashFlowStatus,
} from "./employee-cash-flow";
import { calculateEmployeePayoutMetrics } from "./domain";
import { calculateSalaryPaidInrCents } from "./payroll";
import { hasMissingSchemaColumn } from "./schema-fallback";
import type {
  EmployeeCashFlowEditableEntry,
  EmployeeCashFlowEntryWriteInput,
  EmployeeCashFlowInvoiceOption,
  EmployeeCashFlowMonthRow,
  EmployeeCashFlowSavedEntry,
} from "./employee-cash-flow-types";

type CashFlowPaymentEntryInput = {
  employeeId: string;
  paymentMonth: string;
  invoicePaymentId?: string;
  batchLabel?: string;
  cashInInrCents: number;
  effectiveDollarInwardUsdCents: number;
  onboardingAdvanceUsdCents: number;
  reimbursementUsdCents: number;
  reimbursementLabelsText: string;
  appraisalAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
  monthlyPaidInrCents: number;
  actualPaidInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
  salaryPaidInrCents: number;
  daysWorked: number;
  daysInMonth: number;
  cashoutUsdInrRate: number;
  paidUsdInrRate: number;
  employeeName: string;
  companyId: string;
  invoiceNumber: string;
};

type CashFlowAccrualInput = {
  employeeId: string;
  month: string;
  accrualInrCents: number;
};

type DbInvoiceOption = {
  id: string;
  invoice_number: string;
  company_id: string;
  month: number;
  year: number;
};

type DbInvoice = DbInvoiceOption & {
  status: string;
};

type DbInvoiceRealization = {
  invoice_id: string;
  dollar_inbound_usd_cents: number;
  usd_inr_rate: number | null;
};

type DbInvoicePayment = {
  id: string;
  payment_date: string;
  payment_month: string;
  usd_inr_rate: number;
};

type DbInvoiceAdjustment = {
  invoice_id: string;
  type: "onboarding" | "offboarding" | "reimbursement" | "appraisal";
  employee_name: string | null;
  label?: string | null;
  amount_usd_cents: number;
};

type DbEmployeePayout = {
  id: string;
  invoice_id: string;
  company_id: string;
  employee_id: string;
  invoice_line_item_id: string | null;
  employee_name_snapshot: string;
  dollar_inward_usd_cents: number;
  cashout_usd_inr_rate: number;
  paid_usd_inr_rate: number | null;
  pf_inr_cents: number | null;
  tds_inr_cents: number | null;
  actual_paid_inr_cents: number | null;
  fx_commission_inr_cents: number | null;
  total_commission_usd_cents: number;
  commission_earned_inr_cents: number | null;
  is_non_invoice_employee: boolean | null;
  is_paid: boolean;
  paid_at: string | null;
};

type DbInvoiceLineItem = {
  id: string;
  employee_id: string;
  employee_name_snapshot?: string | null;
  billed_total_usd_cents?: number | null;
  manual_total_usd_cents?: number | null;
  days_worked?: number | null;
};

type DbCashFlowEntry = {
  id: string;
  invoice_payment_id?: string;
  employee_id: string;
  payment_month: string;
  invoice_line_item_id: string | null;
  employee_name_snapshot: string;
  company_id: string;
  base_dollar_inward_usd_cents: number;
  onboarding_advance_usd_cents: number;
  reimbursement_usd_cents: number;
  reimbursement_labels_text: string | null;
  appraisal_advance_usd_cents: number;
  offboarding_deduction_usd_cents: number;
  effective_dollar_inward_usd_cents: number;
  cashout_usd_inr_rate: number;
  paid_usd_inr_rate: number;
  cash_in_inr_cents: number;
  pf_inr_cents: number;
  tds_inr_cents: number;
  actual_paid_inr_cents: number;
  monthly_paid_inr_cents: number;
  salary_paid_inr_cents: number;
  fx_commission_inr_cents: number;
  total_commission_usd_cents: number;
  commission_earned_inr_cents: number;
  gross_earnings_inr_cents: number;
  is_non_invoice_employee: boolean;
  is_paid: boolean;
  paid_at: string | null;
  notes: string | null;
  days_worked: number;
  days_in_month: number;
  invoice_id: string;
};

type DbMonthlySalaryPayment = {
  employee_id: string;
  paid_usd_inr_rate: number | null;
  monthly_paid_inr_cents: number | null;
  actual_paid_inr_cents: number | null;
  salary_paid_inr_cents: number | null;
  pf_inr_cents: number | null;
  tds_inr_cents: number | null;
  override_note: string | null;
};

type AdjustmentAwareEmployee = {
  id: string;
  fullName: string;
  companyId: string;
  defaultPaidUsdInrRate?: number;
  defaultMonthlyPaidInrCents?: number;
  defaultActualPaidInrCents?: number;
  defaultPfInrCents?: number;
  defaultTdsInrCents?: number;
  onboardingAdvanceUsdCents: number;
  reimbursementUsdCents: number;
  reimbursementLabelsText: string;
  appraisalAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
};

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

async function getSupabaseOrThrow() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before running the app.",
    );
  }

  return client;
}

function safeSalaryPaidInrCents(input: {
  actualPaidInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
}) {
  try {
    return calculateSalaryPaidInrCents(input);
  } catch {
    return 0;
  }
}

const nowIso = () => new Date().toISOString();
const nextCashFlowId = (prefix: string) =>
  `${prefix}_${nowIso().replace(/[-:.TZ]/g, "").slice(0, 14)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

function normalizeInvoiceNumber(invoiceNumber: string, invoiceNumbers: Set<string>) {
  if (invoiceNumber) {
    invoiceNumbers.add(invoiceNumber);
  }

  return [...invoiceNumbers].sort().join(", ");
}

function buildCashFlowBatchLabel(invoiceNumber: string, invoicePaymentId?: string | null) {
  if (!invoicePaymentId) {
    return invoiceNumber;
  }

  return `${invoiceNumber} • ${invoicePaymentId.slice(-6)}`;
}

export function normalizeEmployeeNameForMatch(name: string | null | undefined) {
  return String(name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function appendMissingAdjustmentEntries(input: {
  entries: EmployeeCashFlowEditableEntry[];
  availableEmployees: AdjustmentAwareEmployee[];
  paymentMonth: string;
  daysInMonth: number;
  cashoutUsdInrRate: number;
  invoiceId: string;
  invoiceNumber: string;
}) {
  const existingEmployeeIds = new Set(input.entries.map((entry) => entry.employeeId));
  const missingAdjustmentEntries: EmployeeCashFlowEditableEntry[] = input.availableEmployees
    .filter((employee) => !existingEmployeeIds.has(employee.id))
    .filter(
      (employee) =>
        employee.onboardingAdvanceUsdCents > 0 ||
        employee.reimbursementUsdCents > 0 ||
        employee.appraisalAdvanceUsdCents > 0 ||
        employee.offboardingDeductionUsdCents > 0,
    )
    .map((employee) => ({
      id: nextCashFlowId("cash_entry"),
      clientBatchId: input.invoiceId,
      invoicePaymentId: undefined,
      batchLabel: buildCashFlowBatchLabel(input.invoiceNumber),
      invoiceId: input.invoiceId,
      invoiceNumber: input.invoiceNumber,
      employeeId: employee.id,
      employeeNameSnapshot: employee.fullName,
      daysWorked: 0,
      daysInMonth: input.daysInMonth,
      baseDollarInwardUsdCents: 0,
      onboardingAdvanceUsdCents: employee.onboardingAdvanceUsdCents,
      reimbursementUsdCents: employee.reimbursementUsdCents,
      reimbursementLabelsText: employee.reimbursementLabelsText,
      appraisalAdvanceUsdCents: employee.appraisalAdvanceUsdCents,
      offboardingDeductionUsdCents: employee.offboardingDeductionUsdCents,
      cashoutUsdInrRate: input.cashoutUsdInrRate,
      paidUsdInrRate: employee.defaultPaidUsdInrRate ?? 0,
      monthlyPaidInrCents:
        employee.defaultMonthlyPaidInrCents ?? employee.defaultActualPaidInrCents ?? 0,
      pfInrCents: employee.defaultPfInrCents ?? 0,
      tdsInrCents: employee.defaultTdsInrCents ?? 0,
      actualPaidInrCents: employee.defaultActualPaidInrCents ?? 0,
      salaryPaidInrCents: safeSalaryPaidInrCents({
        actualPaidInrCents: employee.defaultActualPaidInrCents ?? 0,
        pfInrCents: employee.defaultPfInrCents ?? 0,
        tdsInrCents: employee.defaultTdsInrCents ?? 0,
      }),
      fxCommissionInrCents: 0,
      totalCommissionUsdCents: 0,
      commissionEarnedInrCents: 0,
      grossEarningsInrCents: 0,
      isNonInvoiceEmployee: true,
      isPaid: false,
      paidAt: undefined,
      notes: `Imported from invoice adjustment for ${input.paymentMonth}.`,
    }));

  return [...input.entries, ...missingAdjustmentEntries];
}

async function listInvoiceLineItemsForCashFlow(
  supabase: SupabaseServerClient,
  input: {
    invoiceLineItemIds?: string[];
    invoiceId?: string;
  },
) {
  if (!supabase) {
    return [] as DbInvoiceLineItem[];
  }

  const invoiceLineItemIds = [...new Set(input.invoiceLineItemIds ?? [])];
  let query = supabase
    .from("invoice_line_items")
    .select(
      "id, employee_id, employee_name_snapshot, billed_total_usd_cents, manual_total_usd_cents, days_worked",
    );

  if (invoiceLineItemIds.length > 0) {
    query = query.in("id", invoiceLineItemIds);
  } else if (input.invoiceId) {
    const teamResult = await supabase
      .from("invoice_teams")
      .select("id")
      .eq("invoice_id", input.invoiceId);
    if (teamResult.error) throw teamResult.error;

    const invoiceTeamIds = (teamResult.data ?? []).map((row) => String(row.id));
    if (invoiceTeamIds.length === 0) {
      return [] as DbInvoiceLineItem[];
    }

    query = query.in("invoice_team_id", invoiceTeamIds);
  } else {
    return [] as DbInvoiceLineItem[];
  }

  const result = await query;

  if (!result.error) {
    return (result.data ?? []) as DbInvoiceLineItem[];
  }

  if (
    !hasMissingSchemaColumn(result.error, "invoice_line_items", "days_worked")
  ) {
    throw result.error;
  }

  let fallbackQuery = supabase
    .from("invoice_line_items")
    .select(
      "id, employee_id, employee_name_snapshot, billed_total_usd_cents, manual_total_usd_cents",
    );
  if (invoiceLineItemIds.length > 0) {
    fallbackQuery = fallbackQuery.in("id", invoiceLineItemIds);
  } else if (input.invoiceId) {
    const teamResult = await supabase
      .from("invoice_teams")
      .select("id")
      .eq("invoice_id", input.invoiceId);
    if (teamResult.error) throw teamResult.error;

    const invoiceTeamIds = (teamResult.data ?? []).map((row) => String(row.id));
    if (invoiceTeamIds.length === 0) {
      return [] as DbInvoiceLineItem[];
    }

    fallbackQuery = fallbackQuery.in("invoice_team_id", invoiceTeamIds);
  } else {
    return [] as DbInvoiceLineItem[];
  }

  const fallbackResult = await fallbackQuery;
  if (fallbackResult.error) throw fallbackResult.error;

  return (fallbackResult.data ?? []) as DbInvoiceLineItem[];
}

export function buildInvoiceCashFlowFallbackEntries(input: {
  invoice: DbInvoice;
  invoicePayment: DbInvoicePayment | null;
  lineItems: DbInvoiceLineItem[];
  availableEmployees: AdjustmentAwareEmployee[];
  onboardingByEmployeeName: Map<string, number>;
  reimbursementByEmployeeName: Map<string, number>;
  reimbursementLabelsByEmployeeName: Map<string, Set<string>>;
  appraisalByEmployeeName: Map<string, number>;
  offboardingByEmployeeName: Map<string, number>;
  realization: DbInvoiceRealization | null;
  daysInMonth: number;
}) {
  const employeeDefaultsById = new Map(
    input.availableEmployees.map((employee) => [employee.id, employee]),
  );

  return input.lineItems
    .filter((lineItem) => Boolean(lineItem.employee_id))
    .map((lineItem) => {
      const employeeNameSnapshot = String(
        lineItem.employee_name_snapshot ??
          input.availableEmployees.find((employee) => employee.id === lineItem.employee_id)
            ?.fullName ??
          "",
      );
      const employeeNameKey = normalizeEmployeeNameForMatch(employeeNameSnapshot);
      const onboardingAdvanceUsdCents =
        input.onboardingByEmployeeName.get(employeeNameKey) ?? 0;
      const reimbursementUsdCents =
        input.reimbursementByEmployeeName.get(employeeNameKey) ?? 0;
      const reimbursementLabelsText = [
        ...(input.reimbursementLabelsByEmployeeName.get(employeeNameKey) ?? new Set<string>()),
      ].join(", ");
      const appraisalAdvanceUsdCents =
        input.appraisalByEmployeeName.get(employeeNameKey) ?? 0;
      const offboardingDeductionUsdCents =
        input.offboardingByEmployeeName.get(employeeNameKey) ?? 0;
      const baseDollarInwardUsdCents =
        lineItem.manual_total_usd_cents ??
        lineItem.billed_total_usd_cents ??
        0;
      const effectiveDollarInwardUsdCents = calculateEffectiveDollarInwardUsdCents({
        baseDollarInwardUsdCents,
        onboardingAdvanceUsdCents,
        reimbursementUsdCents,
        appraisalAdvanceUsdCents,
        offboardingDeductionUsdCents,
      });
      const cashoutUsdInrRate = input.realization?.usd_inr_rate ?? 0;
      const employeeDefaults = employeeDefaultsById.get(lineItem.employee_id);
      const paidUsdInrRate = employeeDefaults?.defaultPaidUsdInrRate ?? 0;
      const monthlyPaidInrCents =
        employeeDefaults?.defaultMonthlyPaidInrCents ??
        employeeDefaults?.defaultActualPaidInrCents ??
        0;
      const actualPaidInrCents = employeeDefaults?.defaultActualPaidInrCents ?? 0;
      const pfInrCents = employeeDefaults?.defaultPfInrCents ?? 0;
      const tdsInrCents = employeeDefaults?.defaultTdsInrCents ?? 0;
      const salaryPaidInrCents = safeSalaryPaidInrCents({
        actualPaidInrCents,
        pfInrCents,
        tdsInrCents,
      });
      const metrics = calculateEmployeePayoutMetrics({
        dollarInwardUsdCents: effectiveDollarInwardUsdCents,
        actualPaidInrCents,
        receivedUsdInrRate: cashoutUsdInrRate,
        pegUsdInrRate: paidUsdInrRate,
      });
      const daysWorked = lineItem.days_worked ?? input.daysInMonth;

      return {
        id: nextCashFlowId("cash_entry"),
        clientBatchId: input.invoicePayment?.id ?? input.invoice.id,
        invoicePaymentId: input.invoicePayment?.id ?? undefined,
        batchLabel: buildCashFlowBatchLabel(
          input.invoice.invoice_number,
          input.invoicePayment?.id,
        ),
        invoiceId: input.invoice.id,
        invoiceNumber: input.invoice.invoice_number,
        employeeId: lineItem.employee_id,
        employeeNameSnapshot,
        invoiceLineItemId: lineItem.id,
        daysWorked,
        daysInMonth: input.daysInMonth,
        baseDollarInwardUsdCents,
        onboardingAdvanceUsdCents,
        reimbursementUsdCents,
        reimbursementLabelsText,
        appraisalAdvanceUsdCents,
        offboardingDeductionUsdCents,
        effectiveDollarInwardUsdCents,
        cashoutUsdInrRate,
        paidUsdInrRate,
        monthlyPaidInrCents,
        cashInInrCents: calculateCashInInrCents({
          effectiveDollarInwardUsdCents,
          cashoutUsdInrRate,
        }),
        pfInrCents,
        tdsInrCents,
        actualPaidInrCents,
        salaryPaidInrCents,
        fxCommissionInrCents: metrics.fxCommissionInrCents,
        totalCommissionUsdCents: metrics.totalCommissionUsdCents,
        commissionEarnedInrCents: metrics.commissionEarnedInrCents,
        grossEarningsInrCents:
          metrics.fxCommissionInrCents + metrics.commissionEarnedInrCents,
        isNonInvoiceEmployee: false,
        isPaid: false,
        paidAt: undefined,
        notes: "",
      };
    });
}

export function buildEmployeeCashFlowMonthRows(input: {
  paymentEntries: CashFlowPaymentEntryInput[];
  salaryPayments: Array<{
    employeeId: string;
    month: string;
    monthlyPaidInrCents?: number;
    actualPaidInrCents?: number;
    salaryPaidInrCents: number;
  }>;
  accrualByEmployeeMonth: CashFlowAccrualInput[];
}): EmployeeCashFlowMonthRow[] {
  const salaryMap = new Map<string, number>();
  for (const row of input.salaryPayments) {
    salaryMap.set(`${row.employeeId}:${row.month}`, row.salaryPaidInrCents);
  }

  const accrualMap = new Map<string, number>();
  for (const row of input.accrualByEmployeeMonth) {
    accrualMap.set(`${row.employeeId}:${row.month}`, row.accrualInrCents);
  }

  const grouped = new Map<
    string,
    EmployeeCashFlowMonthRow & { invoiceNumbers: Set<string> }
  >();

  for (const row of input.paymentEntries) {
    const key = `${row.employeeId}:${row.paymentMonth}`;
    const savedSalaryPaidInrCents = salaryMap.get(key) ?? 0;
    const fallbackSalaryPaidInrCents = safeSalaryPaidInrCents({
      actualPaidInrCents: row.actualPaidInrCents ?? 0,
      pfInrCents: row.pfInrCents ?? 0,
      tdsInrCents: row.tdsInrCents ?? 0,
    });
    const salaryPaidInrCents =
      row.salaryPaidInrCents && row.salaryPaidInrCents > 0
        ? row.salaryPaidInrCents
        : savedSalaryPaidInrCents || fallbackSalaryPaidInrCents;

    const existing = grouped.get(key);
    if (existing) {
      existing.daysWorked += row.daysWorked;
      existing.baseDollarInwardUsdCents +=
        row.effectiveDollarInwardUsdCents -
        row.onboardingAdvanceUsdCents +
        row.offboardingDeductionUsdCents -
        row.reimbursementUsdCents -
        row.appraisalAdvanceUsdCents;
      existing.onboardingAdvanceUsdCents += row.onboardingAdvanceUsdCents;
      existing.reimbursementUsdCents += row.reimbursementUsdCents;
      existing.reimbursementLabelsText = [existing.reimbursementLabelsText, row.reimbursementLabelsText]
        .filter(Boolean)
        .join(", ");
      existing.appraisalAdvanceUsdCents += row.appraisalAdvanceUsdCents;
      existing.offboardingDeductionUsdCents += row.offboardingDeductionUsdCents;
      existing.effectiveDollarInwardUsdCents += row.effectiveDollarInwardUsdCents;
      existing.reimbursementInrCents += Math.round(
        row.reimbursementUsdCents * row.cashoutUsdInrRate,
      );
      existing.appraisalAdvanceInrCents += Math.round(
        row.appraisalAdvanceUsdCents * row.cashoutUsdInrRate,
      );
      existing.cashInInrCents += row.cashInInrCents;
      existing.cashoutUsdInrRate = row.cashoutUsdInrRate;
      existing.paidUsdInrRate = row.paidUsdInrRate;
      existing.invoiceNumber = normalizeInvoiceNumber(
        row.invoiceNumber,
        existing.invoiceNumbers,
      );
      existing.monthlyPaidInrCents += row.monthlyPaidInrCents ?? row.actualPaidInrCents ?? 0;
      existing.actualPaidInrCents += row.actualPaidInrCents ?? 0;
      existing.pfInrCents += row.pfInrCents ?? 0;
      existing.tdsInrCents += row.tdsInrCents ?? 0;
      existing.salaryPaidInrCents += salaryPaidInrCents;
      const accrualInrCents = accrualMap.get(key) ?? 0;
      existing.pendingAmountInrCents = accrualInrCents - existing.cashInInrCents;
      existing.netInrCents = calculateEmployeeMonthNetInrCents({
        cashInInrCents: existing.cashInInrCents,
        salaryPaidInrCents: existing.salaryPaidInrCents,
      });
      existing.status = resolveEmployeeCashFlowStatus({
        effectiveDollarInwardUsdCents: existing.effectiveDollarInwardUsdCents,
        salaryPaidInrCents: existing.salaryPaidInrCents,
        netInrCents: existing.netInrCents,
      });
      continue;
    }

    const accrualInrCents = accrualMap.get(key) ?? 0;
    const invoiceNumbers = new Set<string>();
    const cashFlowRow: EmployeeCashFlowMonthRow & { invoiceNumbers: Set<string> } = {
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      companyId: row.companyId,
      paymentMonth: row.paymentMonth,
      invoiceNumber: normalizeInvoiceNumber(row.invoiceNumber, invoiceNumbers),
      daysWorked: row.daysWorked,
      daysInMonth: row.daysInMonth,
      baseDollarInwardUsdCents:
        row.effectiveDollarInwardUsdCents -
        row.onboardingAdvanceUsdCents -
        row.reimbursementUsdCents -
        row.appraisalAdvanceUsdCents +
        row.offboardingDeductionUsdCents,
      onboardingAdvanceUsdCents: row.onboardingAdvanceUsdCents,
      reimbursementUsdCents: row.reimbursementUsdCents,
      reimbursementLabelsText: row.reimbursementLabelsText,
      appraisalAdvanceUsdCents: row.appraisalAdvanceUsdCents,
      offboardingDeductionUsdCents: row.offboardingDeductionUsdCents,
      effectiveDollarInwardUsdCents: row.effectiveDollarInwardUsdCents,
      cashoutUsdInrRate: row.cashoutUsdInrRate,
      reimbursementInrCents: Math.round(row.reimbursementUsdCents * row.cashoutUsdInrRate),
      appraisalAdvanceInrCents: Math.round(
        row.appraisalAdvanceUsdCents * row.cashoutUsdInrRate,
      ),
      paidUsdInrRate: row.paidUsdInrRate,
      monthlyPaidInrCents: row.monthlyPaidInrCents ?? row.actualPaidInrCents ?? 0,
      actualPaidInrCents: row.actualPaidInrCents ?? 0,
      pfInrCents: row.pfInrCents ?? 0,
      tdsInrCents: row.tdsInrCents ?? 0,
      cashInInrCents: row.cashInInrCents,
      salaryPaidInrCents,
      pendingAmountInrCents: accrualInrCents - row.cashInInrCents,
      netInrCents: calculateEmployeeMonthNetInrCents({
        cashInInrCents: row.cashInInrCents,
        salaryPaidInrCents,
      }),
      status: "profit",
      invoiceNumbers,
    };
    cashFlowRow.status = resolveEmployeeCashFlowStatus({
      effectiveDollarInwardUsdCents: cashFlowRow.effectiveDollarInwardUsdCents,
      salaryPaidInrCents,
      netInrCents: cashFlowRow.netInrCents,
    });
    grouped.set(key, cashFlowRow);
  }

  return [...grouped.values()]
    .map(({ invoiceNumbers, ...row }) => {
      void invoiceNumbers;
      return row;
    })
    .sort((left, right) =>
      `${right.paymentMonth}:${right.employeeName}`.localeCompare(
        `${left.paymentMonth}:${left.employeeName}`,
      ),
    );
}

export async function listCashFlowInvoiceOptions(input: {
  companyId: string;
}): Promise<EmployeeCashFlowInvoiceOption[]> {
  const supabase = await getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, company_id, month, year")
    .eq("company_id", input.companyId)
    .eq("status", "cashed_out")
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as DbInvoiceOption[]).map((row) => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    companyId: row.company_id,
    month: row.month,
    year: row.year,
  }));
}

export async function getInvoicePaymentPrefillData(input: {
  invoiceId: string;
  paymentMonth: string;
}) {
  const supabase = await getSupabaseOrThrow();
  const [{ data: invoiceRow, error: invoiceError }, { data: payoutRows, error: payoutError }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("id, invoice_number, company_id, month, year, status")
        .eq("id", input.invoiceId)
        .maybeSingle(),
      supabase.from("employee_payouts").select("*").eq("invoice_id", input.invoiceId),
    ]);

  if (invoiceError) throw invoiceError;
  if (!invoiceRow) {
    throw new Error("Selected invoice was not found.");
  }
  if ((invoiceRow as DbInvoice).status !== "cashed_out") {
    throw new Error("Only cashed out invoices can be used in employee cash flow.");
  }
  if (payoutError) throw payoutError;

  const invoice = invoiceRow as DbInvoice;
  const payouts = (payoutRows ?? []) as DbEmployeePayout[];

  const [
    realizationResult,
    lineItemResult,
    adjustmentResult,
    employeesResult,
    salaryPaymentResult,
    invoicePaymentResult,
  ] =
    await Promise.all([
      supabase
        .from("invoice_realizations")
        .select("invoice_id, dollar_inbound_usd_cents, usd_inr_rate")
        .eq("invoice_id", input.invoiceId)
        .maybeSingle(),
      listInvoiceLineItemsForCashFlow(supabase, {
        invoiceId: input.invoiceId,
        invoiceLineItemIds: payouts
          .map((row) => row.invoice_line_item_id)
          .filter((value): value is string => Boolean(value)),
      }),
      supabase
        .from("invoice_adjustments")
        .select("invoice_id, type, employee_name, label, amount_usd_cents")
        .eq("invoice_id", input.invoiceId),
      supabase
        .from("employees")
        .select("*")
        .eq("company_id", invoice.company_id)
        .order("full_name"),
      supabase
        .from("employee_salary_payments")
        .select("employee_id, paid_usd_inr_rate, monthly_paid_inr_cents, actual_paid_inr_cents, salary_paid_inr_cents, pf_inr_cents, tds_inr_cents, override_note")
        .eq("company_id", invoice.company_id)
        .eq("month", input.paymentMonth)
        .eq("status", "verified"),
      supabase
        .from("invoice_payments")
        .select("id, payment_date, payment_month, usd_inr_rate")
        .eq("invoice_id", input.invoiceId)
        .eq("payment_month", input.paymentMonth)
        .order("payment_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (realizationResult.error) throw realizationResult.error;
  if (adjustmentResult.error) throw adjustmentResult.error;
  if (employeesResult.error) throw employeesResult.error;
  if (salaryPaymentResult.error) throw salaryPaymentResult.error;
  if (invoicePaymentResult.error) throw invoicePaymentResult.error;

  const lineItems = new Map<string, DbInvoiceLineItem>(
    (lineItemResult as DbInvoiceLineItem[]).map((row) => [row.id, row]),
  );
  const adjustments = (adjustmentResult.data ?? []) as DbInvoiceAdjustment[];
  const realization = (realizationResult.data ?? null) as DbInvoiceRealization | null;
  const invoicePayment = (invoicePaymentResult.data ?? null) as DbInvoicePayment | null;
  const salaryPaymentsByEmployeeId = new Map(
    ((salaryPaymentResult.data ?? []) as DbMonthlySalaryPayment[]).map((row) => [
      row.employee_id,
      row,
    ]),
  );

  let savedEntries: DbCashFlowEntry[] = [];
  if (invoicePayment?.id) {
    const savedEntriesResult = await supabase
      .from("invoice_payment_employee_entries")
      .select(
        "id, employee_id, payment_month, invoice_line_item_id, employee_name_snapshot, company_id, base_dollar_inward_usd_cents, onboarding_advance_usd_cents, reimbursement_usd_cents, reimbursement_labels_text, appraisal_advance_usd_cents, offboarding_deduction_usd_cents, effective_dollar_inward_usd_cents, cashout_usd_inr_rate, paid_usd_inr_rate, monthly_paid_inr_cents, cash_in_inr_cents, pf_inr_cents, tds_inr_cents, actual_paid_inr_cents, salary_paid_inr_cents, fx_commission_inr_cents, total_commission_usd_cents, commission_earned_inr_cents, gross_earnings_inr_cents, is_non_invoice_employee, is_paid, paid_at, notes, days_worked, days_in_month, invoice_id",
      )
      .eq("invoice_payment_id", invoicePayment.id)
      .order("employee_name_snapshot");
    if (savedEntriesResult.error) throw savedEntriesResult.error;
    savedEntries = (savedEntriesResult.data ?? []) as DbCashFlowEntry[];
  }

  const onboardingByEmployeeName = new Map<string, number>();
  const reimbursementByEmployeeName = new Map<string, number>();
  const reimbursementLabelsByEmployeeName = new Map<string, Set<string>>();
  const appraisalByEmployeeName = new Map<string, number>();
  const offboardingByEmployeeName = new Map<string, number>();
  for (const adjustment of adjustments) {
    const employeeName = normalizeEmployeeNameForMatch(adjustment.employee_name);

    if (adjustment.type === "onboarding" && employeeName) {
      onboardingByEmployeeName.set(
        employeeName,
        (onboardingByEmployeeName.get(employeeName) ?? 0) + adjustment.amount_usd_cents,
      );
    }

    if (adjustment.type === "reimbursement" && employeeName) {
      reimbursementByEmployeeName.set(
        employeeName,
        (reimbursementByEmployeeName.get(employeeName) ?? 0) + adjustment.amount_usd_cents,
      );
      const labels = reimbursementLabelsByEmployeeName.get(employeeName) ?? new Set<string>();
      if (adjustment.label) {
        labels.add(String(adjustment.label));
      }
      reimbursementLabelsByEmployeeName.set(employeeName, labels);
    }

    if (adjustment.type === "appraisal" && employeeName) {
      appraisalByEmployeeName.set(
        employeeName,
        (appraisalByEmployeeName.get(employeeName) ?? 0) + adjustment.amount_usd_cents,
      );
    }

    if (adjustment.type === "offboarding" && employeeName) {
      offboardingByEmployeeName.set(
        employeeName,
        (offboardingByEmployeeName.get(employeeName) ?? 0) + adjustment.amount_usd_cents,
      );
    }
  }

  const daysInMonth = (() => {
    const [year, month] = input.paymentMonth.split("-").map((value) => Number(value));
    return new Date(year, month, 0).getDate();
  })();

  const availableEmployees = (employeesResult.data ?? []).map((row) => {
    const employeeId = String(row.id);
    const employeeName = String(row.full_name);
    const payroll = salaryPaymentsByEmployeeId.get(employeeId);

    return {
      id: employeeId,
      fullName: employeeName,
      companyId: String(row.company_id),
      defaultPaidUsdInrRate: Number(
        payroll?.paid_usd_inr_rate ?? row.default_paid_usd_inr_rate ?? 0,
      ),
      defaultMonthlyPaidInrCents: Number(
        payroll?.monthly_paid_inr_cents ??
          row.default_actual_paid_inr_cents ??
          0,
      ),
      defaultActualPaidInrCents: Number(
        payroll?.actual_paid_inr_cents ??
          payroll?.monthly_paid_inr_cents ??
          row.default_actual_paid_inr_cents ??
          0,
      ),
      defaultPfInrCents: Number(payroll?.pf_inr_cents ?? row.default_pf_inr_cents ?? 0),
      defaultTdsInrCents: Number(payroll?.tds_inr_cents ?? row.default_tds_inr_cents ?? 0),
      onboardingAdvanceUsdCents:
        onboardingByEmployeeName.get(normalizeEmployeeNameForMatch(employeeName)) ?? 0,
      reimbursementUsdCents:
        reimbursementByEmployeeName.get(normalizeEmployeeNameForMatch(employeeName)) ?? 0,
      reimbursementLabelsText: [
        ...(
          reimbursementLabelsByEmployeeName.get(
            normalizeEmployeeNameForMatch(employeeName),
          ) ?? new Set<string>()
        ),
      ].join(", "),
      appraisalAdvanceUsdCents:
        appraisalByEmployeeName.get(normalizeEmployeeNameForMatch(employeeName)) ?? 0,
      offboardingDeductionUsdCents: Math.abs(
        offboardingByEmployeeName.get(normalizeEmployeeNameForMatch(employeeName)) ?? 0,
      ),
    };
  });
  const employeeDefaultsById = new Map(
    availableEmployees.map((employee) => [employee.id, employee]),
  );

  const baseEntries =
    savedEntries.length > 0
      ? savedEntries.map((row) => ({
          id: row.id,
          clientBatchId: invoicePayment?.id ?? row.id,
          invoicePaymentId: invoicePayment?.id ?? undefined,
          batchLabel: buildCashFlowBatchLabel(invoice.invoice_number, invoicePayment?.id),
          invoiceId: row.invoice_id,
          invoiceNumber: invoice.invoice_number,
          employeeId: row.employee_id,
          employeeNameSnapshot: row.employee_name_snapshot,
          invoiceLineItemId: row.invoice_line_item_id ?? undefined,
          daysWorked: row.days_worked ?? daysInMonth,
          daysInMonth: row.days_in_month ?? daysInMonth,
          baseDollarInwardUsdCents: row.base_dollar_inward_usd_cents,
          onboardingAdvanceUsdCents: row.onboarding_advance_usd_cents,
          reimbursementUsdCents: row.reimbursement_usd_cents,
          reimbursementLabelsText: row.reimbursement_labels_text ?? "",
          appraisalAdvanceUsdCents: row.appraisal_advance_usd_cents,
          offboardingDeductionUsdCents: Math.abs(row.offboarding_deduction_usd_cents),
          effectiveDollarInwardUsdCents: calculateEffectiveDollarInwardUsdCents({
            baseDollarInwardUsdCents: row.base_dollar_inward_usd_cents,
            onboardingAdvanceUsdCents: row.onboarding_advance_usd_cents,
            reimbursementUsdCents: row.reimbursement_usd_cents,
            appraisalAdvanceUsdCents: row.appraisal_advance_usd_cents,
            offboardingDeductionUsdCents: row.offboarding_deduction_usd_cents,
          }),
          cashoutUsdInrRate: row.cashout_usd_inr_rate,
          paidUsdInrRate: row.paid_usd_inr_rate,
          monthlyPaidInrCents: row.monthly_paid_inr_cents,
          cashInInrCents: calculateCashInInrCents({
            effectiveDollarInwardUsdCents: calculateEffectiveDollarInwardUsdCents({
              baseDollarInwardUsdCents: row.base_dollar_inward_usd_cents,
              onboardingAdvanceUsdCents: row.onboarding_advance_usd_cents,
              reimbursementUsdCents: row.reimbursement_usd_cents,
              appraisalAdvanceUsdCents: row.appraisal_advance_usd_cents,
              offboardingDeductionUsdCents: row.offboarding_deduction_usd_cents,
            }),
            cashoutUsdInrRate: row.cashout_usd_inr_rate,
          }),
          pfInrCents: row.pf_inr_cents,
          tdsInrCents: row.tds_inr_cents,
          actualPaidInrCents: row.actual_paid_inr_cents,
          salaryPaidInrCents: row.salary_paid_inr_cents,
          fxCommissionInrCents: row.fx_commission_inr_cents,
          totalCommissionUsdCents: row.total_commission_usd_cents,
          commissionEarnedInrCents: row.commission_earned_inr_cents,
          grossEarningsInrCents: row.gross_earnings_inr_cents,
          isNonInvoiceEmployee: row.is_non_invoice_employee,
            isPaid: row.is_paid,
            paidAt: row.paid_at ?? undefined,
            notes: row.notes ?? "",
          }))
      : payouts.length > 0
        ? payouts.map((row) => {
          const lineItem = row.invoice_line_item_id
            ? lineItems.get(row.invoice_line_item_id)
            : undefined;
          const employeeNameKey = normalizeEmployeeNameForMatch(row.employee_name_snapshot);
          const onboardingAdvanceUsdCents =
            onboardingByEmployeeName.get(employeeNameKey) ?? 0;
          const reimbursementUsdCents =
            reimbursementByEmployeeName.get(employeeNameKey) ?? 0;
          const reimbursementLabelsText = [
            ...(reimbursementLabelsByEmployeeName.get(employeeNameKey) ?? new Set<string>()),
          ].join(", ");
          const appraisalAdvanceUsdCents =
            appraisalByEmployeeName.get(employeeNameKey) ?? 0;
          const offboardingDeductionUsdCents = Math.abs(
            offboardingByEmployeeName.get(employeeNameKey) ?? 0,
          );
          const effectiveDollarInwardUsdCents = calculateEffectiveDollarInwardUsdCents({
            baseDollarInwardUsdCents: row.dollar_inward_usd_cents,
            onboardingAdvanceUsdCents,
            reimbursementUsdCents,
            appraisalAdvanceUsdCents,
            offboardingDeductionUsdCents,
          });
          const cashoutUsdInrRate =
            realization?.usd_inr_rate ?? row.cashout_usd_inr_rate ?? 0;
          const employeeDefaults = employeeDefaultsById.get(row.employee_id);
          const payroll = salaryPaymentsByEmployeeId.get(row.employee_id);
          const paidUsdInrRate =
            payroll?.paid_usd_inr_rate && payroll.paid_usd_inr_rate > 0
              ? payroll.paid_usd_inr_rate
              : row.paid_usd_inr_rate && row.paid_usd_inr_rate > 0
              ? row.paid_usd_inr_rate
              : employeeDefaults?.defaultPaidUsdInrRate ?? 0;
          const monthlyPaidInrCents =
            payroll?.monthly_paid_inr_cents && payroll.monthly_paid_inr_cents > 0
              ? payroll.monthly_paid_inr_cents
              : employeeDefaults?.defaultActualPaidInrCents ?? 0;
          const actualPaidInrCents =
            payroll?.actual_paid_inr_cents && payroll.actual_paid_inr_cents > 0
              ? payroll.actual_paid_inr_cents
              : row.actual_paid_inr_cents && row.actual_paid_inr_cents > 0
              ? row.actual_paid_inr_cents
              : employeeDefaults?.defaultActualPaidInrCents ?? 0;
          const metrics = calculateEmployeePayoutMetrics({
            dollarInwardUsdCents: effectiveDollarInwardUsdCents,
            actualPaidInrCents,
            receivedUsdInrRate: cashoutUsdInrRate,
            pegUsdInrRate: paidUsdInrRate,
          });

          const pfInrCents =
            payroll?.pf_inr_cents && payroll.pf_inr_cents > 0
              ? payroll.pf_inr_cents
              : row.pf_inr_cents && row.pf_inr_cents > 0
              ? row.pf_inr_cents
              : employeeDefaults?.defaultPfInrCents ?? 0;
          const tdsInrCents =
            payroll?.tds_inr_cents && payroll.tds_inr_cents > 0
              ? payroll.tds_inr_cents
              : row.tds_inr_cents && row.tds_inr_cents > 0
              ? row.tds_inr_cents
              : employeeDefaults?.defaultTdsInrCents ?? 0;
          const salaryPaidInrCents =
            payroll?.salary_paid_inr_cents && payroll.salary_paid_inr_cents > 0
              ? payroll.salary_paid_inr_cents
              : safeSalaryPaidInrCents({ actualPaidInrCents, pfInrCents, tdsInrCents });

          return {
            id: nextCashFlowId("cash_entry"),
            clientBatchId: invoicePayment?.id ?? invoice.id,
            invoicePaymentId: invoicePayment?.id ?? undefined,
            batchLabel: buildCashFlowBatchLabel(invoice.invoice_number, invoicePayment?.id),
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            employeeId: row.employee_id,
            employeeNameSnapshot: row.employee_name_snapshot,
            invoiceLineItemId: row.invoice_line_item_id ?? undefined,
            daysWorked: lineItem?.days_worked ?? daysInMonth,
            daysInMonth,
            baseDollarInwardUsdCents: row.dollar_inward_usd_cents,
            onboardingAdvanceUsdCents,
            reimbursementUsdCents,
            reimbursementLabelsText,
            appraisalAdvanceUsdCents,
          offboardingDeductionUsdCents,
          effectiveDollarInwardUsdCents,
            cashoutUsdInrRate,
            paidUsdInrRate,
            monthlyPaidInrCents,
            cashInInrCents: calculateCashInInrCents({
              effectiveDollarInwardUsdCents,
              cashoutUsdInrRate,
            }),
            pfInrCents,
            tdsInrCents,
            actualPaidInrCents,
            salaryPaidInrCents,
            fxCommissionInrCents: metrics.fxCommissionInrCents,
            totalCommissionUsdCents: metrics.totalCommissionUsdCents,
            commissionEarnedInrCents: metrics.commissionEarnedInrCents,
            grossEarningsInrCents:
              metrics.fxCommissionInrCents + metrics.commissionEarnedInrCents,
            isNonInvoiceEmployee: row.is_non_invoice_employee ?? false,
            isPaid: row.is_paid,
            paidAt: row.paid_at ?? undefined,
            notes: payroll?.override_note
              ? `Salary override: ${payroll.override_note}`
              : "",
          };
        })
        : buildInvoiceCashFlowFallbackEntries({
            invoice,
            invoicePayment,
            lineItems: [...lineItems.values()],
            availableEmployees,
            onboardingByEmployeeName,
            reimbursementByEmployeeName,
            reimbursementLabelsByEmployeeName,
            appraisalByEmployeeName,
            offboardingByEmployeeName,
            realization,
            daysInMonth,
          });

  const entries = appendMissingAdjustmentEntries({
    entries: baseEntries,
    availableEmployees,
    paymentMonth: input.paymentMonth,
    daysInMonth,
    cashoutUsdInrRate: realization?.usd_inr_rate ?? 0,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
  });

  return {
    invoicePaymentId: invoicePayment?.id ?? "",
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      companyId: invoice.company_id,
      month: invoice.month,
      year: invoice.year,
      paymentMonth: input.paymentMonth,
      dollarInboundUsdCents: realization?.dollar_inbound_usd_cents ?? 0,
      usdInrRate: realization?.usd_inr_rate ?? 0,
    },
    entries,
    availableEmployees,
  };
}

export async function upsertInvoicePayment(input: {
  invoicePaymentId?: string;
  invoiceId: string;
  companyId: string;
  paymentDate: string;
  paymentMonth: string;
  usdInrRate: number;
  notes?: string;
}) {
  const supabase = await getSupabaseOrThrow();
  const payload = {
    invoice_id: input.invoiceId,
    company_id: input.companyId,
    payment_date: input.paymentDate,
    payment_month: input.paymentMonth,
    usd_inr_rate: input.usdInrRate,
    notes: input.notes ?? null,
    updated_at: nowIso(),
  };

  if (input.invoicePaymentId) {
    const { error } = await supabase
      .from("invoice_payments")
      .update(payload)
      .eq("id", input.invoicePaymentId);
    if (error) throw error;
    return input.invoicePaymentId;
  }

  const id = nextCashFlowId("invoice_payment");
  const { error } = await supabase.from("invoice_payments").insert({
    id,
    ...payload,
    created_at: nowIso(),
  });
  if (error) throw error;
  return id;
}

export async function replaceInvoicePaymentEmployeeEntries(input: {
  invoicePaymentId: string;
  invoiceId: string;
  companyId: string;
  paymentMonth: string;
  entries: EmployeeCashFlowEntryWriteInput[];
}) {
  const supabase = await getSupabaseOrThrow();
  const { error: deleteError } = await supabase
    .from("invoice_payment_employee_entries")
    .delete()
    .eq("invoice_payment_id", input.invoicePaymentId);
  if (deleteError) throw deleteError;

  if (input.entries.length === 0) {
    return;
  }

  const payload = input.entries.map((entry) => {
    const offboardingDeductionUsdCents = Math.abs(entry.offboardingDeductionUsdCents);
    const effectiveDollarInwardUsdCents = calculateEffectiveDollarInwardUsdCents({
      baseDollarInwardUsdCents: entry.baseDollarInwardUsdCents,
      onboardingAdvanceUsdCents: entry.onboardingAdvanceUsdCents,
      reimbursementUsdCents: entry.reimbursementUsdCents,
      appraisalAdvanceUsdCents: entry.appraisalAdvanceUsdCents,
      offboardingDeductionUsdCents,
    });
    const payoutMetrics = calculateEmployeePayoutMetrics({
      dollarInwardUsdCents: effectiveDollarInwardUsdCents,
      actualPaidInrCents: entry.actualPaidInrCents,
      receivedUsdInrRate: entry.cashoutUsdInrRate,
      pegUsdInrRate: entry.paidUsdInrRate,
    });

    return {
      id: nextCashFlowId("cash_entry"),
      invoice_payment_id: input.invoicePaymentId,
      invoice_id: entry.invoiceId || input.invoiceId,
      employee_id: entry.employeeId,
      company_id: input.companyId,
      payment_month: input.paymentMonth,
      invoice_line_item_id: entry.invoiceLineItemId ?? null,
      employee_name_snapshot: entry.employeeNameSnapshot,
      days_worked: entry.daysWorked,
      days_in_month: entry.daysInMonth,
      base_dollar_inward_usd_cents: entry.baseDollarInwardUsdCents,
      onboarding_advance_usd_cents: entry.onboardingAdvanceUsdCents,
      reimbursement_usd_cents: entry.reimbursementUsdCents,
      reimbursement_labels_text: entry.reimbursementLabelsText || null,
      appraisal_advance_usd_cents: entry.appraisalAdvanceUsdCents,
      offboarding_deduction_usd_cents: offboardingDeductionUsdCents,
      effective_dollar_inward_usd_cents: effectiveDollarInwardUsdCents,
      cashout_usd_inr_rate: entry.cashoutUsdInrRate,
      paid_usd_inr_rate: entry.paidUsdInrRate,
      cash_in_inr_cents: calculateCashInInrCents({
        effectiveDollarInwardUsdCents,
        cashoutUsdInrRate: entry.cashoutUsdInrRate,
      }),
      monthly_paid_inr_cents: entry.monthlyPaidInrCents,
      pf_inr_cents: entry.pfInrCents,
      tds_inr_cents: entry.tdsInrCents,
      actual_paid_inr_cents: entry.actualPaidInrCents,
      salary_paid_inr_cents: entry.salaryPaidInrCents,
      fx_commission_inr_cents: payoutMetrics.fxCommissionInrCents,
      total_commission_usd_cents: payoutMetrics.totalCommissionUsdCents,
      commission_earned_inr_cents: payoutMetrics.commissionEarnedInrCents,
      gross_earnings_inr_cents:
        payoutMetrics.fxCommissionInrCents + payoutMetrics.commissionEarnedInrCents,
      is_non_invoice_employee: entry.isNonInvoiceEmployee,
      is_paid: entry.isPaid,
      paid_at: entry.paidAt ?? null,
      notes: entry.notes ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
  });

  const { error } = await supabase
    .from("invoice_payment_employee_entries")
    .insert(payload);
  if (error) throw error;
}

export async function listSavedEmployeeCashFlowEntries(input: {
  companyId: string;
  paymentMonth?: string;
}) {
  const supabase = await getSupabaseOrThrow();
  let query = supabase
    .from("invoice_payment_employee_entries")
    .select(
      "id, invoice_payment_id, invoice_id, employee_id, company_id, payment_month, invoice_line_item_id, employee_name_snapshot, days_worked, days_in_month, base_dollar_inward_usd_cents, onboarding_advance_usd_cents, reimbursement_usd_cents, reimbursement_labels_text, appraisal_advance_usd_cents, offboarding_deduction_usd_cents, cashout_usd_inr_rate, paid_usd_inr_rate, monthly_paid_inr_cents, pf_inr_cents, tds_inr_cents, actual_paid_inr_cents, salary_paid_inr_cents, fx_commission_inr_cents, total_commission_usd_cents, commission_earned_inr_cents, gross_earnings_inr_cents, is_non_invoice_employee, is_paid, paid_at, notes",
    )
    .eq("company_id", input.companyId)
    .order("employee_name_snapshot");
  if (input.paymentMonth) {
    query = query.eq("payment_month", input.paymentMonth);
  }
  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as DbCashFlowEntry[];
  const invoiceIds = [...new Set(rows.map((row) => row.invoice_id).filter(Boolean))];
  const { data: invoiceRows, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .in("id", invoiceIds.length > 0 ? invoiceIds : ["__none__"]);
  if (invoiceError) throw invoiceError;

  const invoiceMap = new Map(
    (invoiceRows ?? []).map((row) => [String(row.id), String(row.invoice_number ?? "")]),
  );

  return rows.map((row) => ({
    id: row.id,
    companyId: row.company_id,
    paymentMonth: row.payment_month,
    clientBatchId: row.invoice_payment_id ?? row.id,
    batchLabel: buildCashFlowBatchLabel(
      invoiceMap.get(row.invoice_id) ?? "",
      row.invoice_payment_id,
    ),
    invoicePaymentId: row.invoice_payment_id ?? undefined,
    invoiceId: row.invoice_id,
    invoiceNumber: invoiceMap.get(row.invoice_id) ?? "",
    employeeId: row.employee_id,
    employeeNameSnapshot: row.employee_name_snapshot,
    invoiceLineItemId: row.invoice_line_item_id ?? undefined,
    daysWorked: row.days_worked,
    daysInMonth: row.days_in_month,
    baseDollarInwardUsdCents: row.base_dollar_inward_usd_cents,
    onboardingAdvanceUsdCents: row.onboarding_advance_usd_cents,
    reimbursementUsdCents: row.reimbursement_usd_cents,
    reimbursementLabelsText: row.reimbursement_labels_text ?? "",
    appraisalAdvanceUsdCents: row.appraisal_advance_usd_cents,
    offboardingDeductionUsdCents: Math.abs(row.offboarding_deduction_usd_cents),
    cashoutUsdInrRate: row.cashout_usd_inr_rate,
    paidUsdInrRate: row.paid_usd_inr_rate,
    monthlyPaidInrCents: row.monthly_paid_inr_cents,
    pfInrCents: row.pf_inr_cents,
    tdsInrCents: row.tds_inr_cents,
    actualPaidInrCents: row.actual_paid_inr_cents,
    salaryPaidInrCents: row.salary_paid_inr_cents,
    fxCommissionInrCents: row.fx_commission_inr_cents,
    totalCommissionUsdCents: row.total_commission_usd_cents,
    commissionEarnedInrCents: row.commission_earned_inr_cents,
    grossEarningsInrCents: row.gross_earnings_inr_cents,
    isNonInvoiceEmployee: row.is_non_invoice_employee,
    isPaid: row.is_paid,
    paidAt: row.paid_at ?? undefined,
    notes: row.notes ?? "",
  })) as EmployeeCashFlowSavedEntry[];
}

export async function updateSavedEmployeeCashFlowEntry(
  entry: EmployeeCashFlowSavedEntry,
) {
  const supabase = await getSupabaseOrThrow();
  const offboardingDeductionUsdCents = Math.abs(entry.offboardingDeductionUsdCents);
  const effectiveDollarInwardUsdCents = calculateEffectiveDollarInwardUsdCents({
    baseDollarInwardUsdCents: entry.baseDollarInwardUsdCents,
    onboardingAdvanceUsdCents: entry.onboardingAdvanceUsdCents,
    reimbursementUsdCents: entry.reimbursementUsdCents,
    appraisalAdvanceUsdCents: entry.appraisalAdvanceUsdCents,
    offboardingDeductionUsdCents,
  });
  const payoutMetrics = calculateEmployeePayoutMetrics({
    dollarInwardUsdCents: effectiveDollarInwardUsdCents,
    actualPaidInrCents: entry.actualPaidInrCents,
    receivedUsdInrRate: entry.cashoutUsdInrRate,
    pegUsdInrRate: entry.paidUsdInrRate,
  });
  const { error } = await supabase
    .from("invoice_payment_employee_entries")
    .update({
      days_worked: entry.daysWorked,
      days_in_month: entry.daysInMonth,
      base_dollar_inward_usd_cents: entry.baseDollarInwardUsdCents,
      onboarding_advance_usd_cents: entry.onboardingAdvanceUsdCents,
      reimbursement_usd_cents: entry.reimbursementUsdCents,
      reimbursement_labels_text: entry.reimbursementLabelsText || null,
      appraisal_advance_usd_cents: entry.appraisalAdvanceUsdCents,
      offboarding_deduction_usd_cents: offboardingDeductionUsdCents,
      effective_dollar_inward_usd_cents: effectiveDollarInwardUsdCents,
      cashout_usd_inr_rate: entry.cashoutUsdInrRate,
      paid_usd_inr_rate: entry.paidUsdInrRate,
      cash_in_inr_cents: calculateCashInInrCents({
        effectiveDollarInwardUsdCents,
        cashoutUsdInrRate: entry.cashoutUsdInrRate,
      }),
      monthly_paid_inr_cents: entry.monthlyPaidInrCents,
      pf_inr_cents: entry.pfInrCents,
      tds_inr_cents: entry.tdsInrCents,
      actual_paid_inr_cents: entry.actualPaidInrCents,
      salary_paid_inr_cents: entry.salaryPaidInrCents,
      fx_commission_inr_cents: payoutMetrics.fxCommissionInrCents,
      total_commission_usd_cents: payoutMetrics.totalCommissionUsdCents,
      commission_earned_inr_cents: payoutMetrics.commissionEarnedInrCents,
      gross_earnings_inr_cents:
        payoutMetrics.fxCommissionInrCents + payoutMetrics.commissionEarnedInrCents,
      is_non_invoice_employee: entry.isNonInvoiceEmployee,
      is_paid: entry.isPaid,
      paid_at: entry.paidAt ?? null,
      notes: entry.notes ?? null,
      updated_at: nowIso(),
    })
    .eq("id", entry.id);
  if (error) throw error;
}

export async function deleteSavedEmployeeCashFlowEntry(entryId: string) {
  const supabase = await getSupabaseOrThrow();
  const { error } = await supabase
    .from("invoice_payment_employee_entries")
    .delete()
    .eq("id", entryId);
  if (error) throw error;
}

export async function updateDashboardEmployeeCashFlowEntry(input: {
  entryId: string;
  daysWorked?: number;
  dollarInwardUsdCents: number;
  onboardingAdvanceUsdCents: number;
  reimbursementUsdCents: number;
  reimbursementLabelsText: string;
  appraisalAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
  cashoutUsdInrRate: number;
  paidUsdInrRate: number;
  pfInrCents: number;
  tdsInrCents: number;
  actualPaidInrCents: number;
}) {
  const supabase = await getSupabaseOrThrow();
  const { data: currentRow, error: currentError } = await supabase
    .from("invoice_payment_employee_entries")
    .select(
      "id, days_worked, days_in_month, base_dollar_inward_usd_cents, onboarding_advance_usd_cents, reimbursement_usd_cents, reimbursement_labels_text, appraisal_advance_usd_cents, offboarding_deduction_usd_cents",
    )
    .eq("id", input.entryId)
    .single();
  if (currentError) throw currentError;

  const current = currentRow as Pick<
    DbCashFlowEntry,
    | "id"
    | "days_worked"
    | "days_in_month"
    | "base_dollar_inward_usd_cents"
    | "onboarding_advance_usd_cents"
    | "reimbursement_usd_cents"
    | "reimbursement_labels_text"
    | "appraisal_advance_usd_cents"
    | "offboarding_deduction_usd_cents"
  >;

  const baseDollarInwardUsdCents = input.dollarInwardUsdCents;
  const offboardingDeductionUsdCents = Math.abs(input.offboardingDeductionUsdCents);
  const effectiveDollarInwardUsdCents = calculateEffectiveDollarInwardUsdCents({
    baseDollarInwardUsdCents,
    onboardingAdvanceUsdCents: input.onboardingAdvanceUsdCents,
    reimbursementUsdCents: input.reimbursementUsdCents,
    appraisalAdvanceUsdCents: input.appraisalAdvanceUsdCents,
    offboardingDeductionUsdCents,
  });
  const payoutMetrics = calculateEmployeePayoutMetrics({
    dollarInwardUsdCents: effectiveDollarInwardUsdCents,
    actualPaidInrCents: input.actualPaidInrCents,
    receivedUsdInrRate: input.cashoutUsdInrRate,
    pegUsdInrRate: input.paidUsdInrRate,
  });
  const salaryPaidInrCents = safeSalaryPaidInrCents({
    actualPaidInrCents: input.actualPaidInrCents,
    pfInrCents: input.pfInrCents,
    tdsInrCents: input.tdsInrCents,
  });
  const { error } = await supabase
    .from("invoice_payment_employee_entries")
    .update({
      days_worked: input.daysWorked ?? current.days_worked,
      base_dollar_inward_usd_cents: baseDollarInwardUsdCents,
      onboarding_advance_usd_cents: input.onboardingAdvanceUsdCents,
      reimbursement_usd_cents: input.reimbursementUsdCents,
      reimbursement_labels_text: input.reimbursementLabelsText || null,
      appraisal_advance_usd_cents: input.appraisalAdvanceUsdCents,
      offboarding_deduction_usd_cents: offboardingDeductionUsdCents,
      effective_dollar_inward_usd_cents: effectiveDollarInwardUsdCents,
      cashout_usd_inr_rate: input.cashoutUsdInrRate,
      paid_usd_inr_rate: input.paidUsdInrRate,
      cash_in_inr_cents: calculateCashInInrCents({
        effectiveDollarInwardUsdCents,
        cashoutUsdInrRate: input.cashoutUsdInrRate,
      }),
      monthly_paid_inr_cents: input.actualPaidInrCents,
      pf_inr_cents: input.pfInrCents,
      tds_inr_cents: input.tdsInrCents,
      actual_paid_inr_cents: input.actualPaidInrCents,
      salary_paid_inr_cents: salaryPaidInrCents,
      fx_commission_inr_cents: payoutMetrics.fxCommissionInrCents,
      total_commission_usd_cents: payoutMetrics.totalCommissionUsdCents,
      commission_earned_inr_cents: payoutMetrics.commissionEarnedInrCents,
      gross_earnings_inr_cents:
        payoutMetrics.fxCommissionInrCents +
        payoutMetrics.commissionEarnedInrCents,
      updated_at: nowIso(),
    })
    .eq("id", input.entryId);
  if (error) throw error;
}

