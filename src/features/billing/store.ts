import { query, withTransaction } from "@/lib/db/pool";
import type { QueryResultRow } from "pg";
import {
  calculateEmployeePayoutMetrics,
  calculateLineItemTotals,
  createRealizationRecord,
  resolveEffectiveLineItemTotalUsdCents,
  resolveEffectivePaidUsdInrRate,
  resolveEffectiveTeamTotalUsdCents,
  sortInvoiceLineItemsByRate,
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
import {
  buildPnEmployeeEditableSections,
  buildPnEmployeeSections,
  buildPnPeriodRows,
  buildPnSalaryOnlySourceRows,
  calculatePnEmployeeNetPlInrCents,
  calculatePnPeriodNetPlInrCents,
  sumPnPeriodNetPlInrCents,
  type PnEditableSourceRow,
  type PnSourceRow,
} from "./pn-dashboard";
import {
  calculateCashInInrCents,
  calculateEffectiveDollarInwardUsdCents,
} from "./employee-cash-flow";
import {
  FOUNDER_BALANCE_FOUNDERS,
  buildFounderBalanceModel,
  type FounderBalanceModel,
  type FounderBalancePeriodFilter,
  type FounderBalanceSourceRow,
  type FounderWithdrawal,
  type ParsedFounderWithdrawalRow,
} from "./founders-balance";
import { normalizeEmployeeNameForMatch } from "./employee-name-match";
import { isExpenseInPeriod, type ExpensePeriodRange } from "./expense-period";
import { getDaysInMonth } from "./utils";
import type {
  AdjustmentType,
  Company,
  CompanyExpense,
  CompanyPnSummary,
  Employee,
  EmployeeStatementInvoiceRow,
  EmployeeStatementMonthSummary,
  Invoice,
  InvoiceDetail,
  InvoiceLineItem,
  InvoiceRealization,
  InvoiceStatus,
  Team,
  InvoiceTeam,
  PnDashboardData,
  PnPeriodType,
} from "./types";

type DbInvoice = {
  id: string;
  company_id: string;
  month: number;
  year: number;
  invoice_number: string;
  billing_date: string;
  billing_duration: string | null;
  due_date: string;
  status: InvoiceStatus;
  note_text: string;
  subtotal_usd_cents: number;
  adjustments_usd_cents: number;
  grand_total_usd_cents: number;
  manual_grand_total_usd_cents: number | null;
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
  manual_total_usd_cents: number | null;
};

type DbInvoiceLineItem = {
  id: string;
  invoice_team_id: string;
  employee_id: string;
  employee_name_snapshot: string;
  designation_snapshot: string;
  team_name_snapshot: string;
  billing_rate_usd_cents: number;
  hrs_per_week: number;
  days_worked: number | null;
  billed_total_usd_cents: number;
  manual_total_usd_cents: number | null;
};

type DbInvoiceAdjustment = {
  id: string;
  invoice_id: string;
  type: AdjustmentType;
  label: string;
  employee_name: string | null;
  rate_usd_cents: number | null;
  hrs_per_week: number | null;
  days_worked: number | null;
  amount_usd_cents: number;
  sort_order: number;
};

type DbInvoiceRealization = {
  id: string;
  invoice_id: string;
  realized_at: string;
  dollar_inbound_usd_cents?: number;
  usd_inr_rate?: number | null;
  notes: string | null;
  created_at: string;
};

type DbCompanyExpense = {
  id: string;
  company_id: string;
  year: number;
  month: number;
  label: string;
  amount_inr_cents: number;
  created_at: string;
  updated_at: string;
};

type DbFounderWithdrawal = {
  id: string;
  company_id: string | null;
  year: number;
  month: number;
  founder_key: string;
  founder_name_snapshot: string;
  withdrawal_inr_cents: number;
  created_at: string;
  updated_at: string;
};

type DbDashboardCashFlowEntry = {
  id: string;
  employee_id: string;
  payment_month: string;
  employee_name_snapshot: string;
  company_id: string;
  base_dollar_inward_usd_cents: number;
  onboarding_advance_usd_cents: number;
  advance_override_inr_cents: number | null;
  reimbursement_usd_cents: number;
  reimbursement_labels_text: string | null;
  appraisal_advance_usd_cents: number;
  offboarding_deduction_usd_cents: number;
  effective_dollar_inward_usd_cents: number;
  cashout_usd_inr_rate: number;
  paid_usd_inr_rate: number;
  cash_in_inr_cents: number;
  monthly_paid_inr_cents: number | null;
  pf_inr_cents: number;
  tds_inr_cents: number;
  actual_paid_inr_cents: number;
  salary_paid_inr_cents: number | null;
  fx_commission_inr_cents: number;
  total_commission_usd_cents: number;
  commission_earned_inr_cents: number;
  gross_earnings_inr_cents: number;
  days_worked: number;
  days_in_month: number;
  invoice_id: string;
};

type DbDashboardSalaryPayment = {
  id: string;
  employee_id: string;
  employee_name_snapshot: string;
  company_id: string;
  month: string;
  paid_usd_inr_rate: number;
  monthly_paid_inr_cents: number;
  salary_paid_inr_cents: number;
  pf_inr_cents: number;
  tds_inr_cents: number;
  actual_paid_inr_cents: number;
  days_worked: number;
  days_in_month: number;
};

type DbSecurityDepositLedger = {
  id: string;
  company_id: string;
  employee_id: string;
  invoice_id: string;
  adjustment_id: string | null;
  movement_type: "credit" | "debit";
  amount_usd_cents: number;
  created_at: string;
};

type DbEmployeeStatementInvoiceRow = {
  id: string;
  employee_id: string;
  invoice_id: string;
  month_key: string;
  employee_name_snapshot: string;
  invoice_number_snapshot: string;
  dollar_inward_usd_cents: number;
  onboarding_advance_usd_cents: number;
  reimbursement_usd_cents: number;
  reimbursement_labels_text: string;
  appraisal_advance_usd_cents: number;
  offboarding_deduction_usd_cents: number;
  created_at: string;
  updated_at: string;
};

type DbEmployeeStatementMonthSummary = {
  id: string;
  employee_id: string;
  month_key: string;
  month_label_snapshot: string;
  effective_dollar_inward_usd_cents: number;
  monthly_dollar_paid_usd_cents: number;
  created_at: string;
  updated_at: string;
};

const sortInvoicesDesc = (left: Invoice, right: Invoice) =>
  right.year * 100 + right.month - (left.year * 100 + left.month);

const uniqueNonEmptyValues = (values: string[]) => [...new Set(values.filter(Boolean))];

const nowIso = () => new Date().toISOString();
const nextId = (prefix: string) =>
  `${prefix}_${nowIso().replace(/[-:.TZ]/g, "").slice(0, 14)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

// ───────────── Error helpers (ported from Supabase/PostgREST error shapes to
// raw `pg` / Postgres SQLSTATE error shapes) ─────────────

function errorField(error: unknown, field: "code" | "message"): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if (!(field in error)) return undefined;
  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}

function normalizeInvoiceAdjustmentSchemaError(error: unknown) {
  const code = errorField(error, "code");
  if (code === "42703") {
    return new Error(
      "Database is missing the latest invoice adjustment columns. Run the invoice adjustment migration first.",
    );
  }

  if (code === "23514") {
    return new Error(
      "Database is missing the latest invoice adjustment type rules. Run the invoice adjustment migration first.",
    );
  }

  return error;
}

function isMissingRelationError(error: unknown, relationName: string) {
  const code = errorField(error, "code");
  const message = errorField(error, "message") ?? "";

  return code === "42P01" && message.includes(relationName);
}

/**
 * Postgres reports a missing column with SQLSTATE 42703, in one of a few
 * message shapes depending on the statement:
 *   - `column "x" of relation "y" does not exist` (INSERT/UPDATE column list)
 *   - `column y.x does not exist` (a qualified reference, e.g. in a WHERE clause)
 *   - `column "x" does not exist` (an unqualified reference, e.g. RETURNING)
 * This mirrors the old getMissingSchemaColumn() that parsed PostgREST's
 * PGRST204 message, so the schema-fallback insert/update helpers below keep
 * degrading gracefully if a table hasn't been migrated yet.
 */
function getMissingSchemaColumn(error: unknown, tableName: string): string | undefined {
  const code = errorField(error, "code");
  const message = errorField(error, "message");
  if (code !== "42703" || !message) return undefined;

  const ofRelation = message.match(/^column "([^"]+)" of relation "([^"]+)" does not exist$/);
  if (ofRelation && ofRelation[2] === tableName) {
    return ofRelation[1];
  }

  const qualified = message.match(new RegExp(`column ${tableName}\\.([^ ]+) does not exist`));
  if (qualified) {
    return qualified[1];
  }

  const bare = message.match(/^column "([^"]+)" does not exist$/);
  if (bare) {
    return bare[1];
  }

  return undefined;
}

async function requireOne<T extends QueryResultRow>(
  sql: string,
  params: unknown[],
  notFoundMessage: string,
): Promise<T> {
  const { rows } = await query<T>(sql, params);
  const row = rows[0];
  if (!row) {
    throw new Error(notFoundMessage);
  }
  return row;
}

async function findOne<T extends QueryResultRow>(
  sql: string,
  params: unknown[],
): Promise<T | null> {
  const { rows } = await query<T>(sql, params);
  return rows[0] ?? null;
}

// ───────────── Insert/update helpers with schema-drift fallback ─────────────
//
// These preserve the old Supabase-era behavior of dropping a column from the
// payload (and retrying) when the target table hasn't been migrated to
// include it yet, rather than hard failing.

const INVOICE_RETURNING_COLUMNS: Record<string, string> = {
  id: "id",
  company_id: "company_id",
  month: "month",
  year: "year",
  invoice_number: "invoice_number",
  billing_date: "billing_date::text as billing_date",
  billing_duration: "billing_duration",
  due_date: "due_date::text as due_date",
  status: "status",
  note_text: "note_text",
  subtotal_usd_cents: "subtotal_usd_cents",
  adjustments_usd_cents: "adjustments_usd_cents",
  grand_total_usd_cents: "grand_total_usd_cents",
  manual_grand_total_usd_cents: "manual_grand_total_usd_cents",
  source_invoice_id: "source_invoice_id",
  pdf_path: "pdf_path",
  created_at: "created_at::text as created_at",
  updated_at: "updated_at::text as updated_at",
};

async function insertInvoiceWithSchemaFallback(
  payload: Record<string, unknown>,
): Promise<DbInvoice> {
  const insertPayload: Record<string, unknown> = { ...payload };
  let returningKeys = Object.keys(INVOICE_RETURNING_COLUMNS);
  let attemptsRemaining = 8;

  while (attemptsRemaining > 0) {
    attemptsRemaining -= 1;
    const columns = Object.keys(insertPayload);
    const params = columns.map((column) => insertPayload[column]);
    const returningSql = returningKeys.map((key) => INVOICE_RETURNING_COLUMNS[key]).join(", ");

    try {
      const { rows } = await query<DbInvoice>(
        `insert into invoices (${columns.join(", ")})
         values (${columns.map((_, index) => `$${index + 1}`).join(", ")})
         returning ${returningSql}`,
        params,
      );
      const row = rows[0];
      if (!row) {
        throw new Error("Invoice insert did not return a row.");
      }
      return row;
    } catch (error) {
      const missingColumn = getMissingSchemaColumn(error, "invoices");
      if (missingColumn && missingColumn in insertPayload) {
        delete insertPayload[missingColumn];
        returningKeys = returningKeys.filter((key) => key !== missingColumn);
        continue;
      }
      if (missingColumn && returningKeys.includes(missingColumn)) {
        returningKeys = returningKeys.filter((key) => key !== missingColumn);
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    "Unable to insert invoice row because schema fallback attempts were exhausted.",
  );
}

const INVOICE_LINE_ITEM_RETURNING_COLUMNS: Record<string, string> = {
  id: "id",
  invoice_team_id: "invoice_team_id",
  employee_id: "employee_id",
  employee_name_snapshot: "employee_name_snapshot",
  designation_snapshot: "designation_snapshot",
  team_name_snapshot: "team_name_snapshot",
  billing_rate_usd_cents: "billing_rate_usd_cents",
  hrs_per_week: "hrs_per_week::float8 as hrs_per_week",
  days_worked: "days_worked",
  billed_total_usd_cents: "billed_total_usd_cents",
  manual_total_usd_cents: "manual_total_usd_cents",
};

async function insertInvoiceLineItemWithSchemaFallback(
  payload: Record<string, unknown>,
): Promise<DbInvoiceLineItem> {
  const insertPayload: Record<string, unknown> = { ...payload };
  let returningKeys = Object.keys(INVOICE_LINE_ITEM_RETURNING_COLUMNS);
  let attemptsRemaining = 3;

  while (attemptsRemaining > 0) {
    attemptsRemaining -= 1;
    const columns = Object.keys(insertPayload);
    const params = columns.map((column) => insertPayload[column]);
    const returningSql = returningKeys
      .map((key) => INVOICE_LINE_ITEM_RETURNING_COLUMNS[key])
      .join(", ");

    try {
      const { rows } = await query<DbInvoiceLineItem>(
        `insert into invoice_line_items (${columns.join(", ")})
         values (${columns.map((_, index) => `$${index + 1}`).join(", ")})
         returning ${returningSql}`,
        params,
      );
      const row = rows[0];
      if (!row) {
        throw new Error("Invoice line item insert did not return a row.");
      }
      return row;
    } catch (error) {
      const missingColumn = getMissingSchemaColumn(error, "invoice_line_items");
      if (missingColumn && missingColumn in insertPayload) {
        delete insertPayload[missingColumn];
        returningKeys = returningKeys.filter((key) => key !== missingColumn);
        continue;
      }
      if (missingColumn && returningKeys.includes(missingColumn)) {
        returningKeys = returningKeys.filter((key) => key !== missingColumn);
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    "Unable to insert invoice line item because schema fallback attempts were exhausted.",
  );
}

async function updateInvoiceLineItemWithSchemaFallback(
  lineItemId: string,
  payload: Record<string, unknown>,
): Promise<DbInvoiceLineItem> {
  const updatePayload: Record<string, unknown> = { ...payload };
  let returningKeys = Object.keys(INVOICE_LINE_ITEM_RETURNING_COLUMNS);
  let attemptsRemaining = 3;

  while (attemptsRemaining > 0) {
    attemptsRemaining -= 1;
    const columns = Object.keys(updatePayload);
    const setClause = columns.map((column, index) => `${column} = $${index + 2}`).join(", ");
    const params = [lineItemId, ...columns.map((column) => updatePayload[column])];
    const returningSql = returningKeys
      .map((key) => INVOICE_LINE_ITEM_RETURNING_COLUMNS[key])
      .join(", ");

    try {
      const { rows } = await query<DbInvoiceLineItem>(
        `update invoice_line_items set ${setClause} where id = $1 returning ${returningSql}`,
        params,
      );
      const row = rows[0];
      if (!row) {
        throw new Error("Invoice line item not found.");
      }
      return row;
    } catch (error) {
      const missingColumn = getMissingSchemaColumn(error, "invoice_line_items");
      if (missingColumn && missingColumn in updatePayload) {
        delete updatePayload[missingColumn];
        returningKeys = returningKeys.filter((key) => key !== missingColumn);
        continue;
      }
      if (missingColumn && returningKeys.includes(missingColumn)) {
        returningKeys = returningKeys.filter((key) => key !== missingColumn);
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    "Unable to update invoice line item because schema fallback attempts were exhausted.",
  );
}

// ───────────── Row mappers ─────────────

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
    billingDuration: row.billing_duration ?? undefined,
    dueDate: row.due_date,
    status: row.status,
    noteText: row.note_text,
    subtotalUsdCents: row.subtotal_usd_cents,
    adjustmentsUsdCents: row.adjustments_usd_cents,
    grandTotalUsdCents: row.grand_total_usd_cents,
    manualGrandTotalUsdCents: row.manual_grand_total_usd_cents ?? undefined,
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
    manualTotalUsdCents: row.manual_total_usd_cents ?? undefined,
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
    hrsPerWeek: Number(row.hrs_per_week),
    daysWorked: Number(row.days_worked ?? 0),
    billedTotalUsdCents: row.billed_total_usd_cents,
    manualTotalUsdCents: row.manual_total_usd_cents ?? undefined,
  };
}

function normalizeLineItemDaysWorked(
  lineItem: InvoiceLineItem,
  invoiceMonth: number,
  invoiceYear: number,
) {
  const daysInMonth = getDaysInMonth(invoiceMonth, invoiceYear);
  const raw = Number(lineItem.daysWorked);
  if (Number.isFinite(raw) && raw > 0) {
    return {
      ...lineItem,
      daysWorked: Math.max(1, Math.round(raw)),
    };
  }

  const fullMonthBilledTotalUsdCents = calculateLineItemTotals({
    billingRateUsdCents: lineItem.billingRateUsdCents,
    hrsPerWeek: lineItem.hrsPerWeek,
    daysWorked: daysInMonth,
    daysInMonth,
  }).billedTotalUsdCents;

  const derivedDaysWorked =
    fullMonthBilledTotalUsdCents > 0
      ? Math.round(
          (lineItem.billedTotalUsdCents / fullMonthBilledTotalUsdCents) *
            daysInMonth,
        )
      : daysInMonth;
  const normalized = Math.max(1, Math.min(daysInMonth, derivedDaysWorked));

  return {
    ...lineItem,
    daysWorked: normalized,
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
    hrsPerWeek: row.hrs_per_week === null || row.hrs_per_week === undefined
      ? undefined
      : Number(row.hrs_per_week),
    daysWorked: row.days_worked ?? undefined,
    amountUsdCents: row.amount_usd_cents,
    sortOrder: row.sort_order,
  };
}

function mapInvoiceRealization(row: DbInvoiceRealization): InvoiceRealization {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    realizedAt: row.realized_at,
    dollarInboundUsdCents: row.dollar_inbound_usd_cents ?? 0,
    usdInrRate: Number(row.usd_inr_rate ?? 0),
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

function mapEmployeeStatementInvoiceRow(
  row: DbEmployeeStatementInvoiceRow,
): EmployeeStatementInvoiceRow {
  return {
    employeeId: row.employee_id,
    employeeName: row.employee_name_snapshot,
    invoiceId: row.invoice_id,
    invoiceNumber: row.invoice_number_snapshot,
    monthKey: row.month_key,
    monthLabel: formatMonthYearFromKey(row.month_key),
    dollarInwardUsdCents: row.dollar_inward_usd_cents,
    onboardingAdvanceUsdCents: row.onboarding_advance_usd_cents,
    reimbursementUsdCents: row.reimbursement_usd_cents,
    reimbursementLabelsText: row.reimbursement_labels_text,
    appraisalAdvanceUsdCents: row.appraisal_advance_usd_cents,
    offboardingDeductionUsdCents: row.offboarding_deduction_usd_cents,
    updatedAt: row.updated_at,
  };
}

function mapEmployeeStatementMonthSummary(
  row: DbEmployeeStatementMonthSummary,
): EmployeeStatementMonthSummary {
  return {
    employeeId: row.employee_id,
    monthKey: row.month_key,
    monthLabel: row.month_label_snapshot || formatMonthYearFromKey(row.month_key),
    effectiveDollarInwardUsdCents: row.effective_dollar_inward_usd_cents,
    monthlyDollarPaidUsdCents: row.monthly_dollar_paid_usd_cents,
  };
}

function formatMonthYearFromKey(monthKey: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    return monthKey;
  }

  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return monthKey;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

async function recomputeInvoiceTotals(
  invoiceId: string,
  options?: { clearTeamManualTotals?: boolean; clearGrandManualTotal?: boolean },
) {
  const { rows: teamRows } = await query<DbInvoiceTeam>(
    `select id, invoice_id, team_name, sort_order, manual_total_usd_cents
     from invoice_teams
     where invoice_id = $1`,
    [invoiceId],
  );
  const mappedTeams = teamRows.map(mapInvoiceTeam);
  const teamIds = mappedTeams.map((team) => team.id);

  const lineRows = teamIds.length
    ? (
        await query<DbInvoiceLineItem>(
          `select id, invoice_team_id, employee_id, employee_name_snapshot, designation_snapshot,
                  team_name_snapshot, billing_rate_usd_cents, hrs_per_week::float8 as hrs_per_week,
                  days_worked, billed_total_usd_cents, manual_total_usd_cents
           from invoice_line_items
           where invoice_team_id = any($1::text[])`,
          [teamIds],
        )
      ).rows
    : [];
  const mappedLineItems = lineRows.map(mapInvoiceLineItem);

  const { rows: adjustmentRows } = await query<{ amount_usd_cents: number }>(
    `select amount_usd_cents from invoice_adjustments where invoice_id = $1`,
    [invoiceId],
  );

  const invoiceRow = await requireOne<Record<string, unknown>>(
    `select * from invoices where id = $1`,
    [invoiceId],
    "Invoice not found.",
  );
  const hasManualGrandTotalColumn = Object.prototype.hasOwnProperty.call(
    invoiceRow,
    "manual_grand_total_usd_cents",
  );
  const manualGrandTotalValue = hasManualGrandTotalColumn
    ? ((invoiceRow.manual_grand_total_usd_cents as number | null | undefined) ?? null)
    : null;

  const lineItemsByTeam = new Map<string, InvoiceLineItem[]>();
  for (const lineItem of mappedLineItems) {
    const current = lineItemsByTeam.get(lineItem.invoiceTeamId) ?? [];
    current.push(lineItem);
    lineItemsByTeam.set(lineItem.invoiceTeamId, current);
  }

  let subtotalUsdCents = 0;
  for (const team of mappedTeams) {
    const lineItems = lineItemsByTeam.get(team.id) ?? [];
    const effectiveLineTotals = lineItems.map((lineItem) =>
      resolveEffectiveLineItemTotalUsdCents({
        formulaTotalUsdCents: lineItem.billedTotalUsdCents,
        manualTotalUsdCents: lineItem.manualTotalUsdCents,
      }),
    );
    subtotalUsdCents += resolveEffectiveTeamTotalUsdCents({
      lineItemTotalsUsdCents: effectiveLineTotals,
      manualTotalUsdCents:
        options?.clearTeamManualTotals === true ? undefined : team.manualTotalUsdCents,
    });
  }

  const adjustmentsUsdCents = adjustmentRows.reduce(
    (sum, row) => sum + Number(row.amount_usd_cents),
    0,
  );

  const invoiceManualGrandTotal = Number(manualGrandTotalValue ?? 0);
  const useManualGrandTotal =
    options?.clearGrandManualTotal !== true && manualGrandTotalValue !== null;
  const grandTotalUsdCents = useManualGrandTotal
    ? invoiceManualGrandTotal
    : subtotalUsdCents + adjustmentsUsdCents;

  if (options?.clearTeamManualTotals === true) {
    try {
      await query(
        `update invoice_teams set manual_total_usd_cents = null where invoice_id = $1`,
        [invoiceId],
      );
    } catch (error) {
      const missingColumn = getMissingSchemaColumn(error, "invoice_teams");
      if (missingColumn !== "manual_total_usd_cents") {
        throw error;
      }
    }
  }

  const setClauses = [
    "subtotal_usd_cents = $2",
    "adjustments_usd_cents = $3",
    "grand_total_usd_cents = $4",
    "updated_at = $5",
  ];
  const params: unknown[] = [
    invoiceId,
    subtotalUsdCents,
    adjustmentsUsdCents,
    grandTotalUsdCents,
    nowIso(),
  ];
  if (hasManualGrandTotalColumn) {
    setClauses.push("manual_grand_total_usd_cents = $6");
    params.push(options?.clearGrandManualTotal === true ? null : manualGrandTotalValue);
  }

  await query(`update invoices set ${setClauses.join(", ")} where id = $1`, params);
}

export async function listAvailablePaymentMonths(companyId: string): Promise<string[]> {
  const [cashFlowResult, salaryResult] = await Promise.all([
    query<{ payment_month: string }>(
      `select payment_month from invoice_payment_employee_entries where company_id = $1`,
      [companyId],
    ),
    query<{ month: string }>(
      `select month from employee_salary_payments where company_id = $1`,
      [companyId],
    ),
  ]);

  const months = [
    ...new Set([
      ...cashFlowResult.rows.map((row) => row.payment_month),
      ...salaryResult.rows.map((row) => row.month),
    ]),
  ].filter(Boolean);
  months.sort((a, b) => b.localeCompare(a)); // Descending order
  return months;
}

export async function listAvailablePaymentMonthsForCompanies(
  companyIds: string[],
): Promise<string[]> {
  const uniqueCompanyIds = uniqueNonEmptyValues(companyIds);
  if (uniqueCompanyIds.length === 0) {
    return [];
  }

  const [cashFlowResult, salaryResult] = await Promise.all([
    query<{ payment_month: string }>(
      `select payment_month from invoice_payment_employee_entries where company_id = any($1::text[])`,
      [uniqueCompanyIds],
    ),
    query<{ month: string }>(
      `select month from employee_salary_payments where company_id = any($1::text[])`,
      [uniqueCompanyIds],
    ),
  ]);

  const months = [
    ...new Set([
      ...cashFlowResult.rows.map((row) => row.payment_month),
      ...salaryResult.rows.map((row) => row.month),
    ]),
  ].filter(Boolean);
  months.sort((a, b) => b.localeCompare(a));
  return months;
}

export async function listCompanies() {
  const { rows } = await query<DbCompany>(
    `select id, name, billing_address, default_note, created_at::text as created_at
     from companies
     order by created_at desc`,
  );
  return rows.map(mapCompany);
}

export async function createCompany(input: {
  name: string;
  billingAddress: string;
  defaultNote: string;
}) {
  const { rows: existingCompanyRows } = await query<{ name: string }>(
    `select name from companies`,
  );

  assertNoCaseInsensitiveDuplicate({
    existingValues: existingCompanyRows.map((row) => String(row.name)),
    candidateValue: input.name,
    entityLabel: "Company",
  });

  const row = await requireOne<DbCompany>(
    `insert into companies (id, name, billing_address, default_note, created_at)
     values ($1, $2, $3, $4, $5)
     returning id, name, billing_address, default_note, created_at::text as created_at`,
    [nextId("company"), input.name, input.billingAddress, input.defaultNote, nowIso()],
    "Company insert did not return a row.",
  );
  return mapCompany(row);
}

export async function updateCompany(input: {
  companyId: string;
  name: string;
  billingAddress: string;
  defaultNote: string;
}) {
  const { rows: existingCompanyRows } = await query<{ id: string; name: string }>(
    `select id, name from companies`,
  );

  assertNoCaseInsensitiveDuplicate({
    existingValues: existingCompanyRows
      .filter((row) => String(row.id) !== input.companyId)
      .map((row) => String(row.name)),
    candidateValue: input.name,
    entityLabel: "Company",
  });

  const row = await requireOne<DbCompany>(
    `update companies
     set name = $2, billing_address = $3, default_note = $4
     where id = $1
     returning id, name, billing_address, default_note, created_at::text as created_at`,
    [input.companyId, input.name, input.billingAddress, input.defaultNote],
    "Company not found.",
  );
  return mapCompany(row);
}

type ListEmployeesOptions = {
  activeOnly?: boolean;
};

const EMPLOYEE_SELECT_COLUMNS = `
  id, company_id, full_name, pan_number, pf_uan, phone_number, designation, default_team,
  billing_rate_usd_cents,
  default_paid_usd_inr_rate::float8 as default_paid_usd_inr_rate,
  default_actual_paid_inr_cents::float8 as default_actual_paid_inr_cents,
  default_basic_inr_cents::float8 as default_basic_inr_cents,
  default_special_allowance_inr_cents::float8 as default_special_allowance_inr_cents,
  default_insurance_inr_cents::float8 as default_insurance_inr_cents,
  default_bonus_inr_cents::float8 as default_bonus_inr_cents,
  default_pf_inr_cents::float8 as default_pf_inr_cents,
  default_tds_inr_cents::float8 as default_tds_inr_cents,
  hrs_per_week::float8 as hrs_per_week,
  active_from::text as active_from,
  active_to::text as active_to,
  is_active,
  created_at::text as created_at
`;

export async function listEmployees(companyId?: string, options: ListEmployeesOptions = {}) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (companyId) {
    params.push(companyId);
    conditions.push(`company_id = $${params.length}`);
  }
  if (options.activeOnly) {
    conditions.push(`is_active = true`);
  }
  const where = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";

  const { rows } = await query<DbEmployee>(
    `select ${EMPLOYEE_SELECT_COLUMNS} from employees ${where} order by full_name`,
    params,
  );
  return rows.map(mapEmployee);
}

export async function listEmployeesForCompanies(
  companyIds: string[],
  options: ListEmployeesOptions = {},
) {
  const uniqueCompanyIds = uniqueNonEmptyValues(companyIds);
  if (uniqueCompanyIds.length === 0) {
    return [];
  }

  const conditions = [`company_id = any($1::text[])`];
  const params: unknown[] = [uniqueCompanyIds];
  if (options.activeOnly) {
    conditions.push(`is_active = true`);
  }

  const { rows } = await query<DbEmployee>(
    `select ${EMPLOYEE_SELECT_COLUMNS} from employees where ${conditions.join(" and ")} order by full_name`,
    params,
  );
  return rows.map(mapEmployee);
}

async function listTeams(companyId?: string) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (companyId) {
    params.push(companyId);
    conditions.push(`company_id = $${params.length}`);
  }
  const where = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";

  const { rows } = await query<DbTeam>(
    `select id, company_id, name, created_at::text as created_at
     from teams ${where} order by name`,
    params,
  );
  return rows.map(mapTeam);
}

export async function listAvailableTeamNames(companyId: string) {
  const [teams, employees] = await Promise.all([
    listTeams(companyId),
    listEmployees(companyId, { activeOnly: true }),
  ]);

  return buildAvailableTeamNames({
    masterTeamNames: teams.map((team) => team.name),
    employeeDefaultTeams: employees.map((employee) => employee.defaultTeam),
  });
}

export async function listAvailableTeamNamesForCompanies(companyIds: string[]) {
  const uniqueCompanyIds = uniqueNonEmptyValues(companyIds);
  if (uniqueCompanyIds.length === 0) {
    return {};
  }

  const [teamsResult, employees] = await Promise.all([
    query<DbTeam>(
      `select id, company_id, name, created_at::text as created_at
       from teams where company_id = any($1::text[]) order by name`,
      [uniqueCompanyIds],
    ),
    listEmployeesForCompanies(uniqueCompanyIds, { activeOnly: true }),
  ]);

  const teamNamesByCompany = new Map<string, string[]>();
  for (const row of teamsResult.rows) {
    const companyId = String(row.company_id);
    teamNamesByCompany.set(companyId, [
      ...(teamNamesByCompany.get(companyId) ?? []),
      String(row.name ?? ""),
    ]);
  }

  const employeeTeamsByCompany = new Map<string, string[]>();
  for (const employee of employees) {
    employeeTeamsByCompany.set(employee.companyId, [
      ...(employeeTeamsByCompany.get(employee.companyId) ?? []),
      employee.defaultTeam,
    ]);
  }

  return Object.fromEntries(
    uniqueCompanyIds.map((companyId) => [
      companyId,
      buildAvailableTeamNames({
        masterTeamNames: teamNamesByCompany.get(companyId) ?? [],
        employeeDefaultTeams: employeeTeamsByCompany.get(companyId) ?? [],
      }),
    ]),
  );
}

export async function createTeam(input: { companyId: string; name: string }) {
  const existingTeamNames = await listAvailableTeamNames(input.companyId);

  assertNoCaseInsensitiveDuplicate({
    existingValues: existingTeamNames,
    candidateValue: input.name,
    entityLabel: "Team",
  });

  const row = await requireOne<DbTeam>(
    `insert into teams (id, company_id, name, created_at)
     values ($1, $2, $3, $4)
     returning id, company_id, name, created_at::text as created_at`,
    [nextId("team_master"), input.companyId, input.name.trim().replace(/\s+/g, " "), nowIso()],
    "Team insert did not return a row.",
  );
  return mapTeam(row);
}

export async function createEmployee(input: {
  companyId: string;
  fullName: string;
  panNumber?: string;
  pfUan?: string;
  phoneNumber?: string;
  designation: string;
  defaultTeam: string;
  billingRateUsdCents: number;
  defaultPaidUsdInrRate?: number;
  defaultActualPaidInrCents?: number;
  defaultBasicInrCents?: number;
  defaultSpecialAllowanceInrCents?: number;
  defaultInsuranceInrCents?: number;
  defaultBonusInrCents?: number;
  defaultPfInrCents?: number;
  defaultTdsInrCents?: number;
  hrsPerWeek: number;
  activeFrom: string;
  activeTo?: string;
}) {
  const { rows: existingEmployeeRows } = await query<{ full_name: string }>(
    `select full_name from employees where company_id = $1`,
    [input.companyId],
  );

  assertNoCaseInsensitiveDuplicate({
    existingValues: existingEmployeeRows.map((row) => String(row.full_name)),
    candidateValue: input.fullName,
    entityLabel: "Employee",
  });

  const row = await requireOne<DbEmployee>(
    `insert into employees (
       id, company_id, full_name, pan_number, pf_uan, phone_number, designation, default_team,
       billing_rate_usd_cents, default_paid_usd_inr_rate, default_actual_paid_inr_cents,
       default_basic_inr_cents, default_special_allowance_inr_cents, default_insurance_inr_cents,
       default_bonus_inr_cents, default_pf_inr_cents, default_tds_inr_cents, hrs_per_week,
       active_from, active_to, is_active, created_at
     ) values (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
     )
     returning ${EMPLOYEE_SELECT_COLUMNS}`,
    [
      nextId("employee"),
      input.companyId,
      input.fullName,
      input.panNumber || null,
      input.pfUan || null,
      input.phoneNumber || null,
      input.designation,
      input.defaultTeam,
      input.billingRateUsdCents,
      input.defaultPaidUsdInrRate ?? 0,
      input.defaultActualPaidInrCents ?? 0,
      input.defaultBasicInrCents ?? 0,
      input.defaultSpecialAllowanceInrCents ?? 0,
      input.defaultInsuranceInrCents ?? 0,
      input.defaultBonusInrCents ?? 0,
      input.defaultPfInrCents ?? 0,
      input.defaultTdsInrCents ?? 0,
      input.hrsPerWeek,
      input.activeFrom,
      input.activeTo ?? null,
      true,
      nowIso(),
    ],
    "Employee insert did not return a row.",
  );
  return mapEmployee(row);
}

const INVOICE_SELECT_COLUMNS = `
  id, company_id, month, year, invoice_number,
  billing_date::text as billing_date, billing_duration, due_date::text as due_date,
  status, note_text, subtotal_usd_cents, adjustments_usd_cents, grand_total_usd_cents,
  manual_grand_total_usd_cents, source_invoice_id, pdf_path,
  created_at::text as created_at, updated_at::text as updated_at
`;

export async function listInvoices() {
  const { rows } = await query<DbInvoice>(
    `select ${INVOICE_SELECT_COLUMNS} from invoices order by year desc, month desc`,
  );
  return rows.map(mapInvoice).sort(sortInvoicesDesc);
}

export async function listInvoicesForCompany(companyId: string) {
  const { rows } = await query<DbInvoice>(
    `select ${INVOICE_SELECT_COLUMNS} from invoices
     where company_id = $1
     order by year desc, month desc, created_at desc`,
    [companyId],
  );
  return rows.map(mapInvoice).sort(sortInvoicesDesc);
}

export async function listInvoicesForCompanies(companyIds: string[]) {
  const uniqueCompanyIds = uniqueNonEmptyValues(companyIds);
  if (uniqueCompanyIds.length === 0) {
    return [];
  }

  const { rows } = await query<DbInvoice>(
    `select ${INVOICE_SELECT_COLUMNS} from invoices
     where company_id = any($1::text[])
     order by year desc, month desc, created_at desc`,
    [uniqueCompanyIds],
  );
  return rows.map(mapInvoice).sort(sortInvoicesDesc);
}

export async function listInvoiceCashoutRates(invoiceIds: string[]) {
  const uniqueInvoiceIds = uniqueNonEmptyValues(invoiceIds);
  if (uniqueInvoiceIds.length === 0) {
    return new Map<string, number>();
  }

  const { rows } = await query<{ invoice_id: string; usd_inr_rate: number }>(
    `select invoice_id, usd_inr_rate::float8 as usd_inr_rate
     from invoice_realizations
     where invoice_id = any($1::text[])`,
    [uniqueInvoiceIds],
  );

  return new Map(rows.map((row) => [String(row.invoice_id), Number(row.usd_inr_rate ?? 0)]));
}

export async function createInvoiceDraft(input: {
  companyId: string;
  month: number;
  year: number;
  invoiceNumber: string;
  billingDate: string;
  billingDuration?: string;
  dueDate: string;
  duplicateSourceId?: string;
  selectedTeamNames?: string[];
}) {
  const { rows: existingInvoiceRows } = await query<{ invoice_number: string }>(
    `select invoice_number from invoices`,
  );

  assertNoCaseInsensitiveDuplicate({
    existingValues: existingInvoiceRows.map((row) => String(row.invoice_number)),
    candidateValue: input.invoiceNumber,
    entityLabel: "Invoice",
  });

  const companyRow = await requireOne<DbCompany>(
    `select id, name, billing_address, default_note, created_at::text as created_at
     from companies where id = $1`,
    [input.companyId],
    "Company not found.",
  );

  const invoiceId = nextId("invoice");
  const company = mapCompany(companyRow);
  const payload = {
    id: invoiceId,
    company_id: input.companyId,
    month: input.month,
    year: input.year,
    invoice_number: input.invoiceNumber,
    billing_date: input.billingDate,
    billing_duration: input.billingDuration?.trim() || null,
    due_date: input.dueDate,
    status: "draft" as InvoiceStatus,
    note_text: company.defaultNote,
    subtotal_usd_cents: 0,
    adjustments_usd_cents: 0,
    grand_total_usd_cents: 0,
    manual_grand_total_usd_cents: null,
    source_invoice_id: input.duplicateSourceId ?? null,
    pdf_path: `/api/invoices/${invoiceId}/pdf`,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  const data = await insertInvoiceWithSchemaFallback(payload);

  if (input.duplicateSourceId) {
    const sourceDetail = await getInvoiceDetail(input.duplicateSourceId);
    if (!sourceDetail) {
      throw new Error("Source invoice not found");
    }

    for (const team of sourceDetail.teams) {
      const insertedTeam = await addInvoiceTeam(invoiceId, team.teamName, {
        autoIncludeMembers: false,
        recomputeInvoice: false,
      });
      for (const lineItem of team.lineItems) {
        await addInvoiceLineItem({
          invoiceId,
          invoiceTeamId: insertedTeam.id,
          employeeId: lineItem.employeeId,
          hrsPerWeek: lineItem.hrsPerWeek,
          daysWorked: lineItem.daysWorked,
          billingRateUsdCents: lineItem.billingRateUsdCents,
          recomputeInvoice: false,
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
        recomputeInvoice: false,
      });
    }

    await updateInvoiceNote(invoiceId, sourceDetail.invoice.noteText);
  } else {
    const selectedTeamNames = buildAvailableTeamNames({
      masterTeamNames: input.selectedTeamNames ?? [],
      employeeDefaultTeams: [],
    });
    for (const teamName of selectedTeamNames) {
      await addInvoiceTeam(invoiceId, teamName, {
        autoIncludeMembers: true,
        recomputeInvoice: false,
      });
    }
  }

  await recomputeInvoiceTotals(invoiceId, {
    clearTeamManualTotals: true,
    clearGrandManualTotal: true,
  });

  return mapInvoice(data);
}

async function resolveEmployeeForSecurityDeposit(input: {
  companyId: string;
  employeeName: string;
}) {
  const normalizedEmployeeName = normalizeEmployeeNameForMatch(input.employeeName);
  if (!normalizedEmployeeName) {
    throw new Error("Employee is required for security deposit adjustments.");
  }

  const { rows: employeeRows } = await query<{ id: string; full_name: string }>(
    `select id, full_name from employees where company_id = $1`,
    [input.companyId],
  );

  const match = employeeRows.find(
    (row) => normalizeEmployeeNameForMatch(String(row.full_name)) === normalizedEmployeeName,
  );
  if (!match) {
    throw new Error("Selected employee was not found in this company.");
  }

  return {
    employeeId: String(match.id),
    employeeName: String(match.full_name),
  };
}

async function getSecurityDepositBalanceUsdCents(input: {
  companyId: string;
  employeeId: string;
}) {
  try {
    const { rows } = await query<{ movement_type: "credit" | "debit"; amount_usd_cents: number }>(
      `select movement_type, amount_usd_cents
       from security_deposit_ledger
       where company_id = $1 and employee_id = $2`,
      [input.companyId, input.employeeId],
    );

    return rows.reduce((sum, row) => {
      const amount = Number(row.amount_usd_cents ?? 0);
      return row.movement_type === "credit" ? sum + amount : sum - amount;
    }, 0);
  } catch (error) {
    if (isMissingRelationError(error, "security_deposit_ledger")) {
      return 0;
    }
    throw error;
  }
}

export async function getCompanySecurityDepositBalances(companyId: string) {
  const employees = await listEmployees(companyId);
  if (employees.length === 0) {
    return {} as Record<string, number>;
  }

  const employeeIds = employees.map((employee) => employee.id);

  try {
    const { rows } = await query<DbSecurityDepositLedger>(
      `select id, company_id, employee_id, invoice_id, adjustment_id, movement_type,
              amount_usd_cents, created_at::text as created_at
       from security_deposit_ledger
       where company_id = $1 and employee_id = any($2::text[])`,
      [companyId, employeeIds],
    );

    const byEmployeeId = new Map<string, number>();
    for (const row of rows) {
      const current = byEmployeeId.get(row.employee_id) ?? 0;
      const delta =
        row.movement_type === "credit"
          ? Number(row.amount_usd_cents)
          : -Number(row.amount_usd_cents);
      byEmployeeId.set(row.employee_id, current + delta);
    }

    return Object.fromEntries(
      employees.map((employee) => [employee.fullName, byEmployeeId.get(employee.id) ?? 0]),
    );
  } catch (error) {
    if (isMissingRelationError(error, "security_deposit_ledger")) {
      return Object.fromEntries(employees.map((employee) => [employee.fullName, 0]));
    }
    throw error;
  }
}

export async function addInvoiceTeam(
  invoiceId: string,
  teamName: string,
  options?: { autoIncludeMembers?: boolean; recomputeInvoice?: boolean },
) {
  const { rows: existingTeamRows } = await query<{ team_name: string }>(
    `select team_name from invoice_teams where invoice_id = $1`,
    [invoiceId],
  );

  assertNoCaseInsensitiveDuplicate({
    existingValues: existingTeamRows.map((row) => String(row.team_name)),
    candidateValue: teamName,
    entityLabel: "Team",
  });

  const { rows: countRows } = await query<{ count: number }>(
    `select count(*)::int as count from invoice_teams where invoice_id = $1`,
    [invoiceId],
  );
  const count = countRows[0]?.count ?? 0;

  const row = await requireOne<DbInvoiceTeam>(
    `insert into invoice_teams (id, invoice_id, team_name, sort_order)
     values ($1, $2, $3, $4)
     returning id, invoice_id, team_name, sort_order, manual_total_usd_cents`,
    [nextId("team"), invoiceId, teamName, count + 1],
    "Invoice team insert did not return a row.",
  );

  const mappedTeam = mapInvoiceTeam(row);

  if (options?.autoIncludeMembers !== false) {
    const invoiceRow = await requireOne<{ company_id: string }>(
      `select company_id from invoices where id = $1`,
      [invoiceId],
      "Invoice not found.",
    );

    const employees = await listEmployees(String(invoiceRow.company_id), { activeOnly: true });
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
        recomputeInvoice: false,
      });
    }
  }

  if (options?.recomputeInvoice !== false) {
    await recomputeInvoiceTotals(invoiceId, {
      clearTeamManualTotals: true,
      clearGrandManualTotal: true,
    });
  }
  return mappedTeam;
}

export async function deleteInvoiceTeam(invoiceId: string, invoiceTeamId: string) {
  await query(`delete from invoice_teams where id = $1 and invoice_id = $2`, [
    invoiceTeamId,
    invoiceId,
  ]);

  await recomputeInvoiceTotals(invoiceId, {
    clearTeamManualTotals: true,
    clearGrandManualTotal: true,
  });
}

async function addInvoiceLineItem(input: {
  invoiceId: string;
  invoiceTeamId: string;
  employeeId: string;
  hrsPerWeek: number;
  daysWorked?: number;
  billingRateUsdCents?: number;
  recomputeInvoice?: boolean;
}) {
  const [employeeRow, teamRow, invoiceRow] = await Promise.all([
    requireOne<DbEmployee>(
      `select ${EMPLOYEE_SELECT_COLUMNS} from employees where id = $1`,
      [input.employeeId],
      "Employee not found.",
    ),
    requireOne<DbInvoiceTeam>(
      `select id, invoice_id, team_name, sort_order, manual_total_usd_cents
       from invoice_teams where id = $1`,
      [input.invoiceTeamId],
      "Invoice team not found.",
    ),
    requireOne<{ month: number; year: number }>(
      `select month, year from invoices where id = $1`,
      [input.invoiceId],
      "Invoice not found.",
    ),
  ]);
  if (!employeeRow.is_active) {
    throw new Error("Inactive employees cannot be added to new invoice work.");
  }

  const { rows: existingLineRows } = await query<{ employee_id: string }>(
    `select employee_id from invoice_line_items where invoice_team_id = $1`,
    [input.invoiceTeamId],
  );

  assertNoDuplicateEmployeeInTeam({
    existingEmployeeIds: existingLineRows.map((row) => String(row.employee_id)),
    employeeId: input.employeeId,
  });

  const employee = mapEmployee(employeeRow);
  const team = mapInvoiceTeam(teamRow);
  const billingRateUsdCents = input.billingRateUsdCents ?? employee.billingRateUsdCents;
  const daysInMonth = getDaysInMonth(Number(invoiceRow.month), Number(invoiceRow.year));
  const normalizedDaysWorked =
    input.daysWorked === undefined ? daysInMonth : Math.max(1, Math.round(input.daysWorked));
  const calculated = calculateLineItemTotals({
    billingRateUsdCents,
    hrsPerWeek: input.hrsPerWeek,
    daysWorked: normalizedDaysWorked,
    daysInMonth,
  });

  const payload = {
    id: nextId("line"),
    invoice_team_id: team.id,
    employee_id: employee.id,
    employee_name_snapshot: employee.fullName,
    designation_snapshot: employee.designation,
    team_name_snapshot: team.teamName,
    billing_rate_usd_cents: billingRateUsdCents,
    hrs_per_week: input.hrsPerWeek,
    days_worked: normalizedDaysWorked,
    billed_total_usd_cents: calculated.billedTotalUsdCents,
  };

  const data = await insertInvoiceLineItemWithSchemaFallback(payload);

  if (input.recomputeInvoice !== false) {
    await recomputeInvoiceTotals(input.invoiceId, {
      clearTeamManualTotals: true,
      clearGrandManualTotal: true,
    });
  }
  return normalizeLineItemDaysWorked(
    mapInvoiceLineItem(data),
    Number(invoiceRow.month),
    Number(invoiceRow.year),
  );
}

export async function deleteInvoiceLineItem(invoiceId: string, lineItemId: string) {
  await query(`delete from invoice_line_items where id = $1`, [lineItemId]);

  await recomputeInvoiceTotals(invoiceId, {
    clearTeamManualTotals: true,
    clearGrandManualTotal: true,
  });
}

export async function updateInvoiceLineItem(input: {
  invoiceId: string;
  lineItemId: string;
  hrsPerWeek: number;
  daysWorked: number;
  billingRateUsdCents: number;
}) {
  const [lineRow, invoiceRow] = await Promise.all([
    requireOne<DbInvoiceLineItem>(
      `select id, invoice_team_id, employee_id, employee_name_snapshot, designation_snapshot,
              team_name_snapshot, billing_rate_usd_cents, hrs_per_week::float8 as hrs_per_week,
              days_worked, billed_total_usd_cents, manual_total_usd_cents
       from invoice_line_items where id = $1`,
      [input.lineItemId],
      "Invoice line item not found.",
    ),
    requireOne<{ month: number; year: number }>(
      `select month, year from invoices where id = $1`,
      [input.invoiceId],
      "Invoice not found.",
    ),
  ]);

  const existingLineItem = mapInvoiceLineItem(lineRow);
  const daysInMonth = getDaysInMonth(Number(invoiceRow.month), Number(invoiceRow.year));
  const normalizedDaysWorked = Math.max(1, Math.round(input.daysWorked));
  const calculated = calculateLineItemTotals({
    billingRateUsdCents: input.billingRateUsdCents,
    hrsPerWeek: input.hrsPerWeek,
    daysWorked: normalizedDaysWorked,
    daysInMonth,
  });

  await updateInvoiceLineItemWithSchemaFallback(input.lineItemId, {
    billing_rate_usd_cents: input.billingRateUsdCents,
    hrs_per_week: input.hrsPerWeek,
    days_worked: normalizedDaysWorked,
    billed_total_usd_cents: calculated.billedTotalUsdCents,
    manual_total_usd_cents: null,
  });

  await query(`update employees set billing_rate_usd_cents = $2 where id = $1`, [
    existingLineItem.employeeId,
    input.billingRateUsdCents,
  ]);

  await recomputeInvoiceTotals(input.invoiceId, {
    clearTeamManualTotals: true,
    clearGrandManualTotal: true,
  });
}

export async function assignEmployeeToInvoiceTeam(input: {
  invoiceId: string;
  invoiceTeamId: string;
  employeeId: string;
}) {
  const [detail, targetTeamRow, employeeRow] = await Promise.all([
    getInvoiceDetail(input.invoiceId),
    requireOne<DbInvoiceTeam>(
      `select id, invoice_id, team_name, sort_order, manual_total_usd_cents
       from invoice_teams where id = $1`,
      [input.invoiceTeamId],
      "Invoice team not found.",
    ),
    requireOne<DbEmployee>(
      `select ${EMPLOYEE_SELECT_COLUMNS} from employees where id = $1`,
      [input.employeeId],
      "Employee not found.",
    ),
  ]);

  if (!detail) {
    throw new Error("Invoice not found");
  }

  const targetTeam = mapInvoiceTeam(targetTeamRow);
  const employee = mapEmployee(employeeRow);
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
    await query(`update employees set default_team = $2 where id = $1`, [
      employee.id,
      targetTeam.teamName,
    ]);
    return;
  }

  if (existingAssignment) {
    const teamIds = detail.teams.map((team) => team.id);
    const { rows: existingRows } = await query<{ id: string }>(
      `select id from invoice_line_items where invoice_team_id = any($1::text[]) and employee_id = $2`,
      [teamIds, input.employeeId],
    );

    const rowToKeep = existingRows.find((row) => row.id === existingAssignment.lineItemId);
    const rowsToDelete = existingRows.filter(
      (row) => row.id !== existingAssignment.lineItemId,
    );

    await query(
      `update invoice_line_items set invoice_team_id = $2, team_name_snapshot = $3 where id = $1`,
      [rowToKeep?.id ?? existingAssignment.lineItemId, targetTeam.id, targetTeam.teamName],
    );

    if (rowsToDelete.length > 0) {
      await query(`delete from invoice_line_items where id = any($1::text[])`, [
        rowsToDelete.map((row) => row.id),
      ]);
    }
  } else {
    await addInvoiceLineItem({
      invoiceId: input.invoiceId,
      invoiceTeamId: targetTeam.id,
      employeeId: employee.id,
      hrsPerWeek: employee.hrsPerWeek,
      billingRateUsdCents: employee.billingRateUsdCents,
      recomputeInvoice: false,
    });
  }

  await query(`update employees set default_team = $2 where id = $1`, [
    employee.id,
    targetTeam.teamName,
  ]);

  await recomputeInvoiceTotals(input.invoiceId, {
    clearTeamManualTotals: true,
    clearGrandManualTotal: true,
  });
}

export async function addInvoiceAdjustment(input: {
  invoiceId: string;
  type: AdjustmentType;
  label: string;
  employeeName?: string;
  rateUsdCents?: number;
  hrsPerWeek?: number;
  daysWorked?: number;
  amountUsdCents: number;
  recomputeInvoice?: boolean;
}) {
  const invoiceRow = await requireOne<{ company_id: string }>(
    `select company_id from invoices where id = $1`,
    [input.invoiceId],
    "Invoice not found.",
  );
  const companyId = String(invoiceRow.company_id);

  let depositEmployee: { employeeId: string; employeeName: string } | undefined;
  if ((input.type === "onboarding" || input.type === "offboarding") && input.employeeName) {
    depositEmployee = await resolveEmployeeForSecurityDeposit({
      companyId,
      employeeName: input.employeeName,
    });

    if (input.type === "offboarding") {
      const currentBalance = await getSecurityDepositBalanceUsdCents({
        companyId,
        employeeId: depositEmployee.employeeId,
      });
      const requestedDeduction = Math.abs(input.amountUsdCents);
      if (requestedDeduction > currentBalance) {
        throw new Error(
          `Offboarding deduction exceeds security deposit balance (${(
            currentBalance / 100
          ).toFixed(2)} USD).`,
        );
      }
    }
  }

  const { rows: existingRows } = await query<DbInvoiceAdjustment>(
    `select id, invoice_id, type, label, employee_name, rate_usd_cents,
            hrs_per_week::float8 as hrs_per_week, days_worked, amount_usd_cents, sort_order
     from invoice_adjustments where invoice_id = $1`,
    [input.invoiceId],
  );

  const candidateSignature = buildAdjustmentDuplicateSignature(input);
  const duplicateExists = existingRows
    .map(mapInvoiceAdjustment)
    .some((adjustment) => buildAdjustmentDuplicateSignature(adjustment) === candidateSignature);

  if (duplicateExists) {
    throw new Error("Duplicate adjustment already added.");
  }

  const { rows: countRows } = await query<{ count: number }>(
    `select count(*)::int as count from invoice_adjustments where invoice_id = $1`,
    [input.invoiceId],
  );
  const count = countRows[0]?.count ?? 0;

  // The adjustment row and its (optional) security-deposit-ledger movement
  // must land together: if the ledger insert failed after the adjustment
  // insert already committed, the deposit balance would silently drift out
  // of sync with the adjustments that are supposed to back it.
  let data: DbInvoiceAdjustment;
  try {
    data = await withTransaction(async (client) => {
      const insertResult = await client.query<DbInvoiceAdjustment>(
        `insert into invoice_adjustments
           (id, invoice_id, type, label, employee_name, rate_usd_cents, hrs_per_week, days_worked, amount_usd_cents, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         returning id, invoice_id, type, label, employee_name, rate_usd_cents,
                   hrs_per_week::float8 as hrs_per_week, days_worked, amount_usd_cents, sort_order`,
        [
          nextId("adjustment"),
          input.invoiceId,
          input.type,
          input.label,
          input.employeeName ?? null,
          input.rateUsdCents ?? null,
          input.hrsPerWeek ?? null,
          input.daysWorked ?? null,
          input.amountUsdCents,
          count + 1,
        ],
      );
      const inserted = insertResult.rows[0];
      if (!inserted) {
        throw new Error("Invoice adjustment insert did not return a row.");
      }

      if ((input.type === "onboarding" || input.type === "offboarding") && depositEmployee) {
        // security_deposit_ledger is allowed to not exist yet (pre-migration
        // databases) - isolate that failure with a savepoint so it doesn't
        // poison the outer transaction and take the adjustment insert down
        // with it.
        await client.query("savepoint sp_security_deposit_ledger");
        try {
          await client.query(
            `insert into security_deposit_ledger
               (id, company_id, employee_id, invoice_id, adjustment_id, movement_type, amount_usd_cents, created_at)
             values ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              nextId("deposit_ledger"),
              companyId,
              depositEmployee.employeeId,
              input.invoiceId,
              String(inserted.id),
              input.type === "onboarding" ? "credit" : "debit",
              Math.abs(input.amountUsdCents),
              nowIso(),
            ],
          );
        } catch (error) {
          if (!isMissingRelationError(error, "security_deposit_ledger")) {
            throw error;
          }
          await client.query("rollback to savepoint sp_security_deposit_ledger");
        }
      }

      return inserted;
    });
  } catch (error) {
    throw normalizeInvoiceAdjustmentSchemaError(error);
  }

  if (input.recomputeInvoice !== false) {
    await recomputeInvoiceTotals(input.invoiceId, {
      clearTeamManualTotals: true,
      clearGrandManualTotal: true,
    });
  }
  return mapInvoiceAdjustment(data);
}

