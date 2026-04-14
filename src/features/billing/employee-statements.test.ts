import { describe, expect, it, vi } from "vitest";

vi.mock("./store", () => ({
  getInvoiceDetail: vi.fn(),
  listEmployeeStatementInvoiceRows: vi.fn(),
  listEmployeeStatementMonthSummaries: vi.fn(),
  listEmployees: vi.fn(),
  listInvoicesForCompany: vi.fn(),
}));

import {
  applySavedEmployeeStatementOverrides,
  buildEmployeeStatementSection,
  buildEmployeeStatementSavePayload,
  buildEmployeeStatementInvoiceRowFromDetail,
  buildFlattenedEmployeeStatementRows,
  groupEmployeeStatementRows,
  parseEmployeeStatementFilters,
  toEmployeeStatementMonthKey,
} from "./employee-statements";

describe("employee statements helpers", () => {
  it("parses explicit employee and month-range filters", () => {
    expect(
      parseEmployeeStatementFilters({
        companyId: "comp_1",
        employeeIds: ["emp_1", "emp_2"],
        startMonth: "2026-01",
        endMonth: "2026-03",
      }),
    ).toEqual({
      companyId: "comp_1",
      employeeIds: ["emp_1", "emp_2"],
      startMonth: "2026-01",
      endMonth: "2026-03",
    });
  });

  it("groups employee statement rows by month in chronological order", () => {
    const grouped = groupEmployeeStatementRows([
      { invoiceId: "inv_2", monthKey: "2026-02", invoiceNumber: "002" },
      { invoiceId: "inv_1", monthKey: "2026-01", invoiceNumber: "001" },
    ]);

    expect(grouped.map((group) => group.monthKey)).toEqual(["2026-01", "2026-02"]);
  });

  it("creates month keys from invoice month and year", () => {
    expect(toEmployeeStatementMonthKey({ year: 2026, month: 4 })).toBe("2026-04");
  });

  it("builds month summary defaults from employee payout monthly amount and invoice rows", () => {
    const section = buildEmployeeStatementSection({
      employee: {
        id: "emp_1",
        fullName: "Asha",
        payoutMonthlyUsdCents: 250000,
      },
      rows: [
        {
          employeeId: "emp_1",
          employeeName: "Asha",
          invoiceId: "inv_1",
          invoiceNumber: "2026/001",
          monthKey: "2026-04",
          monthLabel: "April 2026",
          dollarInwardUsdCents: 100000,
          onboardingAdvanceUsdCents: 20000,
          reimbursementUsdCents: 5000,
          reimbursementLabelsText: "Laptop",
          offboardingDeductionUsdCents: 1000,
        },
        {
          employeeId: "emp_1",
          employeeName: "Asha",
          invoiceId: "inv_2",
          invoiceNumber: "2026/002",
          monthKey: "2026-04",
          monthLabel: "April 2026",
          dollarInwardUsdCents: 40000,
          onboardingAdvanceUsdCents: 0,
          reimbursementUsdCents: 0,
          reimbursementLabelsText: "",
          offboardingDeductionUsdCents: 0,
        },
      ],
    });

    expect(section.months[0]?.monthlyDollarPaidUsdCents).toBe(250000);
    expect(section.months[0]?.effectiveDollarInwardUsdCents).toBe(164000);
  });

  it("serializes invoice-row edits and month-summary edits separately", () => {
    const payload = buildEmployeeStatementSavePayload({
      employeeId: "emp_1",
      invoiceRows: [
        {
          employeeId: "emp_1",
          employeeName: "Asha",
          invoiceId: "inv_1",
          invoiceNumber: "2026/001",
          monthKey: "2026-04",
          monthLabel: "April 2026",
          dollarInwardUsdCents: 120000,
          onboardingAdvanceUsdCents: 10000,
          reimbursementUsdCents: 5000,
          reimbursementLabelsText: "Laptop",
          offboardingDeductionUsdCents: 1000,
        },
      ],
      monthSummaries: [
        {
          employeeId: "emp_1",
          monthKey: "2026-04",
          monthLabel: "April 2026",
          effectiveDollarInwardUsdCents: 134000,
          monthlyDollarPaidUsdCents: 250000,
        },
      ],
    });

    expect(payload.invoiceRows).toHaveLength(1);
    expect(payload.monthSummaries).toHaveLength(1);
  });

  it("prefers saved statement values over derived defaults while keeping invoice identity", () => {
    const section = buildEmployeeStatementSection({
      employee: {
        id: "emp_1",
        fullName: "Asha",
        payoutMonthlyUsdCents: 250000,
      },
      rows: [
        {
          employeeId: "emp_1",
          employeeName: "Asha",
          invoiceId: "inv_1",
          invoiceNumber: "2026/001",
          monthKey: "2026-04",
          monthLabel: "April 2026",
          dollarInwardUsdCents: 100000,
          onboardingAdvanceUsdCents: 20000,
          reimbursementUsdCents: 5000,
          reimbursementLabelsText: "Default",
          offboardingDeductionUsdCents: 1000,
        },
      ],
    });

    const overridden = applySavedEmployeeStatementOverrides(section, {
      invoiceRows: [
        {
          employeeId: "emp_1",
          employeeName: "Asha",
          invoiceId: "inv_1",
          invoiceNumber: "old-number",
          monthKey: "2026-04",
          monthLabel: "Old month",
          dollarInwardUsdCents: 222000,
          onboardingAdvanceUsdCents: 1000,
          reimbursementUsdCents: 2000,
          reimbursementLabelsText: "Saved label",
          offboardingDeductionUsdCents: 300,
        },
      ],
      monthSummaries: [
        {
          employeeId: "emp_1",
          monthKey: "2026-04",
          monthLabel: "April 2026",
          effectiveDollarInwardUsdCents: 555000,
          monthlyDollarPaidUsdCents: 333000,
        },
      ],
    });

    expect(overridden.months[0]?.rows[0]).toMatchObject({
      invoiceId: "inv_1",
      invoiceNumber: "2026/001",
      monthLabel: "April 2026",
      dollarInwardUsdCents: 222000,
      reimbursementLabelsText: "Saved label",
    });
    expect(overridden.months[0]?.effectiveDollarInwardUsdCents).toBe(555000);
    expect(overridden.months[0]?.monthlyDollarPaidUsdCents).toBe(333000);
  });

  it("flattens month sections into a single table with summary columns and spacer rows", () => {
    const section = buildEmployeeStatementSection({
      employee: {
        id: "emp_1",
        fullName: "Asha",
        payoutMonthlyUsdCents: 250000,
      },
      rows: [
        {
          employeeId: "emp_1",
          employeeName: "Asha",
          invoiceId: "inv_1",
          invoiceNumber: "2026/001",
          monthKey: "2026-01",
          monthLabel: "January 2026",
          dollarInwardUsdCents: 100000,
          onboardingAdvanceUsdCents: 20000,
          reimbursementUsdCents: 5000,
          reimbursementLabelsText: "Laptop",
          offboardingDeductionUsdCents: 1000,
        },
        {
          employeeId: "emp_1",
          employeeName: "Asha",
          invoiceId: "inv_2",
          invoiceNumber: "2026/002",
          monthKey: "2026-01",
          monthLabel: "January 2026",
          dollarInwardUsdCents: 40000,
          onboardingAdvanceUsdCents: 0,
          reimbursementUsdCents: 0,
          reimbursementLabelsText: "",
          offboardingDeductionUsdCents: 0,
        },
        {
          employeeId: "emp_1",
          employeeName: "Asha",
          invoiceId: "inv_3",
          invoiceNumber: "2026/003",
          monthKey: "2026-02",
          monthLabel: "February 2026",
          dollarInwardUsdCents: 60000,
          onboardingAdvanceUsdCents: 10000,
          reimbursementUsdCents: 0,
          reimbursementLabelsText: "",
          offboardingDeductionUsdCents: 0,
        },
      ],
    });

    const rows = buildFlattenedEmployeeStatementRows(section);

    expect(rows.map((row) => row.kind)).toEqual([
      "invoice",
      "invoice",
      "spacer",
      "invoice",
    ]);
    expect(rows[0]).toMatchObject({
      kind: "invoice",
      monthLabel: "January 2026",
      invoiceNumber: "2026/001",
      effectiveDollarInwardUsdCents: 164000,
      monthlyDollarPaidUsdCents: 250000,
      totalBalanceUsdCents: -86000,
    });
    expect(rows[1]).toMatchObject({
      kind: "invoice",
      invoiceNumber: "2026/002",
      effectiveDollarInwardUsdCents: null,
      monthlyDollarPaidUsdCents: null,
      totalBalanceUsdCents: null,
    });
    expect(rows[3]).toMatchObject({
      kind: "invoice",
      monthLabel: "February 2026",
      effectiveDollarInwardUsdCents: 70000,
      monthlyDollarPaidUsdCents: 250000,
      totalBalanceUsdCents: -180000,
    });
  });

  it("builds a statement row for adjustment-only invoices when employee adjustments exist", () => {
    const row = buildEmployeeStatementInvoiceRowFromDetail({
      employee: {
        id: "emp_lakshay",
        companyId: "comp_1",
        fullName: "Lakshay Chaudhary",
        designation: "Operations Specialist",
        defaultTeam: "Operations",
        billingRateUsdCents: 250000,
        payoutMonthlyUsdCents: 106950,
        hrsPerWeek: 40,
        activeFrom: "2025-08-01",
        activeUntil: null,
        isActive: true,
        createdAt: "2026-04-14T00:00:00.000Z",
      },
      detail: {
        invoice: {
          id: "invoice_onboarding3",
          companyId: "comp_1",
          month: 3,
          year: 2026,
          invoiceNumber: "2026/003",
        },
        company: {
          id: "comp_1",
          name: "Acme Inc.",
          billingAddress: "Address",
          defaultNote: "",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        teams: [
          {
            id: "team_1",
            invoiceId: "invoice_onboarding3",
            teamName: "Operations",
            sortOrder: 0,
            lineItems: [],
          },
        ],
        adjustments: [
          {
            id: "adj_1",
            invoiceId: "invoice_onboarding3",
            type: "onboarding",
            label: "Onboarding advance",
            employeeName: "Lakshay Chaudhary",
            amountUsdCents: 260000,
            sortOrder: 1,
          },
        ],
      },
    });

    expect(row).toMatchObject({
      employeeId: "emp_lakshay",
      invoiceId: "invoice_onboarding3",
      invoiceNumber: "2026/003",
      monthKey: "2026-03",
      dollarInwardUsdCents: 0,
      onboardingAdvanceUsdCents: 260000,
      reimbursementUsdCents: 0,
      offboardingDeductionUsdCents: 0,
    });
  });
});
