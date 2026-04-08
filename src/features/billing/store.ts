import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getSupabaseMode } from "@/src/lib/supabase/config";
import {
  calculateEmployeePayoutMetrics,
  calculateInvoiceTotals,
  calculateLineItemTotals,
  createRealizationRecord,
} from "./domain";
import {
  assertNoCaseInsensitiveDuplicate,
  assertNoDuplicateEmployeeInTeam,
} from "./duplicate-guards";
import {
  buildAvailableTeamNames,
  getMatchingEmployeesForTeam,
} from "./team-catalog";
import { findExistingLineItemForEmployee } from "./member-assignment";
import { buildAdjustmentDuplicateSignature } from "./adjustments";
import type {
  AdjustmentType,
  Company,
  DashboardMetrics,
  Employee,
  EmployeePayout,
  EmployeePayoutInvoice,
  Invoice,
  InvoiceDetail,
  InvoiceLineItem,
  InvoiceRealization,
  InvoiceStatus,
  Team,
  InvoiceTeam,
} from "./types";

type DbInvoice = {
  id: string;
  company_id: string;
  month: number;
  year: number;
  invoice_number: string;
  billing_date: string;
  due_date: string;
  status: InvoiceStatus;
  note_text: string;
  subtotal_usd_cents: number;
  adjustments_usd_cents: number;
  grand_total_usd_cents: number;
  source_invoice_id: string | null;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
};

type DbCompany = {
  id: string;
  name: string;
  billing_address: string;
  default_note: string;
  created_at: string;
};

type DbEmployee = {
  id: string;
  company_id: string;
  full_name: string;
  designation: string;
  default_team: string;
  billing_rate_usd_cents: number;
  payout_monthly_usd_cents: number;
  hrs_per_week: number;
  active_from: string;
  active_to: string | null;
  is_active: boolean;
  created_at: string;
};

type DbTeam = {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
};

type DbInvoiceTeam = {
  id: string;
  invoice_id: string;
  team_name: string;
  sort_order: number;
};

type DbInvoiceLineItem = {
  id: string;
  invoice_team_id: string;
  employee_id: string;
  employee_name_snapshot: string;
  designation_snapshot: string;
  team_name_snapshot: string;
  billing_rate_usd_cents: number;
  payout_monthly_usd_cents_snapshot: number;
  hrs_per_week: number;
  billed_total_usd_cents: number;
  payout_total_usd_cents: number;
  profit_total_usd_cents: number;
};

type DbInvoiceAdjustment = {
  id: string;
  invoice_id: string;
  type: AdjustmentType;
  label: string;
  employee_name: string | null;
  rate_usd_cents: number | null;
  hrs_per_week: number | null;
  amount_usd_cents: number;
  sort_order: number;
};

type DbInvoiceRealization = {
  id: string;
  invoice_id: string;
  realized_at: string;
  dollar_inbound_usd_cents?: number;
  usd_inr_rate?: number | null;
  realized_revenue_usd_cents: number;
  realized_payout_usd_cents: number;
  realized_profit_usd_cents: number;
  notes: string | null;
  created_at: string;
};

type DbEmployeePayout = {
  id: string;
  invoice_id: string;
  company_id: string;
  employee_id: string;
  invoice_line_item_id: string | null;
  employee_name_snapshot: string;
  dollar_inward_usd_cents: number;
  employee_monthly_usd_cents: number;
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
  created_at: string;
  updated_at: string;
};

const sortInvoicesDesc = (left: Invoice, right: Invoice) =>
  right.year * 100 + right.month - (left.year * 100 + left.month);