export async function deleteInvoiceAdjustment(invoiceId: string, adjustmentId: string) {
  await withTransaction(async (client) => {
    await client.query("savepoint sp_security_deposit_ledger");
    try {
      await client.query(`delete from security_deposit_ledger where adjustment_id = $1`, [
        adjustmentId,
      ]);
    } catch (error) {
      if (!isMissingRelationError(error, "security_deposit_ledger")) {
        throw error;
      }
      await client.query("rollback to savepoint sp_security_deposit_ledger");
    }

    await client.query(`delete from invoice_adjustments where id = $1 and invoice_id = $2`, [
      adjustmentId,
      invoiceId,
    ]);
  });

  await recomputeInvoiceTotals(invoiceId, {
    clearTeamManualTotals: true,
    clearGrandManualTotal: true,
  });
}

export async function updateInvoiceLineItemTotal(input: {
  invoiceId: string;
  lineItemId: string;
  billedTotalUsdCents: number;
}) {
  await query(
    `update invoice_line_items
     set billed_total_usd_cents = $2, manual_total_usd_cents = $2
     where id = $1`,
    [input.lineItemId, input.billedTotalUsdCents],
  );

  await recomputeInvoiceTotals(input.invoiceId, {
    clearGrandManualTotal: true,
  });
}

