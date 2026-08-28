import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryCall = { sql: string; params: unknown[] };

const mocks = vi.hoisted(() => {
  const state: {
    calls: QueryCall[];
    response: { rows: unknown[] };
    tableResponses: Record<string, { rows: unknown[] }>;
  } = {
    calls: [],
    response: { rows: [] },
    tableResponses: {},
  };

  // Route a query to a configured response by sniffing the first table name
  // referenced after FROM/UPDATE/INSERT INTO - good enough for these tests,
  // which each touch exactly one table per query() call.
  function tableForSql(sql: string): string | undefined {
    const match = sql.match(/\bfrom\s+([a-z_]+)/i);
    return match?.[1];
  }

  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    state.calls.push({ sql, params });
    const table = tableForSql(sql);
    const result = (table ? state.tableResponses[table] : undefined) ?? state.response;
    return { rows: result.rows, rowCount: result.rows.length };
  });

  const withTransaction = vi.fn();

  return { state, query, withTransaction, tableForSql };
});

vi.mock("@/lib/db/pool", () => ({
  query: mocks.query,
  withTransaction: mocks.withTransaction,
}));

import {
  listEmployees,
  listEmployeesForCompanies,
  listAvailablePaymentMonthsForCompanies,
  listAvailableTeamNamesForCompanies,
  listCompanyExpensesForCompanies,
  listInvoicesForCompanies,
} from "./store";

const invoiceRow = (id: string, companyId: string, year: number, month: number) => ({
  id,
  company_id: companyId,
  month,
  year,
  invoice_number: id.toUpperCase(),
  billing_date: "2026-07-01",
  billing_duration: null,
  due_date: "2026-07-31",
  status: "draft",
  note_text: "",
  subtotal_usd_cents: 0,
  adjustments_usd_cents: 0,
  grand_total_usd_cents: 0,
  manual_grand_total_usd_cents: null,
  source_invoice_id: null,
  pdf_path: null,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
});

