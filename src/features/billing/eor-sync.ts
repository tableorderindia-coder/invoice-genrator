/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SyncResult = {
  created: number;
  updated: number;
  skipped: number;
  unmappedCompanies: Array<{ externalCompanyId: string; name: string }>;
  unmappedEmployees: Array<{ externalEmployeeId: string; name: string; externalCompanyId: string }>;
  errors: string[];
};

async function getSupabaseOrThrow() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }
  return client;
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

async function selectRequired<T>(query: PromiseLike<{ data: T | null; error: unknown }>, message: string): Promise<T> {
  const { data, error } = await query;
  if (error) throw error;
  if (!data) throw new Error(message);
  return data;
}

export async function buildEorFinanceSyncPayload(invoiceId: string) {
  const supabase = await getSupabaseOrThrow();
  const invoice = await selectRequired<any>(
    supabase.from("invoices").select("*").eq("id", invoiceId).single(),
    "Invoice was not found.",
  );
  const company = await selectRequired<any>(
    supabase.from("companies").select("*").eq("id", invoice.company_id).single(),
    "Company was not found.",
  );

  const [
    { data: invoiceTeams, error: teamsError },
    { data: invoicePayments, error: paymentsError },
    { data: salaryPayments, error: salaryError },
    { data: cashFlowEntries, error: cashFlowError },
  ] = await Promise.all([
    supabase.from("invoice_teams").select("*").eq("invoice_id", invoiceId),
    supabase.from("invoice_payments").select("*").eq("invoice_id", invoiceId),
    supabase.from("employee_salary_payments").select("*").eq("company_id", invoice.company_id).eq("month", monthKey(invoice.year, invoice.month)),
    supabase.from("invoice_payment_employee_entries").select("*").eq("company_id", invoice.company_id).eq("payment_month", monthKey(invoice.year, invoice.month)),
  ]);
  if (teamsError) throw teamsError;
  if (paymentsError) throw paymentsError;
  if (salaryError) throw salaryError;
  if (cashFlowError) throw cashFlowError;

  const teamIds = (invoiceTeams ?? []).map((team: any) => team.id);
  const { data: lineItems, error: lineItemError } = teamIds.length
    ? await supabase.from("invoice_line_items").select("*").in("invoice_team_id", teamIds)
    : { data: [], error: null };
  if (lineItemError) throw lineItemError;

  const employeeIds = [
    ...new Set([
      ...(lineItems ?? []).map((row: any) => row.employee_id),
      ...(salaryPayments ?? []).map((row: any) => row.employee_id),
    ].filter(Boolean)),
  ];
  const [{ data: employees, error: employeeError }, { data: statementRows, error: statementRowError }, { data: statementSummaries, error: summaryError }] = employeeIds.length
    ? await Promise.all([
        supabase.from("employees").select("*").in("id", employeeIds),
        supabase.from("employee_statement_invoice_rows").select("*").in("employee_id", employeeIds).eq("invoice_id", invoiceId),
        supabase.from("employee_statement_month_summaries").select("*").in("employee_id", employeeIds).eq("month_key", monthKey(invoice.year, invoice.month)),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  if (employeeError) throw employeeError;
  if (statementRowError) throw statementRowError;
  if (summaryError) throw summaryError;
  const cashFlowByEmployee = new Map((cashFlowEntries ?? []).map((entry: any) => [entry.employee_id, entry]));

  return {
    source: "invoice_generator",
    syncedAt: new Date().toISOString(),
    company: {
      id: company.id,
      name: company.name,
    },
    employees: (employees ?? []).map((employee: any) => ({
      id: employee.id,
      companyId: employee.company_id,
      fullName: employee.full_name,
      email: null,
      designation: employee.designation ?? null,
    })),
    invoice: {
      id: invoice.id,
      companyId: invoice.company_id,
      invoiceNumber: invoice.invoice_number,
      month: invoice.month,
      year: invoice.year,
      billingDate: invoice.billing_date ?? null,
      dueDate: invoice.due_date ?? null,
      status: invoice.status,
      noteText: invoice.note_text ?? null,
      subtotalUsdCents: invoice.subtotal_usd_cents ?? 0,
      adjustmentsUsdCents: invoice.adjustments_usd_cents ?? 0,
      grandTotalUsdCents: invoice.grand_total_usd_cents ?? 0,
      pdfPath: invoice.pdf_path ?? null,
    },
    lineItems: (lineItems ?? []).map((item: any) => ({
      id: item.id,
      invoiceId: invoice.id,
      employeeId: item.employee_id,
      employeeNameSnapshot: item.employee_name_snapshot,
      designationSnapshot: item.designation_snapshot ?? null,
      teamNameSnapshot: item.team_name_snapshot ?? null,
      billingRateUsdCents: item.billing_rate_usd_cents ?? 0,
      payoutMonthlyUsdCentsSnapshot: item.payout_monthly_usd_cents_snapshot ?? 0,
      hrsPerWeek: item.hrs_per_week ?? null,
      daysWorked: item.days_worked ?? null,
      billedTotalUsdCents: item.billed_total_usd_cents ?? 0,
      payoutTotalUsdCents: item.payout_total_usd_cents ?? 0,
      profitTotalUsdCents: item.profit_total_usd_cents ?? 0,
    })),
    invoicePayments: (invoicePayments ?? []).map((payment: any) => ({
      id: payment.id,
      invoiceId: payment.invoice_id,
      companyId: payment.company_id,
      paymentDate: payment.payment_date ?? null,
      paymentMonth: payment.payment_month,
      usdInrRate: payment.usd_inr_rate ?? 0,
      notes: payment.notes ?? null,
    })),
    salaryPayments: (salaryPayments ?? []).map((payment: any) => ({
      ...(() => {
        const cashFlow = cashFlowByEmployee.get(payment.employee_id) as any;
        return {
          pfInrCents: Number(cashFlow?.pf_inr_cents ?? 0),
          tdsInrCents: Number(cashFlow?.tds_inr_cents ?? 0),
          actualPaidInrCents: Number(cashFlow?.actual_paid_inr_cents ?? payment.salary_paid_inr_cents ?? 0),
        };
      })(),
      id: payment.id,
      employeeId: payment.employee_id,
      companyId: payment.company_id,
      month: payment.month,
      salaryUsdCents: payment.salary_usd_cents ?? 0,
      paidUsdInrRate: payment.paid_usd_inr_rate ?? 0,
      salaryPaidInrCents: Number(payment.salary_paid_inr_cents ?? 0),
      paidStatus: Boolean(payment.paid_status),
      paidDate: payment.paid_date ?? null,
      notes: payment.notes ?? null,
    })),
    statementRows: (statementRows ?? []).map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      invoiceId: row.invoice_id,
      monthKey: row.month_key,
      employeeNameSnapshot: row.employee_name_snapshot,
      invoiceNumberSnapshot: row.invoice_number_snapshot,
      dollarInwardUsdCents: row.dollar_inward_usd_cents ?? 0,
      onboardingAdvanceUsdCents: row.onboarding_advance_usd_cents ?? 0,
      reimbursementUsdCents: row.reimbursement_usd_cents ?? 0,
      reimbursementLabelsText: row.reimbursement_labels_text ?? "",
      appraisalAdvanceUsdCents: row.appraisal_advance_usd_cents ?? 0,
      offboardingDeductionUsdCents: row.offboarding_deduction_usd_cents ?? 0,
    })),
    statementSummaries: (statementSummaries ?? []).map((summary: any) => ({
      id: summary.id,
      employeeId: summary.employee_id,
      monthKey: summary.month_key,
      monthLabelSnapshot: summary.month_label_snapshot,
      effectiveDollarInwardUsdCents: summary.effective_dollar_inward_usd_cents ?? 0,
      monthlyDollarPaidUsdCents: summary.monthly_dollar_paid_usd_cents ?? 0,
    })),
  };
}

export async function syncInvoiceToEorPortal(invoiceId: string): Promise<SyncResult> {
  const syncUrl = process.env.EOR_PORTAL_SYNC_URL;
  const syncSecret = process.env.EOR_PORTAL_SYNC_SECRET;
  if (!syncUrl || !syncSecret) {
    throw new Error("EOR sync is not configured. Set EOR_PORTAL_SYNC_URL and EOR_PORTAL_SYNC_SECRET.");
  }

  const payload = await buildEorFinanceSyncPayload(invoiceId);
  const response = await fetch(syncUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-eor-sync-secret": syncSecret,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error ?? "EOR finance sync failed.");
  }
  return result as SyncResult;
}