export async function updateInvoiceTeamTotal(input: {
  invoiceId: string;
  invoiceTeamId: string;
  totalUsdCents: number;
}) {
  await query(
    `update invoice_teams set manual_total_usd_cents = $3 where id = $1 and invoice_id = $2`,
    [input.invoiceTeamId, input.invoiceId, input.totalUsdCents],
  );

  await recomputeInvoiceTotals(input.invoiceId, {
    clearGrandManualTotal: true,
  });
}

export async function updateInvoiceGrandTotal(input: {
  invoiceId: string;
  grandTotalUsdCents: number;
}) {
  await query(
    `update invoices
     set manual_grand_total_usd_cents = $2, grand_total_usd_cents = $2, updated_at = $3
     where id = $1`,
    [input.invoiceId, input.grandTotalUsdCents, nowIso()],
  );
}

export async function updateInvoiceHeader(input: {
  invoiceId: string;
  companyId: string;
  companyName: string;
  invoiceNumber: string;
  month: number;
  year: number;
  billingDate: string;
  dueDate: string;
  status: InvoiceStatus;
}) {
  const normalizedInvoiceNumber = input.invoiceNumber.trim();
  const normalizedCompanyName = input.companyName.trim();

  const { rows: existingInvoiceRows } = await query<{ id: string; invoice_number: string }>(
    `select id, invoice_number from invoices where id <> $1`,
    [input.invoiceId],
  );

  assertNoCaseInsensitiveDuplicate({
    existingValues: existingInvoiceRows.map((row) => String(row.invoice_number)),
    candidateValue: normalizedInvoiceNumber,
    entityLabel: "Invoice number",
  });

  await query(
    `update invoices
     set invoice_number = $2, month = $3, year = $4, billing_date = $5, due_date = $6,
         status = $7, updated_at = $8
     where id = $1`,
    [
      input.invoiceId,
      normalizedInvoiceNumber,
      input.month,
      input.year,
      input.billingDate,
      input.dueDate,
      input.status,
      nowIso(),
    ],
  );

  await query(`update companies set name = $2 where id = $1`, [
    input.companyId,
    normalizedCompanyName,
  ]);
}

