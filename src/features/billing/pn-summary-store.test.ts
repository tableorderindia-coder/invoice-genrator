import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state: {
    selectResults: Array<{ rows: unknown[]; rowCount: number | null }>;
    queries: Array<{ sql: string; params: unknown[] }>;
    queryError: unknown;
    txQueries: Array<{ sql: string; params: unknown[] }>;
  } = {
    selectResults: [],
    queries: [],
    queryError: null,
    txQueries: [],
  };

  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    state.queries.push({ sql, params });
    if (state.queryError) {
      throw state.queryError;
    }
    const normalized = sql.trim().toLowerCase();
    if (normalized.startsWith("select")) {
      const next = state.selectResults.shift();
      return next ?? { rows: [], rowCount: 0 };
    }
    return { rows: [], rowCount: 0 };
  });

  const client = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      state.txQueries.push({ sql, params });
      if (state.queryError) {
        throw state.queryError;
      }
      return { rows: [], rowCount: 0 };
    }),
  };

  const withTransaction = vi.fn(async (fn: (txClient: typeof client) => Promise<unknown>) => {
    return fn(client);
  });

  return { state, query, withTransaction, client };
});

vi.mock("@/lib/db/pool", () => ({
  query: mocks.query,
  withTransaction: mocks.withTransaction,
}));

import {
  buildPnDashboardDataFromSummaryRows,
  getCompanyExpenseCompanyId,
  getEmployeeCashFlowEntryCompanyId,
  getInvoiceCompanyId,
  getPnDashboardSummaryData,
} from "./pn-summary-store";
import type { PnCompanyMonthSummaryRow, PnEmployeeMonthSummaryRow } from "./pn-summary-store";

const projectRoot = process.cwd();