describe("batched billing store loads", () => {
  beforeEach(() => {
    mocks.state.response = { rows: [] };
    mocks.state.tableResponses = {};
    mocks.state.calls = [];
    mocks.query.mockClear();
  });

  it("loads invoices for selected companies with one company_id in query", async () => {
    mocks.state.response = {
      rows: [
        invoiceRow("invoice_old", "company_a", 2026, 6),
        invoiceRow("invoice_new", "company_b", 2026, 7),
      ],
    };

    const invoices = await listInvoicesForCompanies(["company_a", "company_b", "company_a"]);

    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.state.calls[0]?.sql).toMatch(/from invoices/i);
    expect(mocks.state.calls[0]?.sql).toMatch(/company_id = any\(\$1/);
    expect(mocks.state.calls[0]?.params[0]).toEqual(["company_a", "company_b"]);
    expect(invoices.map((invoice) => invoice.id)).toEqual(["invoice_new", "invoice_old"]);
  });

  it("loads available payment months for selected companies with one company_id in query", async () => {
    mocks.state.tableResponses = {
      invoice_payment_employee_entries: {
        rows: [
          { payment_month: "2026-06" },
          { payment_month: "2026-07" },
          { payment_month: "2026-06" },
        ],
      },
      employee_salary_payments: {
        rows: [{ month: "2026-08" }, { month: "2026-07" }],
      },
    };

    const months = await listAvailablePaymentMonthsForCompanies(["company_a", "company_b"]);

    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.state.calls[0]?.sql).toMatch(/from invoice_payment_employee_entries/i);
    expect(mocks.state.calls[0]?.sql).toMatch(/company_id = any\(\$1/);
    expect(mocks.state.calls[0]?.params[0]).toEqual(["company_a", "company_b"]);
    expect(mocks.state.calls[1]?.sql).toMatch(/from employee_salary_payments/i);
    expect(mocks.state.calls[1]?.sql).toMatch(/company_id = any\(\$1/);
    expect(mocks.state.calls[1]?.params[0]).toEqual(["company_a", "company_b"]);
    expect(months).toEqual(["2026-08", "2026-07", "2026-06"]);
  });

  it("loads company expenses for selected companies with one company_id in query", async () => {
    mocks.state.response = {
      rows: [
        {
          id: "expense_1",
          company_id: "company_a",
          year: 2026,
          month: 7,
          label: "Rent",
          amount_inr_cents: 100_00,
          created_at: "2026-07-01T00:00:00.000Z",
          updated_at: "2026-07-01T00:00:00.000Z",
        },
      ],
    };

    const expenses = await listCompanyExpensesForCompanies({
      companyIds: ["company_a", "company_b"],
      year: 2026,
      month: 7,
    });

    expect(mocks.query).toHaveBeenCalledTimes(1);
    const call = mocks.state.calls[0];
    expect(call?.sql).toMatch(/from company_expenses/i);
    expect(call?.sql).toMatch(/company_id = any\(\$1/);
    expect(call?.sql).toMatch(/year = \$2/);
    expect(call?.sql).toMatch(/month = \$3/);
    expect(call?.params).toEqual([["company_a", "company_b"], 2026, 7]);
    expect(expenses[0]).toMatchObject({
      id: "expense_1",
      companyId: "company_a",
      amountInrCents: 100_00,
    });
  });

  it("filters company expenses for selected companies inside an inclusive period", async () => {
    mocks.state.response = {
      rows: [
        {
          id: "expense_before",
          company_id: "company_a",
          year: 2025,
          month: 11,
          label: "Before",
          amount_inr_cents: 10_00,
          created_at: "2025-11-01T00:00:00.000Z",
          updated_at: "2025-11-01T00:00:00.000Z",
        },
        {
          id: "expense_dec",
          company_id: "company_a",
          year: 2025,
          month: 12,
          label: "December",
          amount_inr_cents: 20_00,
          created_at: "2025-12-01T00:00:00.000Z",
          updated_at: "2025-12-01T00:00:00.000Z",
        },
        {
          id: "expense_jan",
          company_id: "company_b",
          year: 2026,
          month: 1,
          label: "January",
          amount_inr_cents: 30_00,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "expense_feb",
          company_id: "company_a",
          year: 2026,
          month: 2,
          label: "February",
          amount_inr_cents: 40_00,
          created_at: "2026-02-01T00:00:00.000Z",
          updated_at: "2026-02-01T00:00:00.000Z",
        },
        {
          id: "expense_after",
          company_id: "company_b",
          year: 2026,
          month: 3,
          label: "After",
          amount_inr_cents: 50_00,
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-03-01T00:00:00.000Z",
        },
      ],
    };

    const expenses = await listCompanyExpensesForCompanies({
      companyIds: ["company_a", "company_b"],
      startMonth: "2025-12",
      endMonth: "2026-02",
    });

    const call = mocks.state.calls[0];
    expect(call?.sql).toMatch(/company_id = any\(\$1/);
    expect(call?.params[0]).toEqual(["company_a", "company_b"]);
    expect(call?.sql).not.toMatch(/year = \$/);
    expect(call?.sql).not.toMatch(/month = \$/);
    expect(expenses.map((expense) => expense.id)).toEqual([
      "expense_dec",
      "expense_jan",
      "expense_feb",
    ]);
  });

  it("loads available team names for selected companies with batched team and employee queries", async () => {
    mocks.state.tableResponses = {
      teams: {
        rows: [
          {
            id: "team_1",
            company_id: "company_a",
            name: "Data",
            created_at: "2026-07-01T00:00:00.000Z",
          },
          {
            id: "team_2",
            company_id: "company_b",
            name: "Ops",
            created_at: "2026-07-01T00:00:00.000Z",
          },
        ],
      },
      employees: {
        rows: [
          {
            id: "emp_1",
            company_id: "company_a",
            full_name: "Asha",
            designation: "Engineer",
            default_team: " Analytics ",
            billing_rate_usd_cents: 100,
            hrs_per_week: 40,
            active_from: "2026-04-01",
            active_to: null,
            is_active: true,
            created_at: "2026-04-01T00:00:00.000Z",
          },
          {
            id: "emp_2",
            company_id: "company_b",
            full_name: "Bala",
            designation: "Engineer",
            default_team: "Ops",
            billing_rate_usd_cents: 100,
            hrs_per_week: 40,
            active_from: "2026-04-01",
            active_to: null,
            is_active: true,
            created_at: "2026-04-01T00:00:00.000Z",
          },
        ],
      },
    };

    const namesByCompany = await listAvailableTeamNamesForCompanies([
      "company_a",
      "company_b",
      "company_a",
    ]);

    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.state.calls[0]?.sql).toMatch(/from teams/i);
    expect(mocks.state.calls[0]?.params[0]).toEqual(["company_a", "company_b"]);
    expect(mocks.state.calls[1]?.sql).toMatch(/from employees/i);
    expect(mocks.state.calls[1]?.params[0]).toEqual(["company_a", "company_b"]);
    expect(namesByCompany).toEqual({
      company_a: ["Analytics", "Data"],
      company_b: ["Ops"],
    });
  });

  it("can load only active employees for one company without changing the default historical load", async () => {
    mocks.state.response = {
      rows: [
        {
          id: "emp_active",
          company_id: "company_a",
          full_name: "Active Employee",
          designation: "Engineer",
          default_team: "Data",
          billing_rate_usd_cents: 100,
          payout_monthly_usd_cents: 1000,
          default_paid_usd_inr_rate: 83,
          default_actual_paid_inr_cents: 0,
          default_pf_inr_cents: 0,
          default_tds_inr_cents: 0,
          hrs_per_week: 40,
          active_from: "2026-04-01",
          active_to: null,
          is_active: true,
          created_at: "2026-04-01T00:00:00.000Z",
        },
      ],
    };

    await listEmployees("company_a");
    await listEmployees("company_a", { activeOnly: true });

    expect(mocks.state.calls[0]?.sql).toMatch(/company_id = \$1/);
    expect(mocks.state.calls[0]?.sql).not.toMatch(/is_active = true/);
    expect(mocks.state.calls[0]?.params).toEqual(["company_a"]);
    expect(mocks.state.calls[1]?.sql).toMatch(/company_id = \$1/);
    expect(mocks.state.calls[1]?.sql).toMatch(/is_active = true/);
    expect(mocks.state.calls[1]?.params).toEqual(["company_a"]);
  });

  it("can load only active employees for selected companies", async () => {
    mocks.state.response = { rows: [] };

    await listEmployeesForCompanies(["company_a", "company_b"], { activeOnly: true });

    expect(mocks.state.calls[0]?.sql).toMatch(/from employees/i);
    expect(mocks.state.calls[0]?.sql).toMatch(/company_id = any\(\$1/);
    expect(mocks.state.calls[0]?.params[0]).toEqual(["company_a", "company_b"]);
    expect(mocks.state.calls[0]?.sql).toMatch(/is_active = true/);
  });

  it("excludes inactive employee default teams from new invoice team catalogs", async () => {
    mocks.state.tableResponses = {
      teams: {
        rows: [],
      },
      employees: {
        rows: [
          {
            id: "emp_active",
            company_id: "company_a",
            full_name: "Active Employee",
            designation: "Engineer",
            default_team: "Active Team",
            billing_rate_usd_cents: 100,
            payout_monthly_usd_cents: 1000,
            default_paid_usd_inr_rate: 83,
            default_actual_paid_inr_cents: 0,
            default_pf_inr_cents: 0,
            default_tds_inr_cents: 0,
            hrs_per_week: 40,
            active_from: "2026-04-01",
            active_to: null,
            is_active: true,
            created_at: "2026-04-01T00:00:00.000Z",
          },
        ],
      },
    };

    const namesByCompany = await listAvailableTeamNamesForCompanies(["company_a"]);

    expect(mocks.state.calls[1]?.sql).toMatch(/is_active = true/);
    expect(namesByCompany).toEqual({
      company_a: ["Active Team"],
    });
  });
});