export async function updateInvoiceAdjustmentAmount(input: {
  invoiceId: string;
  adjustmentId: string;
  amountUsdCents: number;
}) {
  await query(
    `update invoice_adjustments set amount_usd_cents = $3 where id = $1 and invoice_id = $2`,
    [input.adjustmentId, input.invoiceId, input.amountUsdCents],
  );

  await recomputeInvoiceTotals(input.invoiceId, {
    clearTeamManualTotals: true,
    clearGrandManualTotal: true,
  });
}

export async function updateEmployee(input: {
  employeeId: string;
  companyId: string;
  fullName: string;
  panNumber?: string;
  pfUan?: string;
  phoneNumber?: string;
  designation: string;
  defaultTeam: string;
  billingRateUsdCents: number;
  defaultPaidUsdInrRate?: number;
  defaultActualPaidInrCents?: number;
  defaultBasicInrCents?: number;
  defaultSpecialAllowanceInrCents?: number;
  defaultInsuranceInrCents?: number;
  defaultBonusInrCents?: number;
  defaultPfInrCents?: number;
  defaultTdsInrCents?: number;
  hrsPerWeek: number;
  activeFrom: string;
  activeTo?: string;
  isActive: boolean;
}) {
  const row = await requireOne<DbEmployee>(
    `update employees set
       company_id = $2, full_name = $3, pan_number = $4, pf_uan = $5, phone_number = $6,
       designation = $7, default_team = $8, billing_rate_usd_cents = $9,
       default_paid_usd_inr_rate = $10, default_actual_paid_inr_cents = $11,
       default_basic_inr_cents = $12, default_special_allowance_inr_cents = $13,
       default_insurance_inr_cents = $14, default_bonus_inr_cents = $15,
       default_pf_inr_cents = $16, default_tds_inr_cents = $17, hrs_per_week = $18,
       active_from = $19, active_to = $20, is_active = $21
     where id = $1
     returning ${EMPLOYEE_SELECT_COLUMNS}`,
    [
      input.employeeId,
      input.companyId,
      input.fullName,
      input.panNumber || null,
      input.pfUan || null,
      input.phoneNumber || null,
      input.designation,
      input.defaultTeam,
      input.billingRateUsdCents,
      input.defaultPaidUsdInrRate ?? 0,
      input.defaultActualPaidInrCents ?? 0,
      input.defaultBasicInrCents ?? 0,
      input.defaultSpecialAllowanceInrCents ?? 0,
      input.defaultInsuranceInrCents ?? 0,
      input.defaultBonusInrCents ?? 0,
      input.defaultPfInrCents ?? 0,
      input.defaultTdsInrCents ?? 0,
      input.hrsPerWeek,
      input.activeFrom,
      input.activeTo ?? null,
      input.isActive,
    ],
    "Employee not found.",
  );
  return mapEmployee(row);
}