function readSource(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

function employeeSummary(
  overrides: Partial<PnEmployeeMonthSummaryRow> = {},
): PnEmployeeMonthSummaryRow {
  return {
    companyId: "company_a",
    employeeId: "employee_a",
    employeeName: "Ankit Singh",
    paymentMonth: "2026-07",
    year: 2026,
    month: 7,
    payoutId: "entry_a",
    invoiceId: "invoice_a",
    invoiceNumber: "INV-001",
    daysWorked: 31,
    daysInMonth: 31,
    dollarInwardUsdCents: 100_00,
    baseDollarInwardUsdCents: 100_00,
    onboardingAdvanceUsdCents: 10_00,
    reimbursementUsdCents: 20_00,
    reimbursementLabelsText: "Travel",
    reimbursementInrCents: 1_700_00,
    appraisalAdvanceUsdCents: 5_00,
    appraisalAdvanceInrCents: 425_00,
    offboardingDeductionUsdCents: 2_00,
    effectiveDollarInwardUsdCents: 133_00,
    cashInInrCents: 8_500_00,
    cashoutUsdInrRate: 85,
    paidUsdInrRate: 84,
    monthlyPaidInrCents: 80_000_00,
    salaryPaidInrCents: 70_000_00,
    pfInrCents: 5_000_00,
    tdsInrCents: 5_000_00,
    actualPaidInrCents: 80_000_00,
    fxCommissionInrCents: 1_000_00,
    totalCommissionUsdCents: 3_00,
    commissionEarnedInrCents: 252_00,
    grossEarningsInrCents: 1_252_00,
    netProfitInrCents: 71_252_00,
    isSecurityDepositMonth: false,
    rebuiltAt: "2026-07-22T10:00:00.000Z",
    sourceUpdatedAt: "2026-07-22T09:59:00.000Z",
    ...overrides,
  };
}

function companySummary(
  overrides: Partial<PnCompanyMonthSummaryRow> = {},
): PnCompanyMonthSummaryRow {
  return {
    companyId: "company_a",
    paymentMonth: "2026-07",
    year: 2026,
    month: 7,
    dollarInwardUsdCents: 100_00,
    onboardingAdvanceUsdCents: 10_00,
    reimbursementUsdCents: 30_00,
    reimbursementLabelsText: "Travel",
    reimbursementInrCents: 2_550_00,
    appraisalAdvanceUsdCents: 5_00,
    appraisalAdvanceInrCents: 425_00,
    offboardingDeductionUsdCents: 2_00,
    effectiveDollarInwardUsdCents: 133_00,
    cashoutUsdInrRate: 85,
    cashInInrCents: 8_500_00,
    paidUsdInrRate: 84,
    monthlyPaidInrCents: 80_000_00,
    pfInrCents: 5_000_00,
    tdsInrCents: 5_000_00,
    actualPaidInrCents: 80_000_00,
    salaryPaidInrCents: 70_000_00,
    fxCommissionInrCents: 1_000_00,
    totalCommissionUsdCents: 3_00,
    commissionEarnedInrCents: 252_00,
    grossEarningsInrCents: 1_252_00,
    expensesInrCents: 500_00,
    companyReimbursementUsdCents: 10_00,
    companyReimbursementInrCents: 850_00,
    netPlInrCents: 71_252_00,
    rebuiltAt: "2026-07-22T10:00:00.000Z",
    sourceUpdatedAt: "2026-07-22T09:59:00.000Z",
    ...overrides,
  };
}

function dbEmployeeRow(overrides: Record<string, unknown> = {}) {
  return {
    company_id: "company_a",
    employee_id: "employee_a",
    employee_name_snapshot: "Ankit Singh",
    payment_month: "2026-07",
    year: 2026,
    month: 7,
    payout_id: "entry_a",
    invoice_id: "invoice_a",
    invoice_number: "INV-001",
    days_worked: 31,
    days_in_month: 31,
    dollar_inward_usd_cents: 100_00,
    base_dollar_inward_usd_cents: 100_00,
    onboarding_advance_usd_cents: 10_00,
    advance_override_inr_cents: null,
    reimbursement_usd_cents: 20_00,
    reimbursement_labels_text: "Travel",
    reimbursement_inr_cents: 1_700_00,
    appraisal_advance_usd_cents: 5_00,
    appraisal_advance_inr_cents: 425_00,
    offboarding_deduction_usd_cents: 2_00,
    effective_dollar_inward_usd_cents: 133_00,
    cash_in_inr_cents: 8_500_00,
    cashout_usd_inr_rate: 85,
    paid_usd_inr_rate: 84,
    monthly_paid_inr_cents: 80_000_00,
    salary_paid_inr_cents: 70_000_00,
    pf_inr_cents: 5_000_00,
    tds_inr_cents: 5_000_00,
    actual_paid_inr_cents: 80_000_00,
    fx_commission_inr_cents: 1_000_00,
    total_commission_usd_cents: 3_00,
    commission_earned_inr_cents: 252_00,
    gross_earnings_inr_cents: 1_252_00,
    net_profit_inr_cents: 71_252_00,
    is_security_deposit_month: false,
    source_updated_at: "2026-07-22T09:59:00.000Z",
    rebuilt_at: "2026-07-22T10:00:00.000Z",
    ...overrides,
  };
}

function dbCompanyRow(overrides: Record<string, unknown> = {}) {
  return {
    company_id: "company_a",
    payment_month: "2026-07",
    year: 2026,
    month: 7,
    dollar_inward_usd_cents: 100_00,
    onboarding_advance_usd_cents: 10_00,
    reimbursement_usd_cents: 30_00,
    reimbursement_labels_text: "Travel",
    reimbursement_inr_cents: 2_550_00,
    appraisal_advance_usd_cents: 5_00,
    appraisal_advance_inr_cents: 425_00,
    offboarding_deduction_usd_cents: 2_00,
    effective_dollar_inward_usd_cents: 133_00,
    cashout_usd_inr_rate: 85,
    cash_in_inr_cents: 8_500_00,
    paid_usd_inr_rate: 84,
    monthly_paid_inr_cents: 80_000_00,
    pf_inr_cents: 5_000_00,
    tds_inr_cents: 5_000_00,
    actual_paid_inr_cents: 80_000_00,
    salary_paid_inr_cents: 70_000_00,
    fx_commission_inr_cents: 1_000_00,
    total_commission_usd_cents: 3_00,
    commission_earned_inr_cents: 252_00,
    gross_earnings_inr_cents: 1_252_00,
    expenses_inr_cents: 500_00,
    company_reimbursement_usd_cents: 10_00,
    company_reimbursement_inr_cents: 850_00,
    net_pl_inr_cents: 71_252_00,
    source_updated_at: "2026-07-22T09:59:00.000Z",
    rebuilt_at: "2026-07-22T10:00:00.000Z",
    ...overrides,
  };
}

describe("P&L summary store", () => {
  beforeEach(() => {
    mocks.state.selectResults = [];
    mocks.state.queries = [];
    mocks.state.queryError = null;
    mocks.state.txQueries = [];
    mocks.query.mockClear();
    mocks.withTransaction.mockClear();
    mocks.client.query.mockClear();
  });

  it("rebuilds dashboard data from persisted monthly summary rows", () => {
    const data = buildPnDashboardDataFromSummaryRows({
      companyId: "company_a",
      periodType: "monthly",
      employeeRows: [employeeSummary()],
      companyRows: [companySummary()],
    });

    expect(data.employeeEditableSections).toHaveLength(1);
    expect(data.employeeEditableSections[0]?.rows[0]).toMatchObject({
      payoutId: "entry_a",
      invoiceNumber: "INV-001",
      monthlyPaidInrCents: 80_000_00,
      actualPaidInrCents: 80_000_00,
      salaryPaidInrCents: 70_000_00,
      netProfitInrCents: 71_252_00,
    });
    expect(data.employeeSections[0]?.rows[0]).toMatchObject({
      reimbursementInrCents: 1_700_00,
      appraisalAdvanceInrCents: 425_00,
      grossEarningsInrCents: 1_252_00,
    });
    expect(data.periodRows[0]).toMatchObject({
      month: 7,
      advancesInrCents: 850_00,
      expensesInrCents: 500_00,
      companyReimbursementUsdCents: 10_00,
      netPlInrCents: 71_252_00,
    });
  });

  it("rolls monthly company summaries into fiscal-year dashboard rows", () => {
    const data = buildPnDashboardDataFromSummaryRows({
      companyId: "company_a",
      periodType: "yearly",
      employeeRows: [
        employeeSummary(),
        employeeSummary({ paymentMonth: "2026-08", month: 8, monthlyPaidInrCents: 90_000_00 }),
      ],
      companyRows: [
        companySummary(),
        companySummary({
          paymentMonth: "2026-08",
          month: 8,
          dollarInwardUsdCents: 200_00,
          monthlyPaidInrCents: 90_000_00,
          expensesInrCents: 700_00,
          netPlInrCents: 75_000_00,
        }),
      ],
    });

    expect(data.periodRows).toHaveLength(1);
    expect(data.periodRows[0]).toMatchObject({
      fiscalLabel: "Apr 2026-Mar 2027",
      dollarInwardUsdCents: 300_00,
      advancesInrCents: 1_700_00,
      monthlyPaidInrCents: 170_000_00,
      expensesInrCents: 1_200_00,
      netPlInrCents: 146_252_00,
    });
  });

  it("converts employee advances before company-month aggregation", () => {
    const data = buildPnDashboardDataFromSummaryRows({
      companyId: "company_a",
      periodType: "monthly",
      employeeRows: [
        employeeSummary({
          employeeId: "employee_a",
          onboardingAdvanceUsdCents: 100_00,
          cashoutUsdInrRate: 80,
        }),
        employeeSummary({
          employeeId: "employee_b",
          onboardingAdvanceUsdCents: 200_00,
          cashoutUsdInrRate: 90,
        }),
      ],
      companyRows: [companySummary({ onboardingAdvanceUsdCents: 300_00 })],
    });

    expect(data.periodRows[0]?.advancesInrCents).toBe(26_000_00);
  });

  it("uses persisted employee Advance INR overrides in period aggregation", () => {
    const data = buildPnDashboardDataFromSummaryRows({
      companyId: "company_a",
      periodType: "monthly",
      employeeRows: [
        employeeSummary({
          employeeId: "employee_a",
          onboardingAdvanceUsdCents: 100_00,
          cashoutUsdInrRate: 80,
          advanceOverrideInrCents: 2_500_00,
        }),
        employeeSummary({
          employeeId: "employee_b",
          onboardingAdvanceUsdCents: 200_00,
          cashoutUsdInrRate: 90,
          advanceOverrideInrCents: null,
        }),
      ],
      companyRows: [companySummary({ onboardingAdvanceUsdCents: 300_00 })],
    });

    expect(data.employeeEditableSections[0]?.rows[0]?.advanceOverrideInrCents).toBe(
      2_500_00,
    );
    expect(data.periodRows[0]?.advancesInrCents).toBe(20_500_00);
  });

  it("persists the override in entry and employee summary storage", () => {
    const cashFlowStore = readSource("src/features/billing/employee-cash-flow-store.ts");
    const summaryStore = readSource("src/features/billing/pn-summary-store.ts");
    const migration = readSource(
      "supabase/migrations/20260803120000_employee_advance_inr_override.sql",
    );

    expect(cashFlowStore).toContain("advance_override_inr_cents");
    expect(summaryStore).toContain("advance_override_inr_cents");
    expect(migration).toContain("invoice_payment_employee_entries");
    expect(migration).toContain("pn_employee_month_summaries");
  });

  it("keeps persisted P&L summaries canonical and repairs stale derived fields", () => {
    const dashboardSource = readSource("src/features/billing/store.ts");
    const migration = readSource(
      "supabase/migrations/20260803170000_canonical_pn_summary_net_pl.sql",
    );

    expect(dashboardSource).toContain("calculatePnEmployeeNetPlInrCents");
    expect(migration).toContain("fx_commission_inr_cents");
    expect(migration).toContain("commission_earned_inr_cents");
    expect(migration).toContain("gross_earnings_inr_cents");
    expect(migration).toContain("advance_override_inr_cents");
    expect(migration).toContain("company_reimbursement_inr_cents");
    expect(migration).toContain("paid_usd_inr_rate");
    expect(migration).toContain("effective_dollar_inward_usd_cents");
    expect(migration).toContain("comment on column public.pn_company_month_summaries.net_pl_inr_cents");
  });

  it("uses cached, persisted summaries from Overview and Dashboard pages", () => {
    const overviewSource = readSource("app/page.tsx");
    const dashboardSource = readSource("app/dashboard/page.tsx");

    // getCachedPnDashboardSummaryData wraps getPnDashboardSummaryData (the
    // fast, persisted pn_*_month_summaries reader) in unstable_cache - see
    // cached-store.ts. The pages must not fall back to the slow raw
    // aggregation path (getPnDashboardData / getCachedPnDashboardData,
    // without "Summary"), which recomputes from
    // invoice_payment_employee_entries on every call.
    expect(overviewSource).toContain("getCachedPnDashboardSummaryData");
    expect(dashboardSource).toContain("getCachedPnDashboardSummaryData");
    expect(overviewSource).not.toContain("getCachedPnDashboardData(");
    expect(dashboardSource).not.toContain("getCachedPnDashboardData(");
  });

  it("refreshes summaries synchronously from financial write actions", () => {
    const actionsSource = readSource("src/features/billing/actions.ts");

    expect(actionsSource).toContain("rebuildPnSummariesForCompany");
    expect(actionsSource).toContain("rebuildPnSummariesForInvoice");
    expect(actionsSource).toMatch(/saveCompanyExpenseAction[\s\S]+refreshPnSummariesForCompany/);
    expect(actionsSource).toMatch(/saveInvoicePaymentEmployeeEntriesAction[\s\S]+refreshPnSummariesForCompany/);
    expect(actionsSource).toMatch(/saveMonthlyPayrollRowsAction[\s\S]+refreshPnSummariesForCompany/);
    expect(actionsSource).toMatch(/cashOutInvoiceAction[\s\S]+refreshPnSummariesForInvoice/);
    expect(actionsSource).toMatch(/deleteInvoiceAction[\s\S]+getInvoiceCompanyId[\s\S]+refreshPnSummariesForCompany/);
  });

  it("exposes a protected one-time summary rebuild route", () => {
    const routeSource = readSource("app/api/admin/pn-summaries/rebuild/route.ts");

    expect(routeSource).toContain("requireApiAccess");
    expect(routeSource).toContain('page: "dashboard"');
    expect(routeSource).toContain("edit: true");
    expect(routeSource).toContain("rebuildPnSummariesForCompany");
  });

  it("reads persisted employee and company summary rows scoped to the company", async () => {
    mocks.state.selectResults = [
      { rows: [dbEmployeeRow()], rowCount: 1 },
      { rows: [dbCompanyRow()], rowCount: 1 },
    ];

    const data = await getPnDashboardSummaryData({
      companyId: "company_a",
      periodType: "monthly",
    });

    expect(data.employeeEditableSections[0]?.rows[0]).toMatchObject({
      payoutId: "entry_a",
      monthlyPaidInrCents: 80_000_00,
    });
    expect(data.periodRows[0]).toMatchObject({ month: 7, netPlInrCents: 71_252_00 });

    const employeeQuery = mocks.state.queries.find((entry) =>
      entry.sql.includes("pn_employee_month_summaries"),
    );
    expect(employeeQuery?.params).toEqual(["company_a"]);
    expect(employeeQuery?.sql).toContain("company_id = $1");
    expect(employeeQuery?.sql).not.toContain("employee_id = any");

    const companyQuery = mocks.state.queries.find((entry) =>
      entry.sql.includes("pn_company_month_summaries"),
    );
    expect(companyQuery?.params).toEqual(["company_a"]);
  });

  it("filters persisted rows by employee id and payment month when provided", async () => {
    mocks.state.selectResults = [
      { rows: [dbEmployeeRow()], rowCount: 1 },
      { rows: [dbCompanyRow()], rowCount: 1 },
      { rows: [dbEmployeeRow()], rowCount: 1 },
    ];

    await getPnDashboardSummaryData({
      companyId: "company_a",
      periodType: "monthly",
      employeeIds: ["employee_a"],
      paymentMonths: ["2026-07"],
    });

    const employeeQuery = mocks.state.queries[0];
    expect(employeeQuery?.sql).toContain("employee_id = any($2::text[])");
    expect(employeeQuery?.sql).toContain("payment_month = any($3::text[])");
    expect(employeeQuery?.params).toEqual(["company_a", ["employee_a"], ["2026-07"]]);

    // The unscoped advance-rows lookup (employeeIds present) re-queries without the employee filter.
    const advanceQuery = mocks.state.queries[2];
    expect(advanceQuery?.sql).not.toContain("employee_id = any");
    expect(advanceQuery?.sql).toContain("payment_month = any($2::text[])");
  });

  it("looks up the owning company id for an invoice, expense, and cash-flow entry", async () => {
    mocks.state.selectResults = [
      { rows: [{ company_id: "company_invoice" }], rowCount: 1 },
      { rows: [{ company_id: "company_expense" }], rowCount: 1 },
      { rows: [{ company_id: "company_entry" }], rowCount: 1 },
    ];

    await expect(getInvoiceCompanyId("invoice_1")).resolves.toBe("company_invoice");
    await expect(getCompanyExpenseCompanyId("expense_1")).resolves.toBe("company_expense");
    await expect(getEmployeeCashFlowEntryCompanyId("entry_1")).resolves.toBe("company_entry");

    expect(mocks.state.queries[0]?.sql).toContain("from public.invoices");
    expect(mocks.state.queries[0]?.params).toEqual(["invoice_1"]);
    expect(mocks.state.queries[1]?.sql).toContain("from public.company_expenses");
    expect(mocks.state.queries[2]?.sql).toContain("from public.invoice_payment_employee_entries");
  });

  it("returns undefined when no row is found for the id", async () => {
    mocks.state.selectResults = [{ rows: [], rowCount: 0 }];

    await expect(getInvoiceCompanyId("missing")).resolves.toBeUndefined();
  });
});