const nowIso = () => new Date().toISOString();
const nextId = (prefix: string) =>
  `${prefix}_${nowIso().replace(/[-:.TZ]/g, "").slice(0, 14)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

function getSupabaseOrThrow() {
  const mode = getSupabaseMode(process.env);
  if (mode !== "supabase") {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SECRET_KEY before running the app.",
    );
  }

  const client = createSupabaseServerClient();
  if (!client) {
    throw new Error("Supabase client could not be created from the current environment.");
  }

  return client;
}

function normalizeInvoiceAdjustmentSchemaError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    if (error.code === "PGRST204") {
      return new Error(
        "Supabase is missing the latest invoice adjustment columns. Run the invoice adjustment migration first.",
      );
    }

    if (error.code === "23514") {
      return new Error(
        "Supabase is missing the latest invoice adjustment type rules. Run the invoice adjustment migration first.",
      );
    }
  }

  return error;
}

function mapCompany(row: DbCompany): Company {
  return {
    id: row.id,
    name: row.name,
    billingAddress: row.billing_address,
    defaultNote: row.default_note,
    createdAt: row.created_at,
  };
}

function mapEmployee(row: DbEmployee): Employee {
  return {
    id: row.id,
    companyId: row.company_id,
    fullName: row.full_name,
    designation: row.designation,
    defaultTeam: row.default_team,
    billingRateUsdCents: row.billing_rate_usd_cents,
    payoutMonthlyUsdCents: row.payout_monthly_usd_cents,
    hrsPerWeek: Number(row.hrs_per_week),
    activeFrom: row.active_from,
    activeTo: row.active_to ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapTeam(row: DbTeam): Team {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

function mapInvoice(row: DbInvoice): Invoice {
  return {
    id: row.id,
    companyId: row.company_id,
    month: row.month,
    year: row.year,
    invoiceNumber: row.invoice_number,
    billingDate: row.billing_date,
    dueDate: row.due_date,
    status: row.status,
    noteText: row.note_text,
    subtotalUsdCents: row.subtotal_usd_cents,
    adjustmentsUsdCents: row.adjustments_usd_cents,
    grandTotalUsdCents: row.grand_total_usd_cents,
    sourceInvoiceId: row.source_invoice_id ?? undefined,
    pdfPath: row.pdf_path ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInvoiceTeam(row: DbInvoiceTeam): InvoiceTeam {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    teamName: row.team_name,
    sortOrder: row.sort_order,
  };
}

function mapInvoiceLineItem(row: DbInvoiceLineItem): InvoiceLineItem {
  return {
    id: row.id,
    invoiceTeamId: row.invoice_team_id,
    employeeId: row.employee_id,
    employeeNameSnapshot: row.employee_name_snapshot,
    designationSnapshot: row.designation_snapshot,
    teamNameSnapshot: row.team_name_snapshot,
    billingRateUsdCents: row.billing_rate_usd_cents,
    payoutMonthlyUsdCentsSnapshot: row.payout_monthly_usd_cents_snapshot,
    hrsPerWeek: Number(row.hrs_per_week),
    billedTotalUsdCents: row.billed_total_usd_cents,
    payoutTotalUsdCents: row.payout_total_usd_cents,
    profitTotalUsdCents: row.profit_total_usd_cents,
  };
}

function mapInvoiceAdjustment(row: DbInvoiceAdjustment) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    type: row.type,
    label: row.label,
    employeeName: row.employee_name ?? undefined,
    rateUsdCents: row.rate_usd_cents ?? undefined,
    hrsPerWeek: row.hrs_per_week ?? undefined,
    amountUsdCents: row.amount_usd_cents,
    sortOrder: row.sort_order,
  };
}

function mapInvoiceRealization(row: DbInvoiceRealization): InvoiceRealization {
  const inboundUsdCents =
    row.dollar_inbound_usd_cents ?? row.realized_revenue_usd_cents;
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    realizedAt: row.realized_at,
    dollarInboundUsdCents: inboundUsdCents,
    usdInrRate: Number(row.usd_inr_rate ?? 0),
    realizedRevenueUsdCents: row.realized_revenue_usd_cents,
    realizedPayoutUsdCents: row.realized_payout_usd_cents,
    realizedProfitUsdCents: row.realized_profit_usd_cents,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

function mapEmployeePayout(row: DbEmployeePayout): EmployeePayout {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    companyId: row.company_id,
    employeeId: row.employee_id,
    invoiceLineItemId: row.invoice_line_item_id ?? undefined,
    employeeNameSnapshot: row.employee_name_snapshot,
    dollarInwardUsdCents: row.dollar_inward_usd_cents,
    employeeMonthlyUsdCents: row.employee_monthly_usd_cents,
    cashoutUsdInrRate: Number(row.cashout_usd_inr_rate),
    paidUsdInrRate:
      row.paid_usd_inr_rate === null ? undefined : Number(row.paid_usd_inr_rate),
    pfInrCents: row.pf_inr_cents ?? 0,
    tdsInrCents: row.tds_inr_cents ?? 0,
    actualPaidInrCents: row.actual_paid_inr_cents ?? 0,
    fxCommissionInrCents:
      row.fx_commission_inr_cents === null
        ? undefined
        : Number(row.fx_commission_inr_cents),
    totalCommissionUsdCents: row.total_commission_usd_cents,
    commissionEarnedInrCents:
      row.commission_earned_inr_cents === null
        ? undefined
        : Number(row.commission_earned_inr_cents),
    isNonInvoiceEmployee: Boolean(row.is_non_invoice_employee),
    isPaid: row.is_paid,
    paidAt: row.paid_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function recomputeSupabaseInvoice(invoiceId: string) {
  const supabase = getSupabaseOrThrow();
  const { data: teamRows, error: teamError } = await supabase
    .from("invoice_teams")
    .select("id")
    .eq("invoice_id", invoiceId);
  if (teamError) throw teamError;

  const teamIds = (teamRows ?? []).map((team) => team.id as string);

  const { data: lineRows, error: lineError } = teamIds.length
    ? await supabase
        .from("invoice_line_items")
        .select("*")
        .in("invoice_team_id", teamIds)
    : { data: [], error: null };
  if (lineError) throw lineError;

  const { data: adjustmentRows, error: adjustmentError } = await supabase
    .from("invoice_adjustments")
    .select("amount_usd_cents")
    .eq("invoice_id", invoiceId);
  if (adjustmentError) throw adjustmentError;

  const totals = calculateInvoiceTotals({
    lineItems: (lineRows ?? []).map((row) =>
      mapInvoiceLineItem(row as DbInvoiceLineItem),
    ),
    adjustments: (adjustmentRows ?? []).map((row) =>
      Number(row.amount_usd_cents),
    ),
  });

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      subtotal_usd_cents: totals.subtotalUsdCents,
      adjustments_usd_cents: totals.adjustmentsUsdCents,
      grand_total_usd_cents: totals.grandTotalUsdCents,
      updated_at: nowIso(),
    })
    .eq("id", invoiceId);
  if (updateError) throw updateError;
}

export async function listCompanies() {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapCompany(row as DbCompany));
}

export async function createCompany(input: {
  name: string;
  billingAddress: string;
  defaultNote: string;
}) {
  const supabase = getSupabaseOrThrow();
  const { data: existingCompanyRows, error: existingCompanyError } = await supabase
    .from("companies")
    .select("name");
  if (existingCompanyError) throw existingCompanyError;

  assertNoCaseInsensitiveDuplicate({
    existingValues: (existingCompanyRows ?? []).map((row) => String(row.name)),
    candidateValue: input.name,
    entityLabel: "Company",
  });

  const payload = {
    id: nextId("company"),
    name: input.name,
    billing_address: input.billingAddress,
    default_note: input.defaultNote,
    created_at: nowIso(),
  };
  const { data, error } = await supabase
    .from("companies")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return mapCompany(data as DbCompany);
}

export async function listEmployees(companyId?: string) {
  const supabase = getSupabaseOrThrow();
  let query = supabase.from("employees").select("*").order("full_name");
  if (companyId) {
    query = query.eq("company_id", companyId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapEmployee(row as DbEmployee));
}

export async function listTeams(companyId?: string) {
  const supabase = getSupabaseOrThrow();
  let query = supabase.from("teams").select("*").order("name");
  if (companyId) {
    query = query.eq("company_id", companyId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapTeam(row as DbTeam));
}

export async function listAvailableTeamNames(companyId: string) {
  const [teams, employees] = await Promise.all([
    listTeams(companyId),
    listEmployees(companyId),
  ]);

  return buildAvailableTeamNames({
    masterTeamNames: teams.map((team) => team.name),
    employeeDefaultTeams: employees.map((employee) => employee.defaultTeam),
  });
}

export async function createTeam(input: {
  companyId: string;
  name: string;
}) {
  const supabase = getSupabaseOrThrow();
  const existingTeamNames = await listAvailableTeamNames(input.companyId);

  assertNoCaseInsensitiveDuplicate({
    existingValues: existingTeamNames,
    candidateValue: input.name,
    entityLabel: "Team",
  });

  const payload = {
    id: nextId("team_master"),
    company_id: input.companyId,
    name: input.name.trim().replace(/\s+/g, " "),
    created_at: nowIso(),
  };

  const { data, error } = await supabase
    .from("teams")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return mapTeam(data as DbTeam);
}

export async function createEmployee(input: {
  companyId: string;
  fullName: string;
  designation: string;
  defaultTeam: string;
  billingRateUsdCents: number;
  payoutMonthlyUsdCents: number;
  hrsPerWeek: number;
  activeFrom: string;
  activeTo?: string;
}) {
  const supabase = getSupabaseOrThrow();
  const { data: existingEmployeeRows, error: existingEmployeeError } = await supabase
    .from("employees")
    .select("full_name")
    .eq("company_id", input.companyId);
  if (existingEmployeeError) throw existingEmployeeError;

  assertNoCaseInsensitiveDuplicate({
    existingValues: (existingEmployeeRows ?? []).map((row) => String(row.full_name)),
    candidateValue: input.fullName,
    entityLabel: "Employee",
  });

  const payload = {
    id: nextId("employee"),
    company_id: input.companyId,
    full_name: input.fullName,
    designation: input.designation,
    default_team: input.defaultTeam,
    billing_rate_usd_cents: input.billingRateUsdCents,
    payout_monthly_usd_cents: input.payoutMonthlyUsdCents,
    hrs_per_week: input.hrsPerWeek,
    active_from: input.activeFrom,
    active_to: input.activeTo ?? null,
    is_active: true,
    created_at: nowIso(),
  };
  const { data, error } = await supabase
    .from("employees")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return mapEmployee(data as DbEmployee);
}

export async function listInvoices() {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => mapInvoice(row as DbInvoice))
    .sort(sortInvoicesDesc);
}

export async function findLatestInvoiceForCompany(companyId: string) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("company_id", companyId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapInvoice(data as DbInvoice) : undefined;
}

export async function createInvoiceDraft(input: {
  companyId: string;
  month: number;
  year: number;
  invoiceNumber: string;
  billingDate: string;
  dueDate: string;
  duplicateSourceId?: string;
  selectedTeamNames?: string[];
}) {
  const supabase = getSupabaseOrThrow();
  const { data: existingInvoiceRows, error: existingInvoiceError } = await supabase
    .from("invoices")
    .select("invoice_number");
  if (existingInvoiceError) throw existingInvoiceError;

  assertNoCaseInsensitiveDuplicate({
    existingValues: (existingInvoiceRows ?? []).map((row) => String(row.invoice_number)),
    candidateValue: input.invoiceNumber,
    entityLabel: "Invoice",
  });

  const { data: companyRow, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", input.companyId)
    .single();
  if (companyError) throw companyError;

  const invoiceId = nextId("invoice");
  const company = mapCompany(companyRow as DbCompany);
  const payload = {
    id: invoiceId,
    company_id: input.companyId,
    month: input.month,
    year: input.year,
    invoice_number: input.invoiceNumber,
    billing_date: input.billingDate,
    due_date: input.dueDate,
    status: "draft" as InvoiceStatus,
    note_text: company.defaultNote,
    subtotal_usd_cents: 0,
    adjustments_usd_cents: 0,
    grand_total_usd_cents: 0,
    source_invoice_id: input.duplicateSourceId ?? null,
    pdf_path: `/api/invoices/${invoiceId}/pdf`,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  const { data, error } = await supabase
    .from("invoices")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;

  if (input.duplicateSourceId) {
    const sourceDetail = await getInvoiceDetail(input.duplicateSourceId);
    if (!sourceDetail) {
      throw new Error("Source invoice not found");
    }

    for (const team of sourceDetail.teams) {
      const insertedTeam = await addInvoiceTeam(invoiceId, team.teamName, {
        autoIncludeMembers: false,
      });
      for (const lineItem of team.lineItems) {
        await addInvoiceLineItem({
          invoiceId,
          invoiceTeamId: insertedTeam.id,
          employeeId: lineItem.employeeId,
          hrsPerWeek: lineItem.hrsPerWeek,
          billingRateUsdCents: lineItem.billingRateUsdCents,
          payoutMonthlyUsdCents: lineItem.payoutMonthlyUsdCentsSnapshot,
        });
      }
    }

    for (const adjustment of sourceDetail.adjustments) {
      await addInvoiceAdjustment({
        invoiceId,
        type: adjustment.type,
        label: adjustment.label,
        employeeName: adjustment.employeeName,
        rateUsdCents: adjustment.rateUsdCents,
        hrsPerWeek: adjustment.hrsPerWeek,
        amountUsdCents: adjustment.amountUsdCents,
      });
    }

    await updateInvoiceNote(invoiceId, sourceDetail.invoice.noteText);
  } else {
    const selectedTeamNames = buildAvailableTeamNames({
      masterTeamNames: input.selectedTeamNames ?? [],
      employeeDefaultTeams: [],
    });
    for (const teamName of selectedTeamNames) {
      await addInvoiceTeam(invoiceId, teamName, { autoIncludeMembers: true });
    }
  }

  return mapInvoice(data as DbInvoice);
}

export async function addInvoiceTeam(
  invoiceId: string,
  teamName: string,
  options?: { autoIncludeMembers?: boolean },
) {
  const supabase = getSupabaseOrThrow();
  const { data: existingTeamRows, error: existingTeamError } = await supabase
    .from("invoice_teams")
    .select("team_name")
    .eq("invoice_id", invoiceId);
  if (existingTeamError) throw existingTeamError;

  assertNoCaseInsensitiveDuplicate({
    existingValues: (existingTeamRows ?? []).map((row) => String(row.team_name)),
    candidateValue: teamName,
    entityLabel: "Team",
  });

  const { count, error: countError } = await supabase
    .from("invoice_teams")
    .select("*", { count: "exact", head: true })
    .eq("invoice_id", invoiceId);
  if (countError) throw countError;

  const payload = {
    id: nextId("team"),
    invoice_id: invoiceId,
    team_name: teamName,
    sort_order: (count ?? 0) + 1,
  };

  const { data, error } = await supabase
    .from("invoice_teams")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;

  const mappedTeam = mapInvoiceTeam(data as DbInvoiceTeam);

  if (options?.autoIncludeMembers !== false) {
    const { data: invoiceRow, error: invoiceError } = await supabase
      .from("invoices")
      .select("company_id")
      .eq("id", invoiceId)
      .single();
    if (invoiceError) throw invoiceError;

    const employees = await listEmployees(String(invoiceRow.company_id));
    const matchingEmployees = getMatchingEmployeesForTeam({
      teamName,
      employees,
    });

    for (const employee of matchingEmployees) {
      await addInvoiceLineItem({
        invoiceId,
        invoiceTeamId: mappedTeam.id,
        employeeId: employee.id,
        hrsPerWeek: employee.hrsPerWeek,
        billingRateUsdCents: employee.billingRateUsdCents,
        payoutMonthlyUsdCents: employee.payoutMonthlyUsdCents,
      });
    }
  }

  await recomputeSupabaseInvoice(invoiceId);
  return mappedTeam;
}

export async function deleteInvoiceTeam(invoiceId: string, invoiceTeamId: string) {
  const supabase = getSupabaseOrThrow();
  const { error } = await supabase
    .from("invoice_teams")
    .delete()
    .eq("id", invoiceTeamId)
    .eq("invoice_id", invoiceId);
  if (error) throw error;

  await recomputeSupabaseInvoice(invoiceId);
}

export async function addInvoiceLineItem(input: {
  invoiceId: string;
  invoiceTeamId: string;
  employeeId: string;
  hrsPerWeek: number;
  billingRateUsdCents?: number;
  payoutMonthlyUsdCents?: number;
}) {
  const supabase = getSupabaseOrThrow();
  const [
    { data: employeeRow, error: employeeError },
    { data: teamRow, error: teamError },
  ] = await Promise.all([
    supabase.from("employees").select("*").eq("id", input.employeeId).single(),
    supabase
      .from("invoice_teams")
      .select("*")
      .eq("id", input.invoiceTeamId)
      .single(),
  ]);
  if (employeeError) throw employeeError;
  if (teamError) throw teamError;

  const { data: existingLineRows, error: existingLineError } = await supabase
    .from("invoice_line_items")
    .select("employee_id")
    .eq("invoice_team_id", input.invoiceTeamId);
  if (existingLineError) throw existingLineError;

  assertNoDuplicateEmployeeInTeam({
    existingEmployeeIds: (existingLineRows ?? []).map((row) => String(row.employee_id)),
    employeeId: input.employeeId,
  });

  const employee = mapEmployee(employeeRow as DbEmployee);
  const team = mapInvoiceTeam(teamRow as DbInvoiceTeam);
  const billingRateUsdCents =
    input.billingRateUsdCents ?? employee.billingRateUsdCents;
  const payoutMonthlyUsdCents =
    input.payoutMonthlyUsdCents ?? employee.payoutMonthlyUsdCents;
  const calculated = calculateLineItemTotals({
    billingRateUsdCents,
    payoutMonthlyUsdCents,
    hrsPerWeek: input.hrsPerWeek,
  });

  const payload = {
    id: nextId("line"),
    invoice_team_id: team.id,
    employee_id: employee.id,
    employee_name_snapshot: employee.fullName,
    designation_snapshot: employee.designation,
    team_name_snapshot: team.teamName,
    billing_rate_usd_cents: billingRateUsdCents,
    payout_monthly_usd_cents_snapshot: payoutMonthlyUsdCents,
    hrs_per_week: input.hrsPerWeek,
    billed_total_usd_cents: calculated.billedTotalUsdCents,
    payout_total_usd_cents: calculated.payoutTotalUsdCents,
    profit_total_usd_cents: calculated.profitTotalUsdCents,
  };

  const { data, error } = await supabase
    .from("invoice_line_items")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;

  await recomputeSupabaseInvoice(input.invoiceId);
  return mapInvoiceLineItem(data as DbInvoiceLineItem);
}

export async function deleteInvoiceLineItem(invoiceId: string, lineItemId: string) {
  const supabase = getSupabaseOrThrow();
  const { error } = await supabase
    .from("invoice_line_items")
    .delete()
    .eq("id", lineItemId);
  if (error) throw error;

  await recomputeSupabaseInvoice(invoiceId);
}

export async function updateInvoiceLineItem(input: {
  invoiceId: string;
  lineItemId: string;
  hrsPerWeek: number;
  billingRateUsdCents: number;
}) {
  const supabase = getSupabaseOrThrow();
  const { data: lineRow, error: lineError } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("id", input.lineItemId)
    .single();
  if (lineError) throw lineError;

  const existingLineItem = mapInvoiceLineItem(lineRow as DbInvoiceLineItem);
  const calculated = calculateLineItemTotals({
    billingRateUsdCents: input.billingRateUsdCents,
    payoutMonthlyUsdCents: existingLineItem.payoutMonthlyUsdCentsSnapshot,
    hrsPerWeek: input.hrsPerWeek,
  });

  const { error: updateError } = await supabase
    .from("invoice_line_items")
    .update({
      billing_rate_usd_cents: input.billingRateUsdCents,
      hrs_per_week: input.hrsPerWeek,
      billed_total_usd_cents: calculated.billedTotalUsdCents,
      payout_total_usd_cents: calculated.payoutTotalUsdCents,
      profit_total_usd_cents: calculated.profitTotalUsdCents,
    })
    .eq("id", input.lineItemId);
  if (updateError) throw updateError;

  const { error: employeeUpdateError } = await supabase
    .from("employees")
    .update({
      billing_rate_usd_cents: input.billingRateUsdCents,
    })
    .eq("id", existingLineItem.employeeId);
  if (employeeUpdateError) throw employeeUpdateError;

  await recomputeSupabaseInvoice(input.invoiceId);
}

export async function assignEmployeeToInvoiceTeam(input: {
  invoiceId: string;
  invoiceTeamId: string;
  employeeId: string;
}) {
  const supabase = getSupabaseOrThrow();
  const [
    detail,
    { data: targetTeamRow, error: targetTeamError },
    { data: employeeRow, error: employeeError },
  ] = await Promise.all([
    getInvoiceDetail(input.invoiceId),
    supabase
      .from("invoice_teams")
      .select("*")
      .eq("id", input.invoiceTeamId)
      .single(),
    supabase.from("employees").select("*").eq("id", input.employeeId).single(),
  ]);

  if (!detail) {
    throw new Error("Invoice not found");
  }
  if (targetTeamError) throw targetTeamError;
  if (employeeError) throw employeeError;

  const targetTeam = mapInvoiceTeam(targetTeamRow as DbInvoiceTeam);
  const employee = mapEmployee(employeeRow as DbEmployee);
  const existingAssignment = findExistingLineItemForEmployee({
    employeeId: input.employeeId,
    teams: detail.teams.map((team) => ({
      id: team.id,
      lineItems: team.lineItems.map((lineItem) => ({
        id: lineItem.id,
        employeeId: lineItem.employeeId,
      })),
    })),
  });

  if (existingAssignment?.teamId === targetTeam.id) {
    const { error: employeeUpdateError } = await supabase
      .from("employees")
      .update({
        default_team: targetTeam.teamName,
      })
      .eq("id", employee.id);
    if (employeeUpdateError) throw employeeUpdateError;
    return;
  }

  if (existingAssignment) {
    const { data: existingRows, error: existingRowsError } = await supabase
      .from("invoice_line_items")
      .select("id")
      .in(
        "invoice_team_id",
        detail.teams.map((team) => team.id),
      )
      .eq("employee_id", input.employeeId);
    if (existingRowsError) throw existingRowsError;

    const rows = existingRows ?? [];
    const rowToKeep = rows.find((row) => row.id === existingAssignment.lineItemId);
    const rowsToDelete = rows.filter((row) => row.id !== existingAssignment.lineItemId);

    const { error: moveError } = await supabase
      .from("invoice_line_items")
      .update({
        invoice_team_id: targetTeam.id,
        team_name_snapshot: targetTeam.teamName,
      })
      .eq("id", rowToKeep?.id ?? existingAssignment.lineItemId);
    if (moveError) throw moveError;

    if (rowsToDelete.length > 0) {
      const { error: deleteDuplicatesError } = await supabase
        .from("invoice_line_items")
        .delete()
        .in(
          "id",
          rowsToDelete.map((row) => row.id),
        );
      if (deleteDuplicatesError) throw deleteDuplicatesError;
    }
  } else {
    await addInvoiceLineItem({
      invoiceId: input.invoiceId,
      invoiceTeamId: targetTeam.id,
      employeeId: employee.id,
      hrsPerWeek: employee.hrsPerWeek,
      billingRateUsdCents: employee.billingRateUsdCents,
      payoutMonthlyUsdCents: employee.payoutMonthlyUsdCents,
    });
  }

  const { error: employeeUpdateError } = await supabase
    .from("employees")
    .update({
      default_team: targetTeam.teamName,
    })
    .eq("id", employee.id);
  if (employeeUpdateError) throw employeeUpdateError;

  await recomputeSupabaseInvoice(input.invoiceId);
}

export async function addInvoiceAdjustment(input: {
  invoiceId: string;
  type: AdjustmentType;
  label: string;
  employeeName?: string;
  rateUsdCents?: number;
  hrsPerWeek?: number;
  amountUsdCents: number;
}) {
  const supabase = getSupabaseOrThrow();
  const { data: existingRows, error: existingError } = await supabase
    .from("invoice_adjustments")
    .select("*")
    .eq("invoice_id", input.invoiceId);
  if (existingError) throw existingError;

  const candidateSignature = buildAdjustmentDuplicateSignature(input);
  const duplicateExists = (existingRows ?? [])
    .map((row) => mapInvoiceAdjustment(row as DbInvoiceAdjustment))
    .some(
      (adjustment) =>
        buildAdjustmentDuplicateSignature(adjustment) === candidateSignature,
    );

  if (duplicateExists) {
    throw new Error("Duplicate adjustment already added.");
  }

  const { count, error: countError } = await supabase
    .from("invoice_adjustments")
    .select("*", { count: "exact", head: true })
    .eq("invoice_id", input.invoiceId);
  if (countError) throw countError;

  const payload = {
    id: nextId("adjustment"),
    invoice_id: input.invoiceId,
    type: input.type,
    label: input.label,
    employee_name: input.employeeName ?? null,
    rate_usd_cents: input.rateUsdCents ?? null,
    hrs_per_week: input.hrsPerWeek ?? null,
    amount_usd_cents: input.amountUsdCents,
    sort_order: (count ?? 0) + 1,
  };

  const { data, error } = await supabase
    .from("invoice_adjustments")
    .insert(payload)
    .select()
    .single();
  if (error) throw normalizeInvoiceAdjustmentSchemaError(error);

  await recomputeSupabaseInvoice(input.invoiceId);
  return mapInvoiceAdjustment(data as DbInvoiceAdjustment);
}

export async function deleteInvoiceAdjustment(invoiceId: string, adjustmentId: string) {
  const supabase = getSupabaseOrThrow();
  const { error } = await supabase
    .from("invoice_adjustments")
    .delete()
    .eq("id", adjustmentId)
    .eq("invoice_id", invoiceId);
  if (error) throw error;

  await recomputeSupabaseInvoice(invoiceId);
}

export async function updateInvoiceNote(invoiceId: string, noteText: string) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("invoices")
    .update({
      note_text: noteText,
      updated_at: nowIso(),
    })
    .eq("id", invoiceId)
    .select()
    .single();
  if (error) throw error;
  return mapInvoice(data as DbInvoice);
}

export async function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("invoices")
    .update({
      status,
      updated_at: nowIso(),
    })
    .eq("id", invoiceId)
    .select()
    .single();
  if (error) throw error;
  return mapInvoice(data as DbInvoice);
}

export async function cashOutInvoice(
  invoiceId: string,
  realizedAt: string,
  dollarInboundUsdCents: number,
  usdInrRate: number,
) {
  const detail = await getInvoiceDetail(invoiceId);
  if (!detail) {
    throw new Error("Invoice not found");
  }

  const realization = createRealizationRecord({
    invoiceId,
    alreadyRealized: Boolean(detail.realization),
    lineItems: detail.teams.flatMap((team) => team.lineItems),
    realizedAt,
    dollarInboundUsdCents,
    usdInrRate,
  });

  const supabase = getSupabaseOrThrow();
  const payload = {
    id: nextId("realization"),
    invoice_id: invoiceId,
    realized_at: realizedAt,
    dollar_inbound_usd_cents: realization.dollarInboundUsdCents,
    usd_inr_rate: realization.usdInrRate,
    realized_revenue_usd_cents: realization.realizedRevenueUsdCents,
    realized_payout_usd_cents: realization.realizedPayoutUsdCents,
    realized_profit_usd_cents: realization.realizedProfitUsdCents,
    notes: null,
    created_at: nowIso(),
  };

  const { data, error } = await supabase
    .from("invoice_realizations")
    .insert(payload)
    .select()
    .single();
  if (error) {
    const message =
      typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";
    const missingInboundColumn = message.includes("dollar_inbound_usd_cents");
    const missingRateColumn = message.includes("usd_inr_rate");

    if (!missingInboundColumn && !missingRateColumn) {
      throw error;
    }

    const fallbackPayload = {
      id: payload.id,
      invoice_id: payload.invoice_id,
      realized_at: payload.realized_at,
      realized_revenue_usd_cents: payload.realized_revenue_usd_cents,
      realized_payout_usd_cents: payload.realized_payout_usd_cents,
      realized_profit_usd_cents: payload.realized_profit_usd_cents,
      notes: payload.notes,
      created_at: payload.created_at,
    };

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("invoice_realizations")
      .insert(fallbackPayload)
      .select()
      .single();
    if (fallbackError) throw fallbackError;

    await updateInvoiceStatus(invoiceId, "cashed_out");
    return mapInvoiceRealization(fallbackData as DbInvoiceRealization);
  }

  await updateInvoiceStatus(invoiceId, "cashed_out");
  return mapInvoiceRealization(data as DbInvoiceRealization);
}

async function ensureEmployeePayoutRows(invoiceId: string) {
  const supabase = getSupabaseOrThrow();
  const detail = await getInvoiceDetail(invoiceId);
  if (!detail) {
    throw new Error("Invoice not found");
  }
  if (detail.invoice.status !== "cashed_out" || !detail.realization) {
    throw new Error("Employee payout is available only for cashed-out invoices.");
  }
  if (detail.realization.usdInrRate <= 0) {
    throw new Error(
      "This invoice is missing cashout USD/INR rate. Re-cashout this invoice with a rate.",
    );
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("employee_payouts")
    .select("employee_id")
    .eq("invoice_id", invoiceId);
  if (existingError) throw existingError;

  const existingEmployeeIds = new Set(
    (existingRows ?? []).map((row) => String(row.employee_id)),
  );

  for (const lineItem of detail.teams.flatMap((team) => team.lineItems)) {
    if (existingEmployeeIds.has(lineItem.employeeId)) {
      continue;
    }

    const payload = {
      id: nextId("employee_payout"),
      invoice_id: invoiceId,
      company_id: detail.company.id,
      employee_id: lineItem.employeeId,
      invoice_line_item_id: lineItem.id,
      employee_name_snapshot: lineItem.employeeNameSnapshot,
      dollar_inward_usd_cents: lineItem.billedTotalUsdCents,
      employee_monthly_usd_cents: lineItem.payoutMonthlyUsdCentsSnapshot,
      cashout_usd_inr_rate: detail.realization.usdInrRate,
      paid_usd_inr_rate: null,
      pf_inr_cents: 0,
      tds_inr_cents: 0,
      actual_paid_inr_cents: 0,
      fx_commission_inr_cents: null,
      total_commission_usd_cents:
        lineItem.billedTotalUsdCents - lineItem.payoutMonthlyUsdCentsSnapshot,
      commission_earned_inr_cents: null,
      is_non_invoice_employee: false,
      is_paid: false,
      paid_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    const { error: insertError } = await supabase
      .from("employee_payouts")
      .insert(payload);
    if (insertError) throw insertError;
  }
}

export async function getEmployeePayoutInvoice(
  invoiceId: string,
): Promise<EmployeePayoutInvoice | undefined> {
  await ensureEmployeePayoutRows(invoiceId);
  const detail = await getInvoiceDetail(invoiceId);
  if (!detail || !detail.realization) {
    return undefined;
  }

  const supabase = getSupabaseOrThrow();
  const { data: rows, error } = await supabase
    .from("employee_payouts")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("employee_name_snapshot");
  if (error) throw error;

  return {
    invoice: detail.invoice,
    realization: detail.realization,
    rows: (rows ?? []).map((row) => mapEmployeePayout(row as DbEmployeePayout)),
  };
}

export async function updateEmployeePayout(input: {
  payoutId: string;
  dollarInwardUsdCents: number;
  employeeMonthlyUsdCents: number;
  cashoutUsdInrRate: number;
  paidUsdInrRate: number;
  pfInrCents: number;
  tdsInrCents: number;
  actualPaidInrCents: number;
}) {
  const supabase = getSupabaseOrThrow();
  const { error } = await supabase
    .from("employee_payouts")
    .select("id")
    .eq("id", input.payoutId)
    .single();
  if (error) throw error;

  const computed = calculateEmployeePayoutMetrics({
    dollarInwardUsdCents: input.dollarInwardUsdCents,
    employeeMonthlyUsdCents: input.employeeMonthlyUsdCents,
    cashoutUsdInrRate: input.cashoutUsdInrRate,
    paidUsdInrRate: input.paidUsdInrRate,
  });

  const { data: updated, error: updateError } = await supabase
    .from("employee_payouts")
    .update({
      dollar_inward_usd_cents: input.dollarInwardUsdCents,
      employee_monthly_usd_cents: input.employeeMonthlyUsdCents,
      cashout_usd_inr_rate: input.cashoutUsdInrRate,
      paid_usd_inr_rate: input.paidUsdInrRate,
      pf_inr_cents: input.pfInrCents,
      tds_inr_cents: input.tdsInrCents,
      actual_paid_inr_cents: input.actualPaidInrCents,
      fx_commission_inr_cents: computed.fxCommissionInrCents,
      total_commission_usd_cents: computed.totalCommissionUsdCents,
      commission_earned_inr_cents: computed.commissionEarnedInrCents,
      updated_at: nowIso(),
    })
    .eq("id", input.payoutId)
    .select()
    .single();
  if (updateError) throw updateError;

  return mapEmployeePayout(updated as DbEmployeePayout);
}

export async function addEmployeePayoutRow(input: {
  invoiceId: string;
  employeeId: string;
}) {
  const supabase = getSupabaseOrThrow();
  await ensureEmployeePayoutRows(input.invoiceId);

  const detail = await getInvoiceDetail(input.invoiceId);
  if (!detail || !detail.realization) {
    throw new Error("Invoice not found.");
  }

  const { data: employeeRow, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("id", input.employeeId)
    .single();
  if (employeeError) throw employeeError;
  const employee = mapEmployee(employeeRow as DbEmployee);

  if (employee.companyId !== detail.company.id) {
    throw new Error("Employee does not belong to selected invoice company.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("employee_payouts")
    .select("id")
    .eq("invoice_id", input.invoiceId)
    .eq("employee_id", input.employeeId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    throw new Error("Employee already exists in this payout invoice.");
  }

  const payload = {
    id: nextId("employee_payout"),
    invoice_id: input.invoiceId,
    company_id: detail.company.id,
    employee_id: employee.id,
    invoice_line_item_id: null,
    employee_name_snapshot: employee.fullName,
    dollar_inward_usd_cents: 0,
    employee_monthly_usd_cents: employee.payoutMonthlyUsdCents,
    cashout_usd_inr_rate: 0,
    paid_usd_inr_rate: null,
    pf_inr_cents: 0,
    tds_inr_cents: 0,
    actual_paid_inr_cents: 0,
    fx_commission_inr_cents: 0,
    total_commission_usd_cents: 0,
    commission_earned_inr_cents: 0,
    is_non_invoice_employee: true,
    is_paid: false,
    paid_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  const { data, error } = await supabase
    .from("employee_payouts")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;

  return mapEmployeePayout(data as DbEmployeePayout);
}

export async function markEmployeePayoutPaid(input: {
  payoutId: string;
  paidAt: string;
}) {
  const supabase = getSupabaseOrThrow();
  const { data: currentRow, error: currentError } = await supabase
    .from("employee_payouts")
    .select("*")
    .eq("id", input.payoutId)
    .single();
  if (currentError) throw currentError;

  const current = mapEmployeePayout(currentRow as DbEmployeePayout);
  if (!current.paidUsdInrRate || current.paidUsdInrRate <= 0) {
    throw new Error("Enter paid USD/INR rate and update row before marking as paid.");
  }

  const { error } = await supabase
    .from("employee_payouts")
    .update({
      is_paid: true,
      paid_at: input.paidAt,
      updated_at: nowIso(),
    })
    .eq("id", input.payoutId);
  if (error) throw error;
}

export async function getInvoiceDetail(
  invoiceId: string,
): Promise<InvoiceDetail | undefined> {
  const supabase = getSupabaseOrThrow();
  const { data: invoiceRow, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();
  if (invoiceError) throw invoiceError;
  if (!invoiceRow) return undefined;

  const invoice = mapInvoice(invoiceRow as DbInvoice);
  const [
    { data: companyRow, error: companyError },
    { data: teamRows, error: teamError },
    { data: adjustmentRows, error: adjustmentError },
    { data: realizationRow, error: realizationError },
  ] = await Promise.all([
    supabase.from("companies").select("*").eq("id", invoice.companyId).single(),
    supabase
      .from("invoice_teams")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("sort_order"),
    supabase
      .from("invoice_adjustments")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("sort_order"),
    supabase
      .from("invoice_realizations")
      .select("*")
      .eq("invoice_id", invoice.id)
      .maybeSingle(),
  ]);
  if (companyError) throw companyError;
  if (teamError) throw teamError;
  if (adjustmentError) throw adjustmentError;
  if (realizationError) throw realizationError;

  const mappedTeams = (teamRows ?? []).map((row) =>
    mapInvoiceTeam(row as DbInvoiceTeam),
  );
  const teamIds = mappedTeams.map((team) => team.id);
  const { data: lineRows, error: lineError } = teamIds.length
    ? await supabase
        .from("invoice_line_items")
        .select("*")
        .in("invoice_team_id", teamIds)
    : { data: [], error: null };
  if (lineError) throw lineError;

  const mappedLineItems = (lineRows ?? []).map((row) =>
    mapInvoiceLineItem(row as DbInvoiceLineItem),
  );

  return {
    invoice,
    company: mapCompany(companyRow as DbCompany),
    teams: mappedTeams.map((team) => ({
      ...team,
      lineItems: mappedLineItems.filter(
        (lineItem) => lineItem.invoiceTeamId === team.id,
      ),
    })),
    adjustments: (adjustmentRows ?? []).map((row) =>
      mapInvoiceAdjustment(row as DbInvoiceAdjustment),
    ),
    realization: realizationRow
      ? mapInvoiceRealization(realizationRow as DbInvoiceRealization)
      : undefined,
  };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [invoices, companies, employees, details] = await Promise.all([
    listInvoices(),
    listCompanies(),
    listEmployees(),
    (async () => {
      const invoiceList = await listInvoices();
      return Promise.all(invoiceList.map((invoice) => getInvoiceDetail(invoice.id)));
    })(),
  ]);

  const invoiceStatusCounts: Record<InvoiceStatus, number> = {
    draft: 0,
    generated: 0,
    sent: 0,
    cashed_out: 0,
  };

  for (const invoice of invoices) {
    invoiceStatusCounts[invoice.status] += 1;
  }

  const pendingCashOutCount = invoices.filter(
    (invoice) => invoice.status !== "cashed_out",
  ).length;
  const companyMap = new Map(companies.map((company) => [company.id, company.name]));
  const employeeMap = new Map(
    employees.map((employee) => [employee.id, employee.fullName]),
  );
  const companyProfitMap = new Map<string, number>();
  const employeeProfitMap = new Map<string, number>();
  let realizedRevenueUsdCents = 0;
  let bankChargesUsdCents = 0;
  let realizedProfitUsdCents = 0;

  for (const detail of details.filter(Boolean) as InvoiceDetail[]) {
    if (!detail.realization) continue;
    realizedRevenueUsdCents += detail.realization.realizedRevenueUsdCents;
    realizedProfitUsdCents += detail.realization.realizedProfitUsdCents;
    bankChargesUsdCents +=
      detail.invoice.grandTotalUsdCents - detail.realization.dollarInboundUsdCents;
    companyProfitMap.set(
      detail.company.id,
      (companyProfitMap.get(detail.company.id) ?? 0) +
        detail.realization.realizedProfitUsdCents,
    );

    for (const lineItem of detail.teams.flatMap((team) => team.lineItems)) {
      employeeProfitMap.set(
        lineItem.employeeId,
        (employeeProfitMap.get(lineItem.employeeId) ?? 0) +
          lineItem.profitTotalUsdCents,
      );
    }
  }

  return {
    invoiceStatusCounts,
    pendingCashOutCount,
    realizedRevenueUsdCents,
    bankChargesUsdCents,
    realizedProfitUsdCents,
    realizedProfitByCompany: [...companyProfitMap.entries()].map(
      ([companyId, profit]) => ({
        companyId,
        companyName: companyMap.get(companyId) ?? companyId,
        realizedProfitUsdCents: profit,
      }),
    ),
    realizedProfitByEmployee: [...employeeProfitMap.entries()].map(
      ([employeeId, profit]) => ({
        employeeId,
        employeeName: employeeMap.get(employeeId) ?? employeeId,
        realizedProfitUsdCents: profit,
      }),
    ),
  };
}