export async function updateInvoiceNote(invoiceId: string, noteText: string) {
  const row = await requireOne<DbInvoice>(
    `update invoices set note_text = $2, updated_at = $3
     where id = $1
     returning ${INVOICE_SELECT_COLUMNS}`,
    [invoiceId, noteText, nowIso()],
    "Invoice not found.",
  );
  return mapInvoice(row);
}

export async function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
  const row = await requireOne<DbInvoice>(
    `update invoices set status = $2, updated_at = $3
     where id = $1
     returning ${INVOICE_SELECT_COLUMNS}`,
    [invoiceId, status, nowIso()],
    "Invoice not found.",
  );
  return mapInvoice(row);
}

export async function deleteInvoice(invoiceId: string) {
  const invoiceRow = await findOne<{ id: string }>(`select id from invoices where id = $1`, [
    invoiceId,
  ]);
  if (!invoiceRow) {
    throw new Error("Invoice not found.");
  }

  // Delete dependent rows that do not cascade from invoice_line_items.
  await query(`delete from employee_payouts where invoice_id = $1`, [invoiceId]);

  await query(`delete from invoices where id = $1`, [invoiceId]);
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
  if (detail.invoice.status !== "sent" && detail.invoice.status !== "received") {
    throw new Error("Only sent invoices can be cashed out.");
  }

  const realization = createRealizationRecord({
    invoiceId,
    alreadyRealized: Boolean(detail.realization),
    realizedAt,
    dollarInboundUsdCents,
    usdInrRate,
  });

  const row = await requireOne<DbInvoiceRealization>(
    `insert into invoice_realizations
       (id, invoice_id, realized_at, dollar_inbound_usd_cents, usd_inr_rate, notes, created_at)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, invoice_id, realized_at::text as realized_at, dollar_inbound_usd_cents,
               usd_inr_rate::float8 as usd_inr_rate, notes, created_at::text as created_at`,
    [
      nextId("realization"),
      invoiceId,
      realizedAt,
      realization.dollarInboundUsdCents,
      realization.usdInrRate,
      null,
      nowIso(),
    ],
    "Invoice realization insert did not return a row.",
  );

  await updateInvoiceStatus(invoiceId, "cashed_out");
  return mapInvoiceRealization(row);
}

