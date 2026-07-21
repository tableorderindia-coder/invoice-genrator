import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state: {
    response: { data: unknown[] | null; error: unknown };
    tableResponses: Record<string, { data: unknown[] | null; error: unknown }>;
    chains: Array<Record<string, unknown>>;
  } = {
    response: { data: [], error: null },
    tableResponses: {},
    chains: [],
  };

  const supabase = {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {
        table,
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        order: vi.fn(() => chain),
        then: (
          resolve: (value: { data: unknown[] | null; error: unknown }) => unknown,
          reject: (reason: unknown) => unknown,
        ) => Promise.resolve(state.tableResponses[table] ?? state.response).then(resolve, reject),
      };
      state.chains.push(chain);
      return chain;
    }),
  };

  return { state, supabase };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => mocks.supabase),
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
    mocks.state.response = { data: [], error: null };
    mocks.state.tableResponses = {};
    mocks.state.chains = [];
    mocks.supabase.from.mockClear();
  });

  it("loads invoices for selected companies with one company_id in query", async () => {
    mocks.state.response = {
      data: [
        invoiceRow("invoice_old", "company_a", 2026, 6),
        invoiceRow("invoice_new", "company_b", 2026, 7),
      ],
      error: null,
    };

    const invoices = await listInvoicesForCompanies(["company_a", "company_b", "company_a"]);

    expect(mocks.supabase.from).toHaveBeenCalledTimes(1);
    expect(mocks.supabase.from).toHaveBeenCalledWith("invoices");
    expect(mocks.state.chains[0]?.in).toHaveBeenCalledWith("company_id", [
      "company_a",
      "company_b",
    ]);
    expect(invoices.map((invoice) => invoice.id)).toEqual(["invoice_new", "invoice_old"]);
  });

  it("loads available payment months for selected companies with one company_id in query", async () => {
    mocks.state.response = {
      data: [
        { payment_month: "2026-06" },
        { payment_month: "2026-07" },
        { payment_month: "2026-06" },
      ],
      error: null,
    };

    const months = await listAvailablePaymentMonthsForCompanies(["company_a", "company_b"]);

    expect(mocks.supabase.from).toHaveBeenCalledTimes(1);
    expect(mocks.supabase.from).toHaveBeenCalledWith("invoice_payment_employee_entries");
    expect(mocks.state.chains[0]?.in).toHaveBeenCalledWith("company_id", [
      "company_a",
      "company_b",
    ]);
    expect(months).toEqual(["2026-07", "2026-06"]);
  });

  it("loads company expenses for selected companies with one company_id in query", async () => {
    mocks.state.response = {
      data: [
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
      error: null,
    };

    const expenses = await listCompanyExpensesForCompanies({
      companyIds: ["company_a", "company_b"],
      year: 2026,
      month: 7,
    });

    expect(mocks.supabase.from).toHaveBeenCalledTimes(1);
    expect(mocks.supabase.from).toHaveBeenCalledWith("company_expenses");
    expect(mocks.state.chains[0]?.in).toHaveBeenCalledWith("company_id", [
      "company_a",
      "company_b",
    ]);
    expect(mocks.state.chains[0]?.eq).toHaveBeenCalledWith("year", 2026);
    expect(mocks.state.chains[0]?.eq).toHaveBeenCalledWith("month", 7);
    expect(expenses[0]).toMatchObject({
      id: "expense_1",
      companyId: "company_a",
      amountInrCents: 100_00,
    });
  });

  it("loads available team names for selected companies with batched team and employee queries", async () => {
    mocks.state.tableResponses = {
      teams: {
        data: [
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
        error: null,
      },
      employees: {
        data: [
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
        error: null,
      },
    };

    const namesByCompany = await listAvailableTeamNamesForCompanies([
      "company_a",
      "company_b",
      "company_a",
    ]);

    expect(mocks.supabase.from).toHaveBeenCalledTimes(2);
    expect(mocks.supabase.from).toHaveBeenNthCalledWith(1, "teams");
    expect(mocks.supabase.from).toHaveBeenNthCalledWith(2, "employees");
    expect(mocks.state.chains[0]?.in).toHaveBeenCalledWith("company_id", [
      "company_a",
      "company_b",
    ]);
    expect(mocks.state.chains[1]?.in).toHaveBeenCalledWith("company_id", [
      "company_a",
      "company_b",
    ]);
    expect(namesByCompany).toEqual({
      company_a: ["Analytics", "Data"],
      company_b: ["Ops"],
    });
  });

  it("can load only active employees for one company without changing the default historical load", async () => {
    mocks.state.response = {
      data: [
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
      error: null,
    };

    await listEmployees("company_a");
    await listEmployees("company_a", { activeOnly: true });

    expect(mocks.state.chains[0]?.eq).toHaveBeenCalledWith("company_id", "company_a");
    expect(mocks.state.chains[0]?.eq).not.toHaveBeenCalledWith("is_active", true);
    expect(mocks.state.chains[1]?.eq).toHaveBeenCalledWith("company_id", "company_a");
    expect(mocks.state.chains[1]?.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("can load only active employees for selected companies", async () => {
    mocks.state.response = { data: [], error: null };

    await listEmployeesForCompanies(["company_a", "company_b"], { activeOnly: true });

    expect(mocks.supabase.from).toHaveBeenCalledWith("employees");
    expect(mocks.state.chains[0]?.in).toHaveBeenCalledWith("company_id", [
      "company_a",
      "company_b",
    ]);
    expect(mocks.state.chains[0]?.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("excludes inactive employee default teams from new invoice team catalogs", async () => {
    mocks.state.tableResponses = {
      teams: {
        data: [],
        error: null,
      },
      employees: {
        data: [
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
        error: null,
      },
    };

    const namesByCompany = await listAvailableTeamNamesForCompanies(["company_a"]);

    expect(mocks.state.chains[1]?.eq).toHaveBeenCalledWith("is_active", true);
    expect(namesByCompany).toEqual({
      company_a: ["Active Team"],
    });
  });
});