export async function upsertEmployeeStatementSection(input: {
  employeeId: string;
  invoiceRows: EmployeeStatementInvoiceRow[];
  monthSummaries: EmployeeStatementMonthSummary[];
}) {
  if (input.invoiceRows.length > 0) {
    const columns = [
      "id",
      "employee_id",
      "invoice_id",
      "month_key",
      "employee_name_snapshot",
      "invoice_number_snapshot",
      "dollar_inward_usd_cents",
      "onboarding_advance_usd_cents",
      "reimbursement_usd_cents",
      "reimbursement_labels_text",
      "appraisal_advance_usd_cents",
      "offboarding_deduction_usd_cents",
      "updated_at",
    ];
    const values: string[] = [];
    const params: unknown[] = [];
    input.invoiceRows.forEach((row, index) => {
      const rowValues = [
        nextId("employee_statement_invoice_row"),
        input.employeeId,
        row.invoiceId,
        row.monthKey,
        row.employeeName,
        row.invoiceNumber,
        row.dollarInwardUsdCents,
        row.onboardingAdvanceUsdCents,
        row.reimbursementUsdCents,
        row.reimbursementLabelsText,
        row.appraisalAdvanceUsdCents,
        row.offboardingDeductionUsdCents,
        nowIso(),
      ];
      const offset = index * columns.length;
      values.push(
        `(${rowValues.map((_, valueIndex) => `$${offset + valueIndex + 1}`).join(", ")})`,
      );
      params.push(...rowValues);
    });

    await query(
      `insert into employee_statement_invoice_rows (${columns.join(", ")})
       values ${values.join(", ")}
       on conflict (employee_id, invoice_id) do update set
         month_key = excluded.month_key,
         employee_name_snapshot = excluded.employee_name_snapshot,
         invoice_number_snapshot = excluded.invoice_number_snapshot,
         dollar_inward_usd_cents = excluded.dollar_inward_usd_cents,
         onboarding_advance_usd_cents = excluded.onboarding_advance_usd_cents,
         reimbursement_usd_cents = excluded.reimbursement_usd_cents,
         reimbursement_labels_text = excluded.reimbursement_labels_text,
         appraisal_advance_usd_cents = excluded.appraisal_advance_usd_cents,
         offboarding_deduction_usd_cents = excluded.offboarding_deduction_usd_cents,
         updated_at = excluded.updated_at`,
      params,
    );
  }

  if (input.monthSummaries.length > 0) {
    const columns = [
      "id",
      "employee_id",
      "month_key",
      "month_label_snapshot",
      "effective_dollar_inward_usd_cents",
      "monthly_dollar_paid_usd_cents",
      "updated_at",
    ];
    const values: string[] = [];
    const params: unknown[] = [];
    input.monthSummaries.forEach((summary, index) => {
      const rowValues = [
        nextId("employee_statement_month_summary"),
        input.employeeId,
        summary.monthKey,
        summary.monthLabel,
        summary.effectiveDollarInwardUsdCents,
        summary.monthlyDollarPaidUsdCents,
        nowIso(),
      ];
      const offset = index * columns.length;
      values.push(
        `(${rowValues.map((_, valueIndex) => `$${offset + valueIndex + 1}`).join(", ")})`,
      );
      params.push(...rowValues);
    });

    await query(
      `insert into employee_statement_month_summaries (${columns.join(", ")})
       values ${values.join(", ")}
       on conflict (employee_id, month_key) do update set
         month_label_snapshot = excluded.month_label_snapshot,
         effective_dollar_inward_usd_cents = excluded.effective_dollar_inward_usd_cents,
         monthly_dollar_paid_usd_cents = excluded.monthly_dollar_paid_usd_cents,
         updated_at = excluded.updated_at`,
      params,
    );
  }

  return input;
}

export async function listEmployeeStatementInvoiceRows(input: {
  employeeIds: string[];
  startMonth?: string;
  endMonth?: string;
}) {
  if (input.employeeIds.length === 0) {
    return [] as EmployeeStatementInvoiceRow[];
  }

  const conditions = ["employee_id = any($1::text[])"];
  const params: unknown[] = [input.employeeIds];
  if (input.startMonth) {
    params.push(input.startMonth);
    conditions.push(`month_key >= $${params.length}`);
  }
  if (input.endMonth) {
    params.push(input.endMonth);
    conditions.push(`month_key <= $${params.length}`);
  }

  const { rows } = await query<DbEmployeeStatementInvoiceRow>(
    `select id, employee_id, invoice_id, month_key, employee_name_snapshot, invoice_number_snapshot,
            dollar_inward_usd_cents, onboarding_advance_usd_cents, reimbursement_usd_cents,
            reimbursement_labels_text, appraisal_advance_usd_cents, offboarding_deduction_usd_cents,
            created_at::text as created_at, updated_at::text as updated_at
     from employee_statement_invoice_rows
     where ${conditions.join(" and ")}
     order by month_key asc, invoice_number_snapshot asc`,
    params,
  );
  return rows.map(mapEmployeeStatementInvoiceRow);
}

export async function listEmployeeStatementMonthSummaries(input: {
  employeeIds: string[];
  startMonth?: string;
  endMonth?: string;
}) {
  if (input.employeeIds.length === 0) {
    return [] as EmployeeStatementMonthSummary[];
  }

  const conditions = ["employee_id = any($1::text[])"];
  const params: unknown[] = [input.employeeIds];
  if (input.startMonth) {
    params.push(input.startMonth);
    conditions.push(`month_key >= $${params.length}`);
  }
  if (input.endMonth) {
    params.push(input.endMonth);
    conditions.push(`month_key <= $${params.length}`);
  }

  const { rows } = await query<DbEmployeeStatementMonthSummary>(
    `select id, employee_id, month_key, month_label_snapshot, effective_dollar_inward_usd_cents,
            monthly_dollar_paid_usd_cents, created_at::text as created_at, updated_at::text as updated_at
     from employee_statement_month_summaries
     where ${conditions.join(" and ")}
     order by month_key asc`,
    params,
  );
  return rows.map(mapEmployeeStatementMonthSummary);
}

export async function getPnDashboardData(input: {
  companyId: string;
  periodType: PnPeriodType;
  employeeIds?: string[];
  paymentMonths?: string[];
}): Promise<PnDashboardData> {
  const cashFlowConditions = ["company_id = $1"];
  const cashFlowParams: unknown[] = [input.companyId];
  if (input.employeeIds && input.employeeIds.length > 0) {
    cashFlowParams.push(input.employeeIds);
    cashFlowConditions.push(`employee_id = any($${cashFlowParams.length}::text[])`);
  }
  if (input.paymentMonths && input.paymentMonths.length > 0) {
    cashFlowParams.push(input.paymentMonths);
    cashFlowConditions.push(`payment_month = any($${cashFlowParams.length}::text[])`);
  }

  const { rows: entries } = await query<DbDashboardCashFlowEntry>(
    `select id, employee_id, payment_month, employee_name_snapshot, company_id,
            base_dollar_inward_usd_cents, onboarding_advance_usd_cents,
            advance_override_inr_cents::float8 as advance_override_inr_cents,
            reimbursement_usd_cents, reimbursement_labels_text, appraisal_advance_usd_cents,
            offboarding_deduction_usd_cents, effective_dollar_inward_usd_cents,
            cashout_usd_inr_rate::float8 as cashout_usd_inr_rate,
            paid_usd_inr_rate::float8 as paid_usd_inr_rate,
            cash_in_inr_cents::float8 as cash_in_inr_cents,
            monthly_paid_inr_cents::float8 as monthly_paid_inr_cents,
            pf_inr_cents::float8 as pf_inr_cents,
            tds_inr_cents::float8 as tds_inr_cents,
            actual_paid_inr_cents::float8 as actual_paid_inr_cents,
            salary_paid_inr_cents::float8 as salary_paid_inr_cents,
            fx_commission_inr_cents::float8 as fx_commission_inr_cents,
            total_commission_usd_cents,
            commission_earned_inr_cents::float8 as commission_earned_inr_cents,
            gross_earnings_inr_cents::float8 as gross_earnings_inr_cents,
            days_worked, days_in_month, invoice_id
     from invoice_payment_employee_entries
     where ${cashFlowConditions.join(" and ")}`,
    cashFlowParams,
  );

  const salaryConditions = ["company_id = $1"];
  const salaryParams: unknown[] = [input.companyId];
  if (input.employeeIds && input.employeeIds.length > 0) {
    salaryParams.push(input.employeeIds);
    salaryConditions.push(`employee_id = any($${salaryParams.length}::text[])`);
  }
  if (input.paymentMonths && input.paymentMonths.length > 0) {
    salaryParams.push(input.paymentMonths);
    salaryConditions.push(`month = any($${salaryParams.length}::text[])`);
  }

  const { rows: salaryPaymentRows } = await query<DbDashboardSalaryPayment>(
    `select id, employee_id, employee_name_snapshot, company_id, month,
            paid_usd_inr_rate::float8 as paid_usd_inr_rate,
            monthly_paid_inr_cents::float8 as monthly_paid_inr_cents,
            salary_paid_inr_cents::float8 as salary_paid_inr_cents,
            pf_inr_cents::float8 as pf_inr_cents,
            tds_inr_cents::float8 as tds_inr_cents,
            actual_paid_inr_cents::float8 as actual_paid_inr_cents,
            days_worked::float8 as days_worked, days_in_month
     from employee_salary_payments
     where ${salaryConditions.join(" and ")}`,
    salaryParams,
  );

  const existingEmployeeMonthKeys = new Set(
    entries.map((row) => `${row.employee_id}|${row.payment_month}`),
  );
  const salaryOnlyRows = buildPnSalaryOnlySourceRows({
    existingEmployeeMonthKeys,
    salaryRows: salaryPaymentRows.map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name_snapshot,
      paymentMonth: row.month,
      daysWorked: Number(row.days_worked ?? 0),
      daysInMonth: Number(row.days_in_month ?? 0),
      paidUsdInrRate: Number(row.paid_usd_inr_rate ?? 0),
      monthlyPaidInrCents: Number(row.monthly_paid_inr_cents ?? 0),
      salaryPaidInrCents: Number(row.salary_paid_inr_cents ?? 0),
      pfInrCents: Number(row.pf_inr_cents ?? 0),
      tdsInrCents: Number(row.tds_inr_cents ?? 0),
      actualPaidInrCents: Number(row.actual_paid_inr_cents ?? 0),
    })),
  });

  const invoiceIds = [...new Set(entries.map((row) => row.invoice_id))];
  const { rows: invoiceRows } = await query<{
    id: string;
    month: number;
    year: number;
    invoice_number: string;
  }>(
    `select id, month, year, invoice_number
     from invoices
     where id = any($1::text[])`,
    [invoiceIds.length > 0 ? invoiceIds : ["__none__"]],
  );

  const invoicePeriodMap = new Map<
    string,
    { month: number; year: number; invoiceNumber: string }
  >();
  for (const row of invoiceRows) {
    invoicePeriodMap.set(String(row.id), {
      month: Number(row.month),
      year: Number(row.year),
      invoiceNumber: String(row.invoice_number ?? ""),
    });
  }

  const { rows: expenseRows } = await query<DbCompanyExpense>(
    `select id, company_id, year, month, label,
            amount_inr_cents::float8 as amount_inr_cents,
            created_at::text as created_at, updated_at::text as updated_at
     from company_expenses
     where company_id = $1`,
    [input.companyId],
  );

  const fiscalYearKey = (year: number, month: number) =>
    month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  const expenseByKey = new Map<string, number>();
  for (const row of expenseRows) {
    const key =
      input.periodType === "monthly"
        ? `${row.year}-${String(row.month).padStart(2, "0")}`
        : fiscalYearKey(row.year, row.month);
    expenseByKey.set(key, (expenseByKey.get(key) ?? 0) + Number(row.amount_inr_cents));
  }

  const invoicePeriodIds = [...invoicePeriodMap.keys()];
  const { rows: adjustmentRows } = await query<{
    invoice_id: string;
    type: AdjustmentType;
    employee_name: string | null;
    amount_usd_cents: number;
  }>(
    `select invoice_id, type, employee_name, amount_usd_cents
     from invoice_adjustments
     where invoice_id = any($1::text[])`,
    [invoicePeriodIds.length > 0 ? invoicePeriodIds : ["__none__"]],
  );

  const companyLevelReimbursementUsdByKey = new Map<string, number>();
  for (const row of adjustmentRows) {
    if (row.type !== "reimbursement") continue;
    if (row.employee_name) continue;
    const period = invoicePeriodMap.get(String(row.invoice_id));
    if (!period) continue;
    const key =
      input.periodType === "monthly"
        ? `${period.year}-${String(period.month).padStart(2, "0")}`
        : fiscalYearKey(period.year, period.month);
    companyLevelReimbursementUsdByKey.set(
      key,
      (companyLevelReimbursementUsdByKey.get(key) ?? 0) + Number(row.amount_usd_cents),
    );
  }

  const sourceRows: PnSourceRow[] = [
    ...(entries
      .map((row) => {
        const [yearPart, monthPart] = String(row.payment_month ?? "").split("-");
        const year = Number.parseInt(yearPart ?? "", 10);
        const month = Number.parseInt(monthPart ?? "", 10);
        if (!Number.isFinite(year) || !Number.isFinite(month)) return undefined;
        const effectiveDollarInwardUsdCents = calculateEffectiveDollarInwardUsdCents({
          baseDollarInwardUsdCents: row.base_dollar_inward_usd_cents,
          onboardingAdvanceUsdCents: row.onboarding_advance_usd_cents,
          reimbursementUsdCents: row.reimbursement_usd_cents,
          appraisalAdvanceUsdCents: row.appraisal_advance_usd_cents,
          offboardingDeductionUsdCents: row.offboarding_deduction_usd_cents,
        });
        const cashInInrCents = calculateCashInInrCents({
          effectiveDollarInwardUsdCents,
          cashoutUsdInrRate: row.cashout_usd_inr_rate,
        });
        const monthlyPaidInrCents =
          row.monthly_paid_inr_cents && row.monthly_paid_inr_cents > 0
            ? row.monthly_paid_inr_cents
            : row.actual_paid_inr_cents;
        const salaryPaidInrCents =
          row.salary_paid_inr_cents && row.salary_paid_inr_cents > 0
            ? row.salary_paid_inr_cents
            : Math.max(0, row.actual_paid_inr_cents - row.pf_inr_cents - row.tds_inr_cents);
        const paidUsdInrRate = resolveEffectivePaidUsdInrRate({
          paidUsdInrRate: row.paid_usd_inr_rate,
          dollarInwardUsdCents: effectiveDollarInwardUsdCents,
          actualPaidInrCents: row.actual_paid_inr_cents,
        });
        const payoutMetrics = calculateEmployeePayoutMetrics({
          dollarInwardUsdCents: effectiveDollarInwardUsdCents,
          actualPaidInrCents: row.actual_paid_inr_cents,
          receivedUsdInrRate: row.cashout_usd_inr_rate,
          pegUsdInrRate: paidUsdInrRate,
        });

        return {
          employeeId: row.employee_id,
          employeeName: row.employee_name_snapshot,
          year,
          month,
          daysWorked: row.days_worked,
          daysInMonth: row.days_in_month,
          dollarInwardUsdCents: row.base_dollar_inward_usd_cents,
          onboardingAdvanceUsdCents: row.onboarding_advance_usd_cents,
          advanceOverrideInrCents: row.advance_override_inr_cents,
          reimbursementUsdCents: row.reimbursement_usd_cents,
          reimbursementLabelsText: row.reimbursement_labels_text ?? "",
          appraisalAdvanceUsdCents: row.appraisal_advance_usd_cents,
          offboardingDeductionUsdCents: Math.abs(row.offboarding_deduction_usd_cents),
          effectiveDollarInwardUsdCents,
          cashoutUsdInrRate: row.cashout_usd_inr_rate,
          paidUsdInrRate,
          monthlyPaidInrCents,
          pfInrCents: row.pf_inr_cents,
          tdsInrCents: row.tds_inr_cents,
          actualPaidInrCents: row.actual_paid_inr_cents,
          fxCommissionInrCents: payoutMetrics.fxCommissionInrCents,
          totalCommissionUsdCents: payoutMetrics.totalCommissionUsdCents,
          commissionEarnedInrCents: payoutMetrics.commissionEarnedInrCents,
          cashInInrCents,
          salaryPaidInrCents,
          netProfitInrCents: calculatePnEmployeeNetPlInrCents({
            cashInInrCents,
            onboardingAdvanceUsdCents: row.onboarding_advance_usd_cents,
            advanceOverrideInrCents: row.advance_override_inr_cents,
            cashoutUsdInrRate: row.cashout_usd_inr_rate,
            salaryPaidInrCents,
            pfInrCents: row.pf_inr_cents,
            tdsInrCents: row.tds_inr_cents,
          }),
        };
      })
      .filter(Boolean) as PnSourceRow[]),
    ...salaryOnlyRows,
  ];

  if (sourceRows.length === 0) {
    return {
      companyId: input.companyId,
      employeeEditableSections: [],
      employeeSections: [],
      periodRows: [],
    };
  }

  const editableSourceRows: PnEditableSourceRow[] = [
    ...(entries
      .map((row) => {
        const period = invoicePeriodMap.get(row.invoice_id);
        const [yearPart, monthPart] = String(row.payment_month ?? "").split("-");
        const year = Number.parseInt(yearPart ?? "", 10);
        const month = Number.parseInt(monthPart ?? "", 10);
        if (!period || !Number.isFinite(year) || !Number.isFinite(month)) {
          return undefined;
        }
        const effectiveDollarInwardUsdCents = calculateEffectiveDollarInwardUsdCents({
          baseDollarInwardUsdCents: row.base_dollar_inward_usd_cents,
          onboardingAdvanceUsdCents: row.onboarding_advance_usd_cents,
          reimbursementUsdCents: row.reimbursement_usd_cents,
          appraisalAdvanceUsdCents: row.appraisal_advance_usd_cents,
          offboardingDeductionUsdCents: row.offboarding_deduction_usd_cents,
        });
        const cashInInrCents = calculateCashInInrCents({
          effectiveDollarInwardUsdCents,
          cashoutUsdInrRate: row.cashout_usd_inr_rate,
        });
        const monthlyPaidInrCents =
          row.monthly_paid_inr_cents && row.monthly_paid_inr_cents > 0
            ? row.monthly_paid_inr_cents
            : row.actual_paid_inr_cents;
        const salaryPaidInrCents =
          row.salary_paid_inr_cents && row.salary_paid_inr_cents > 0
            ? row.salary_paid_inr_cents
            : Math.max(0, row.actual_paid_inr_cents - row.pf_inr_cents - row.tds_inr_cents);
        const paidUsdInrRate = resolveEffectivePaidUsdInrRate({
          paidUsdInrRate: row.paid_usd_inr_rate,
          dollarInwardUsdCents: effectiveDollarInwardUsdCents,
          actualPaidInrCents: row.actual_paid_inr_cents,
        });
        const payoutMetrics = calculateEmployeePayoutMetrics({
          dollarInwardUsdCents: effectiveDollarInwardUsdCents,
          actualPaidInrCents: row.actual_paid_inr_cents,
          receivedUsdInrRate: row.cashout_usd_inr_rate,
          pegUsdInrRate: paidUsdInrRate,
        });
        const grossEarningsInrCents =
          payoutMetrics.fxCommissionInrCents + payoutMetrics.commissionEarnedInrCents;

        return {
          rowId: row.id,
          invoiceId: row.invoice_id,
          invoiceNumber: period.invoiceNumber,
          employeeId: row.employee_id,
          employeeName: row.employee_name_snapshot,
          year,
          month,
          daysWorked: row.days_worked,
          daysInMonth: row.days_in_month,
          dollarInwardUsdCents: row.base_dollar_inward_usd_cents,
          baseDollarInwardUsdCents: row.base_dollar_inward_usd_cents,
          onboardingAdvanceUsdCents: row.onboarding_advance_usd_cents,
          advanceOverrideInrCents: row.advance_override_inr_cents,
          reimbursementUsdCents: row.reimbursement_usd_cents,
          reimbursementLabelsText: row.reimbursement_labels_text ?? "",
          appraisalAdvanceUsdCents: row.appraisal_advance_usd_cents,
          offboardingDeductionUsdCents: Math.abs(row.offboarding_deduction_usd_cents),
          effectiveDollarInwardUsdCents,
          cashInInrCents,
          cashoutUsdInrRate: row.cashout_usd_inr_rate,
          paidUsdInrRate,
          monthlyPaidInrCents,
          salaryPaidInrCents,
          pfInrCents: row.pf_inr_cents,
          tdsInrCents: row.tds_inr_cents,
          actualPaidInrCents: row.actual_paid_inr_cents,
          fxCommissionInrCents: payoutMetrics.fxCommissionInrCents,
          totalCommissionUsdCents: payoutMetrics.totalCommissionUsdCents,
          commissionEarnedInrCents: payoutMetrics.commissionEarnedInrCents,
          grossEarningsInrCents,
          netProfitInrCents: calculatePnEmployeeNetPlInrCents({
            cashInInrCents,
            onboardingAdvanceUsdCents: row.onboarding_advance_usd_cents,
            advanceOverrideInrCents: row.advance_override_inr_cents,
            cashoutUsdInrRate: row.cashout_usd_inr_rate,
            salaryPaidInrCents,
            pfInrCents: row.pf_inr_cents,
            tdsInrCents: row.tds_inr_cents,
          }),
          isSecurityDepositMonth: false,
        };
      })
      .filter(Boolean) as PnEditableSourceRow[]),
    ...salaryOnlyRows,
  ];

  return {
    companyId: input.companyId,
    employeeEditableSections: buildPnEmployeeEditableSections(editableSourceRows),
    employeeSections: buildPnEmployeeSections(sourceRows),
    periodRows: buildPnPeriodRows({
      rows: sourceRows,
      periodType: input.periodType,
      expenseByKey,
      companyLevelReimbursementUsdByKey,
    }),
  };
}

function toFounderBalanceSourceRows(input: {
  companyId: string;
  data: PnDashboardData;
}): FounderBalanceSourceRow[] {
  return input.data.periodRows
    .filter((row) => row.month !== undefined)
    .map((row) => ({
      companyId: input.companyId,
      year: row.year,
      month: row.month ?? 1,
      netPlInrCents: calculatePnPeriodNetPlInrCents(row),
    }));
}

export async function getCompanyPnSummaries(): Promise<CompanyPnSummary[]> {
  const companies = await listCompanies();
  return Promise.all(
    companies.map(async (company) => {
      const data = await getPnDashboardData({
        companyId: company.id,
        periodType: "monthly",
      });

      return {
        companyId: company.id,
        companyName: company.name,
        netPlInrCents: sumPnPeriodNetPlInrCents(data.periodRows),
      };
    }),
  );
}

function isFounderKey(value: string): value is FounderWithdrawal["founderKey"] {
  return FOUNDER_BALANCE_FOUNDERS.some((founder) => founder.key === value);
}

function mapFounderWithdrawal(row: DbFounderWithdrawal): FounderWithdrawal | undefined {
  const founderKey = String(row.founder_key);
  if (!isFounderKey(founderKey)) return undefined;
  return {
    companyId: row.company_id ? String(row.company_id) : null,
    year: Number(row.year),
    month: Number(row.month),
    founderKey,
    withdrawalInrCents: Number(row.withdrawal_inr_cents),
    updatedAt: String(row.updated_at),
  };
}

function isMissingFounderWithdrawalsTableError(error: unknown) {
  const code = errorField(error, "code");
  const message = errorField(error, "message") ?? "";
  return code === "42P01" && message.includes("founder_withdrawals");
}

async function listFounderWithdrawals(companyId: string | null) {
  const condition = companyId ? "company_id = $1" : "company_id is null";
  const params = companyId ? [companyId] : [];

  try {
    const { rows } = await query<DbFounderWithdrawal>(
      `select id, company_id, year, month, founder_key, founder_name_snapshot,
              withdrawal_inr_cents::float8 as withdrawal_inr_cents,
              created_at::text as created_at, updated_at::text as updated_at
       from founder_withdrawals
       where ${condition}
       order by year, month`,
      params,
    );
    return rows.map(mapFounderWithdrawal).filter(Boolean) as FounderWithdrawal[];
  } catch (error) {
    if (isMissingFounderWithdrawalsTableError(error)) return [];
    throw error;
  }
}

export async function getFounderBalanceData(input: {
  companyId: string | null;
  period?: FounderBalancePeriodFilter;
}): Promise<FounderBalanceModel> {
  const companies = await listCompanies();
  const selectedCompanies = input.companyId
    ? companies.filter((company) => company.id === input.companyId)
    : companies;

  const dashboardData = await Promise.all(
    selectedCompanies.map(async (company) => ({
      companyId: company.id,
      data: await getPnDashboardData({
        companyId: company.id,
        periodType: "monthly",
      }),
    })),
  );

  const sourceRows = dashboardData.flatMap(toFounderBalanceSourceRows);
  const withdrawals = await listFounderWithdrawals(input.companyId);

  return buildFounderBalanceModel({
    companyId: input.companyId,
    period: input.period,
    sourceRows,
    withdrawals,
  });
}

export async function upsertFounderWithdrawals(input: {
  companyId: string | null;
  rows: ParsedFounderWithdrawalRow[];
}) {
  const timestamp = nowIso();

  for (const row of input.rows) {
    for (const founder of FOUNDER_BALANCE_FOUNDERS) {
      const withdrawalInrCents = row.withdrawals[founder.key];
      const companyCondition = input.companyId ? "company_id = $4" : "company_id is null";
      const existingParams: unknown[] = [row.year, row.month, founder.key];
      if (input.companyId) {
        existingParams.push(input.companyId);
      }

      let existing: { id: string } | null;
      try {
        existing = await findOne<{ id: string }>(
          `select id from founder_withdrawals
           where year = $1 and month = $2 and founder_key = $3 and ${companyCondition}`,
          existingParams,
        );
      } catch (error) {
        if (isMissingFounderWithdrawalsTableError(error)) {
          throw new Error("Run the founder_withdrawals migration before saving.");
        }
        throw error;
      }

      if (existing?.id) {
        await query(
          `update founder_withdrawals
           set founder_name_snapshot = $2, withdrawal_inr_cents = $3, updated_at = $4
           where id = $1`,
          [String(existing.id), founder.name, withdrawalInrCents, timestamp],
        );
      } else {
        await query(
          `insert into founder_withdrawals
             (id, company_id, year, month, founder_key, founder_name_snapshot, withdrawal_inr_cents, created_at, updated_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
          [
            nextId("founder_withdrawal"),
            input.companyId,
            row.year,
            row.month,
            founder.key,
            founder.name,
            withdrawalInrCents,
            timestamp,
          ],
        );
      }
    }
  }
}

export async function getInvoiceDetail(
  invoiceId: string,
): Promise<InvoiceDetail | undefined> {
  const invoiceRow = await findOne<DbInvoice>(
    `select ${INVOICE_SELECT_COLUMNS} from invoices where id = $1`,
    [invoiceId],
  );
  if (!invoiceRow) return undefined;

  const invoice = mapInvoice(invoiceRow);
  const [companyRow, teamRowsResult, adjustmentRowsResult, realizationRow] = await Promise.all([
    requireOne<DbCompany>(
      `select id, name, billing_address, default_note, created_at::text as created_at
       from companies where id = $1`,
      [invoice.companyId],
      "Company not found.",
    ),
    query<DbInvoiceTeam>(
      `select id, invoice_id, team_name, sort_order, manual_total_usd_cents
       from invoice_teams where invoice_id = $1 order by sort_order`,
      [invoice.id],
    ),
    query<DbInvoiceAdjustment>(
      `select id, invoice_id, type, label, employee_name, rate_usd_cents,
              hrs_per_week::float8 as hrs_per_week, days_worked, amount_usd_cents, sort_order
       from invoice_adjustments where invoice_id = $1 order by sort_order`,
      [invoice.id],
    ),
    findOne<DbInvoiceRealization>(
      `select id, invoice_id, realized_at::text as realized_at, dollar_inbound_usd_cents,
              usd_inr_rate::float8 as usd_inr_rate, notes, created_at::text as created_at
       from invoice_realizations where invoice_id = $1`,
      [invoice.id],
    ),
  ]);

  const mappedTeams = teamRowsResult.rows.map(mapInvoiceTeam);
  const teamIds = mappedTeams.map((team) => team.id);
  const lineRows = teamIds.length
    ? (
        await query<DbInvoiceLineItem>(
          `select id, invoice_team_id, employee_id, employee_name_snapshot, designation_snapshot,
                  team_name_snapshot, billing_rate_usd_cents, hrs_per_week::float8 as hrs_per_week,
                  days_worked, billed_total_usd_cents, manual_total_usd_cents
           from invoice_line_items
           where invoice_team_id = any($1::text[])`,
          [teamIds],
        )
      ).rows
    : [];

  const mappedLineItems = lineRows
    .map(mapInvoiceLineItem)
    .map((lineItem) => normalizeLineItemDaysWorked(lineItem, invoice.month, invoice.year));

  return {
    invoice,
    company: mapCompany(companyRow),
    teams: mappedTeams.map((team) => {
      const teamLineItems = sortInvoiceLineItemsByRate(
        mappedLineItems.filter((lineItem) => lineItem.invoiceTeamId === team.id),
      );
      const lineItemTotals = teamLineItems.map((lineItem) =>
        resolveEffectiveLineItemTotalUsdCents({
          formulaTotalUsdCents: lineItem.billedTotalUsdCents,
          manualTotalUsdCents: lineItem.manualTotalUsdCents,
        }),
      );

      return {
        ...team,
        totalUsdCents: resolveEffectiveTeamTotalUsdCents({
          lineItemTotalsUsdCents: lineItemTotals,
          manualTotalUsdCents: team.manualTotalUsdCents,
        }),
        lineItems: teamLineItems,
      };
    }),
    adjustments: adjustmentRowsResult.rows.map(mapInvoiceAdjustment),
    realization: realizationRow ? mapInvoiceRealization(realizationRow) : undefined,
  };
}

// ───────────── Company Expenses CRUD ─────────────

function mapCompanyExpense(row: DbCompanyExpense): CompanyExpense {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    year: Number(row.year),
    month: Number(row.month),
    label: String(row.label ?? ""),
    amountInrCents: Number(row.amount_inr_cents),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

type CompanyExpenseListInput = {
  companyId: string;
  year?: number;
  month?: number;
  startMonth?: string;
  endMonth?: string;
};

function expensePeriodFromInput(input: {
  startMonth?: string;
  endMonth?: string;
}): ExpensePeriodRange | undefined {
  return input.startMonth && input.endMonth
    ? { startMonth: input.startMonth, endMonth: input.endMonth }
    : undefined;
}

function filterCompanyExpensesForInput(
  expenses: CompanyExpense[],
  input: CompanyExpenseListInput,
) {
  const period = expensePeriodFromInput(input);
  if (!period) {
    return expenses;
  }

  return expenses.filter((expense) => isExpenseInPeriod(expense, period));
}

const COMPANY_EXPENSE_SELECT_COLUMNS = `
  id, company_id, year, month, label,
  amount_inr_cents::float8 as amount_inr_cents,
  created_at::text as created_at, updated_at::text as updated_at
`;

export async function listCompanyExpenses(
  input: CompanyExpenseListInput,
): Promise<CompanyExpense[]> {
  const conditions = ["company_id = $1"];
  const params: unknown[] = [input.companyId];

  const period = expensePeriodFromInput(input);
  if (!period && input.year !== undefined) {
    params.push(input.year);
    conditions.push(`year = $${params.length}`);
  }
  if (!period && input.month !== undefined) {
    params.push(input.month);
    conditions.push(`month = $${params.length}`);
  }

  const { rows } = await query<DbCompanyExpense>(
    `select ${COMPANY_EXPENSE_SELECT_COLUMNS}
     from company_expenses
     where ${conditions.join(" and ")}
     order by year desc, month desc, created_at asc`,
    params,
  );

  return filterCompanyExpensesForInput(rows.map(mapCompanyExpense), input);
}

export async function listCompanyExpensesForCompanies(input: {
  companyIds: string[];
  year?: number;
  month?: number;
  startMonth?: string;
  endMonth?: string;
}): Promise<CompanyExpense[]> {
  const uniqueCompanyIds = uniqueNonEmptyValues(input.companyIds);
  if (uniqueCompanyIds.length === 0) {
    return [];
  }

  const conditions = ["company_id = any($1::text[])"];
  const params: unknown[] = [uniqueCompanyIds];

  const period = expensePeriodFromInput(input);
  if (!period && input.year !== undefined) {
    params.push(input.year);
    conditions.push(`year = $${params.length}`);
  }
  if (!period && input.month !== undefined) {
    params.push(input.month);
    conditions.push(`month = $${params.length}`);
  }

  const { rows } = await query<DbCompanyExpense>(
    `select ${COMPANY_EXPENSE_SELECT_COLUMNS}
     from company_expenses
     where ${conditions.join(" and ")}
     order by year desc, month desc, created_at asc`,
    params,
  );

  return filterCompanyExpensesForInput(rows.map(mapCompanyExpense), {
    companyId: "",
    ...input,
  });
}

export async function upsertCompanyExpense(input: {
  id?: string;
  companyId: string;
  year: number;
  month: number;
  label: string;
  amountInrCents: number;
}) {
  if (input.id) {
    await query(
      `update company_expenses set label = $2, amount_inr_cents = $3, updated_at = $4
       where id = $1`,
      [input.id, input.label, input.amountInrCents, nowIso()],
    );
    return input.id;
  }

  const newId = nextId("company_expense");
  await query(
    `insert into company_expenses
       (id, company_id, year, month, label, amount_inr_cents, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $7)`,
    [newId, input.companyId, input.year, input.month, input.label, input.amountInrCents, nowIso()],
  );
  return newId;
}

export async function deleteCompanyExpense(id: string) {
  await query(`delete from company_expenses where id = $1`, [id]);
}
