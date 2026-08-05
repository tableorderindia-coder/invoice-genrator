// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardTables } from "../../../app/dashboard/dashboard-tables";
import {
  DEFAULT_EMPLOYEE_DASHBOARD_COLUMNS,
  DEFAULT_PERIOD_DASHBOARD_COLUMNS,
  EMPLOYEE_DASHBOARD_COLUMN_OPTIONS,
  PERIOD_DASHBOARD_COLUMN_OPTIONS,
} from "./dashboard-column-options";
import type {
  CompanyExpense,
  PnDashboardData,
  PnEmployeeEditableRow,
  PnPeriodRow,
} from "./types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const allEmployeeColumnKeys = EMPLOYEE_DASHBOARD_COLUMN_OPTIONS.map(
  (option) => option.value,
);
const allPeriodColumnKeys = PERIOD_DASHBOARD_COLUMN_OPTIONS.map((option) => option.value);

const employeeRow: PnEmployeeEditableRow = {
  payoutId: "payout_1",
  invoiceId: "inv_1",
  invoiceNumber: "INV-1",
  year: 2026,
  month: 4,
  daysWorked: 10,
  daysInMonth: 30,
  dollarInwardUsdCents: 100_00,
  baseDollarInwardUsdCents: 100_00,
  onboardingAdvanceUsdCents: 5_00,
  reimbursementUsdCents: 2_00,
  reimbursementLabelsText: "Taxi",
  reimbursementInrCents: 160_00,
  appraisalAdvanceUsdCents: 1_00,
  appraisalAdvanceInrCents: 80_00,
  offboardingDeductionUsdCents: 0,
  effectiveDollarInwardUsdCents: 98_00,
  cashInInrCents: 18_200_00,
  cashoutUsdInrRate: 80,
  paidUsdInrRate: 75,
  salaryPaidInrCents: 14_500_00,
  pfInrCents: 500_00,
  tdsInrCents: 200_00,
  actualPaidInrCents: 15_200_00,
  fxCommissionInrCents: 1_000_00,
  totalCommissionUsdCents: 10_00,
  commissionEarnedInrCents: 2_000_00,
  grossEarningsInrCents: 3_000_00,
  netProfitInrCents: 12_000_00,
  isSecurityDepositMonth: false,
};

const periodRows: PnPeriodRow[] = [
  {
    year: 2026,
    month: 4,
    dollarInwardUsdCents: 100_00,
    onboardingAdvanceUsdCents: 5_00,
    advancesInrCents: 400_00,
    reimbursementUsdCents: 4_00,
    reimbursementLabelsText: "Taxi",
    reimbursementInrCents: 320_00,
    appraisalAdvanceUsdCents: 1_00,
    appraisalAdvanceInrCents: 80_00,
    offboardingDeductionUsdCents: 0,
    effectiveDollarInwardUsdCents: 99_00,
    cashoutUsdInrRate: 80,
    cashInInrCents: 8_000_00,
    paidUsdInrRate: 75,
    pfInrCents: 500_00,
    tdsInrCents: 200_00,
    actualPaidInrCents: 15_200_00,
    salaryPaidInrCents: 14_500_00,
    fxCommissionInrCents: 1_000_00,
    totalCommissionUsdCents: 10_00,
    commissionEarnedInrCents: 2_000_00,
    grossEarningsInrCents: 3_000_00,
    expensesInrCents: 1_000_00,
    companyReimbursementUsdCents: 2_00,
    companyReimbursementInrCents: 160_00,
    netPlInrCents: 12_000_00,
  },
  {
    year: 2026,
    month: 5,
    dollarInwardUsdCents: 200_00,
    onboardingAdvanceUsdCents: 0,
    advancesInrCents: 0,
    reimbursementUsdCents: 3_00,
    reimbursementLabelsText: "Food",
    reimbursementInrCents: 240_00,
    appraisalAdvanceUsdCents: 0,
    appraisalAdvanceInrCents: 0,
    offboardingDeductionUsdCents: 1_00,
    effectiveDollarInwardUsdCents: 199_00,
    cashoutUsdInrRate: 82,
    cashInInrCents: 16_000_00,
    paidUsdInrRate: 78,
    pfInrCents: 300_00,
    tdsInrCents: 100_00,
    actualPaidInrCents: 7_900_00,
    salaryPaidInrCents: 7_500_00,
    fxCommissionInrCents: 800_00,
    totalCommissionUsdCents: 8_00,
    commissionEarnedInrCents: 1_600_00,
    grossEarningsInrCents: 2_400_00,
    expensesInrCents: 500_00,
    companyReimbursementUsdCents: 1_00,
    companyReimbursementInrCents: 80_00,
    netPlInrCents: 9_000_00,
  },
];

const baseData: PnDashboardData = {
  companyId: "comp_1",
  employeeSections: [],
  employeeEditableSections: [
    {
      employeeId: "emp_1",
      employeeName: "Alice",
      totalGrossEarningsInrCents: 3_000_00,
      totalNetProfitInrCents: 12_000_00,
      rows: [employeeRow],
    },
  ],
  periodRows,
};

const expenseRows: CompanyExpense[] = [
  {
    id: "expense_1",
    companyId: "comp_1",
    year: 2026,
    month: 4,
    label: "Beesetti Kiran Suresh's salary",
    amountInrCents: 63_334_00,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "expense_2",
    companyId: "comp_1",
    year: 2026,
    month: 4,
    label: "Beesetti Kiran Suresh's salary",
    amountInrCents: 93_897_00,
    createdAt: "2026-04-02T00:00:00.000Z",
    updatedAt: "2026-04-02T00:00:00.000Z",
  },
];

describe("dashboard tables rendering", () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders the SaaS employee view as one unified spreadsheet with frozen coordinates", () => {
    render(
      createElement(DashboardTables, {
        view: "employee",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard",
        employeeColumnKeys: DEFAULT_EMPLOYEE_DASHBOARD_COLUMNS,
        periodColumnKeys: DEFAULT_PERIOD_DASHBOARD_COLUMNS,
        uiMode: "saas",
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
        bulkUpdateDashboardEmployeeCashFlowEntriesAction: vi.fn(async () => ({
          savedPayoutIds: [],
          failedRows: [],
        })),
      }),
    );

    expect(screen.getAllByRole("table")).toHaveLength(1);
    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    expect(headers[0]?.textContent).toBe("Employee");
    expect(headers[0]?.className).toContain("sticky-employee-column");
    expect(headers[1]?.textContent).toBe("Period");
    expect(headers[1]?.className).toContain("sticky-period-column");
    expect(screen.getByRole("searchbox", { name: "Search employees" })).toBeTruthy();
    expect(screen.getByText("Subtotal")).toBeTruthy();
    expect(screen.getByText("Grand total")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "P&L" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Payroll" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cash Flow" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Detailed" })).toBeTruthy();
  });

  it("shows an employee name once across that employee's rows and subtotal", () => {
    render(
      createElement(DashboardTables, {
        view: "employee",
        periodType: "monthly",
        data: {
          ...baseData,
          employeeEditableSections: [
            {
              ...baseData.employeeEditableSections[0],
              rows: [
                employeeRow,
                {
                  ...employeeRow,
                  payoutId: "payout_2",
                  invoiceId: "inv_2",
                  invoiceNumber: "INV-2",
                  month: 5,
                },
              ],
            },
          ],
        },
        returnTo: "/dashboard",
        employeeColumnKeys: DEFAULT_EMPLOYEE_DASHBOARD_COLUMNS,
        periodColumnKeys: DEFAULT_PERIOD_DASHBOARD_COLUMNS,
        uiMode: "saas",
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
        bulkUpdateDashboardEmployeeCashFlowEntriesAction: vi.fn(async () => ({
          savedPayoutIds: [],
          failedRows: [],
        })),
      }),
    );

    const employeeCell = screen.getByRole("rowheader", { name: "Alice" });
    expect(screen.getAllByText("Alice")).toHaveLength(1);
    expect(employeeCell.getAttribute("rowspan")).toBe("3");
  });

  it("edits only Advances and Net P/L in the SaaS employee spreadsheet", async () => {
    const bulkUpdate = vi.fn(async () => ({
      savedPayoutIds: ["payout_1"],
      failedRows: [],
    }));
    render(
      createElement(DashboardTables, {
        view: "employee",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard",
        employeeColumnKeys: DEFAULT_EMPLOYEE_DASHBOARD_COLUMNS,
        periodColumnKeys: DEFAULT_PERIOD_DASHBOARD_COLUMNS,
        uiMode: "saas",
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
        bulkUpdateDashboardEmployeeCashFlowEntriesAction: bulkUpdate,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const advanceInput = screen.getByRole("textbox", {
      name: "advances for April 2026",
    }) as HTMLInputElement;
    expect(advanceInput.value).toBe("400");

    fireEvent.change(advanceInput, { target: { value: "125" } });

    expect(screen.getAllByText("-₹6,560.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$108").length).toBeGreaterThan(0);
    expect(screen.getAllByText("- ₹6,685.00").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Save (1)" }));
    await waitFor(() => expect(bulkUpdate).toHaveBeenCalledTimes(1));
    expect(bulkUpdate).toHaveBeenCalledWith([
      expect.objectContaining({
        payoutId: "payout_1",
        advanceOverrideInrCents: 12_500,
      }),
    ]);
  });

  it("allows a blank Legacy Advance INR override to keep automatic calculation", () => {
    const { container } = render(
      createElement(DashboardTables, {
        view: "employee",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard",
        employeeColumnKeys: DEFAULT_EMPLOYEE_DASHBOARD_COLUMNS,
        periodColumnKeys: DEFAULT_PERIOD_DASHBOARD_COLUMNS,
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    const input = container.querySelector(
      'input[name="advanceOverrideInr"]',
    ) as HTMLInputElement;
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(input.value).toBe("");
    expect(input.placeholder).toContain("400");

    fireEvent.change(input, { target: { value: "125" } });
    const form = container.querySelector("#dashboard-payout-payout_1") as HTMLFormElement;
    expect(new FormData(form).get("advanceOverrideInr")).toBe("125");
  });

  it("renders a totals row aligned to the visible employee columns", () => {
    render(
      createElement(DashboardTables, {
        view: "employee",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard",
        employeeColumnKeys: allEmployeeColumnKeys,
        periodColumnKeys: allPeriodColumnKeys,
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    const totalsRow = within(table).getByText("Totals").closest("tr");
    const headerTexts = headers.map((header) =>
      header.textContent?.replace(/\s+/g, " ").trim(),
    );

    expect(totalsRow).not.toBeNull();
    expect(within(totalsRow as HTMLElement).getAllByRole("cell")).toHaveLength(headers.length);
    expect(headerTexts).toContain("Total Cash Inward (INR)");
  });

  it("totals employee salary paid from the displayed salary paid rows", () => {
    render(
      createElement(DashboardTables, {
        view: "employee",
        periodType: "monthly",
        data: {
          ...baseData,
          employeeEditableSections: [
            {
              ...baseData.employeeEditableSections[0],
              rows: [
                {
                  ...employeeRow,
                  salaryPaidInrCents: employeeRow.actualPaidInrCents,
                },
              ],
            },
          ],
        },
        returnTo: "/dashboard",
        employeeColumnKeys: allEmployeeColumnKeys,
        periodColumnKeys: allPeriodColumnKeys,
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    const salaryPaidIndex = headers.findIndex(
      (header) => header.textContent?.replace(/\s+/g, " ").trim() === "Salary paid (INR)",
    );
    const totalsRow = within(table).getByText("Totals").closest("tr");

    expect(salaryPaidIndex).toBeGreaterThan(-1);
    expect(totalsRow).not.toBeNull();
    expect(
      within(totalsRow as HTMLElement).getAllByRole("cell")[salaryPaidIndex]?.textContent,
    ).toBe("₹15,200.00");
  });

  it("updates the period totals net p/l when expenses are excluded", () => {
    render(
      createElement(DashboardTables, {
        view: "period",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard",
        employeeColumnKeys: allEmployeeColumnKeys,
        periodColumnKeys: allPeriodColumnKeys,
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    expect(screen.getByText("Expenses: in P/L")).not.toBeNull();
    expect(screen.getByText("+ ₹3,740.00")).not.toBeNull();

    fireEvent.click(screen.getAllByRole("checkbox")[0] as HTMLInputElement);

    expect(screen.getByText("+ ₹5,240.00")).not.toBeNull();
  });

  it("renders salary-only dashboard rows as read-only costs", () => {
    render(
      createElement(DashboardTables, {
        view: "employee",
        periodType: "monthly",
        data: {
          ...baseData,
          employeeEditableSections: [
            {
              employeeId: "employee_kiran",
              employeeName: "B Kiran Suresh",
              totalGrossEarningsInrCents: -50_000_00,
              totalNetProfitInrCents: -50_000_00,
              rows: [
                {
                  ...employeeRow,
                  payoutId: "salary_only:salary_1",
                  invoiceId: "",
                  invoiceNumber: "Salary only",
                  dollarInwardUsdCents: 0,
                  baseDollarInwardUsdCents: 0,
                  effectiveDollarInwardUsdCents: 0,
                  cashInInrCents: 0,
                  cashoutUsdInrRate: 0,
                  salaryPaidInrCents: 50_000_00,
                  actualPaidInrCents: 50_000_00,
                  grossEarningsInrCents: -50_000_00,
                  netProfitInrCents: -50_000_00,
                  isSalaryOnly: true,
                },
              ],
            },
          ],
        },
        returnTo: "/dashboard",
        employeeColumnKeys: DEFAULT_EMPLOYEE_DASHBOARD_COLUMNS,
        periodColumnKeys: DEFAULT_PERIOD_DASHBOARD_COLUMNS,
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    expect(screen.getByText("B Kiran Suresh")).toBeTruthy();
    expect(screen.getByText("Salary only")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Update" })).toBeNull();
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
  });

  it("deducts advances from employee net p/l and persists the checkbox", () => {
    render(
      createElement(DashboardTables, {
        view: "employee",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard",
        employeeColumnKeys: DEFAULT_EMPLOYEE_DASHBOARD_COLUMNS,
        periodColumnKeys: DEFAULT_PERIOD_DASHBOARD_COLUMNS,
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    expect(screen.getAllByText("+ ₹2,600.00").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("checkbox", { name: "Include advances in Net P/L" }));
    expect(screen.getAllByText("+ ₹3,000.00").length).toBeGreaterThan(0);
    expect(window.localStorage.getItem("dashboardIncludeAdvances")).toBe("false");
  });

  it("keeps the default employee update form complete when optional columns are hidden", () => {
    const { container } = render(
      createElement(DashboardTables, {
        view: "employee",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard?view=employee",
        employeeColumnKeys: DEFAULT_EMPLOYEE_DASHBOARD_COLUMNS,
        periodColumnKeys: DEFAULT_PERIOD_DASHBOARD_COLUMNS,
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    const form = container.querySelector("#dashboard-payout-payout_1");
    expect(form).toBeInstanceOf(HTMLFormElement);

    const formData = new FormData(form as HTMLFormElement);
    expect(formData.get("payoutId")).toBe("payout_1");
    expect(formData.get("returnTo")).toBe("/dashboard?view=employee");
    expect(formData.get("daysWorked")).toBe("10");
    expect(formData.get("dollarInwardUsd")).toBe("100.00");
    expect(formData.get("onboardingAdvanceUsd")).toBe("5.00");
    expect(formData.get("reimbursementUsd")).toBe("2.00");
    expect(formData.get("reimbursementLabelsText")).toBe("Taxi");
    expect(formData.get("appraisalAdvanceUsd")).toBe("1.00");
    expect(formData.get("offboardingDeductionUsd")).toBe("0.00");
    expect(formData.get("cashoutUsdInrRate")).toBe("80");
    expect(formData.get("paidUsdInrRate")).toBe("75");
    expect(formData.get("pfInr")).toBe("500");
    expect(formData.get("tdsInr")).toBe("200");
    expect(formData.get("actualPaidInr")).toBe("15200.00");

    const visiblePfInput = container.querySelector(
      'input[type="text"][name="pfInr"]',
    ) as HTMLInputElement;
    fireEvent.change(visiblePfInput, { target: { value: "777.25" } });
    expect(new FormData(form as HTMLFormElement).get("pfInr")).toBe("777.25");
  });

  it("restores stored accounting toggles after remounting", () => {
    window.localStorage.setItem("dashboardIncludeAdvances", "false");
    const props = {
      view: "employee" as const,
      periodType: "monthly" as const,
      data: baseData,
      returnTo: "/dashboard",
      employeeColumnKeys: DEFAULT_EMPLOYEE_DASHBOARD_COLUMNS,
      periodColumnKeys: DEFAULT_PERIOD_DASHBOARD_COLUMNS,
      updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
    };

    const firstRender = render(createElement(DashboardTables, props));
    expect(screen.getByText("Advances: excluded")).not.toBeNull();
    firstRender.unmount();
    render(createElement(DashboardTables, props));

    expect(screen.getByText("Advances: excluded")).not.toBeNull();
    expect(
      (screen.getByRole("checkbox", {
        name: "Include advances in Net P/L",
      }) as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("renders monthly period columns in the requested order after effective dollar inward", () => {
    render(
      createElement(DashboardTables, {
        view: "period",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard",
        employeeColumnKeys: allEmployeeColumnKeys,
        periodColumnKeys: allPeriodColumnKeys,
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    const headerTexts = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.replace(/\s+/g, " ").trim() ?? "");

    expect(headerTexts).toEqual([
      "",
      "Period",
      "Dollar inward",
      "Onboarding advance",
      "Employee reimbursements (USD)",
      "Employee reimbursement labels",
      "Employee reimbursements (INR)",
      "Appraisal advance",
      "Appraisal advance (INR)",
      "Offboarding deduction",
      "Total effective dollar inward (USD)",
      "Cashout rate",
      "Total Cash Inward (INR)",
      "Peg rate",
      "Monthly paid (INR)",
      "Actual paid (INR)",
      "Salary paid (INR)",
      "PF (INR)",
      "TDS (INR)",
      "Forex gain (INR)",
      "Operating margin (INR)",
      "Gross P&L (INR)",
      "In P/LExpenses (INR)",
      "In P/LAdvances (INR)",
      "In P/LReimb. (USD)",
      "In P/LReimb. (INR)",
      "Net P/L (INR)",
    ]);
  });

  it("renders received and peg rates with at most two decimal places", () => {
    render(
      createElement(DashboardTables, {
        view: "period",
        periodType: "monthly",
        data: {
          ...baseData,
          periodRows: [
            {
              ...periodRows[0],
              cashoutUsdInrRate: 87.87,
              paidUsdInrRate: 85.6667,
            },
          ],
        },
        returnTo: "/dashboard",
        employeeColumnKeys: allEmployeeColumnKeys,
        periodColumnKeys: allPeriodColumnKeys,
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    expect(screen.getAllByText("87.87").length).toBeGreaterThan(0);
    expect(screen.getAllByText("85.67").length).toBeGreaterThan(0);
    expect(screen.queryByText("87.8700")).toBeNull();
    expect(screen.queryByText("85.6667")).toBeNull();
  });

  it("keeps editable employee peg rates as decimals", () => {
    render(
      createElement(DashboardTables, {
        view: "employee",
        periodType: "monthly",
        data: {
          ...baseData,
          employeeEditableSections: [
            {
              ...baseData.employeeEditableSections[0],
              rows: [
                {
                  ...employeeRow,
                  paidUsdInrRate: 95.2,
                },
              ],
            },
          ],
        },
        returnTo: "/dashboard",
        employeeColumnKeys: allEmployeeColumnKeys,
        periodColumnKeys: allPeriodColumnKeys,
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    const pegInput = document.querySelector(
      'input[type="text"][name="paidUsdInrRate"]',
    ) as HTMLInputElement;
    expect(pegInput.name).toBe("paidUsdInrRate");
    expect(pegInput.inputMode).toBe("decimal");
    expect(screen.queryByDisplayValue("95")).toBeNull();
  });

  it("renders only selected employee columns plus fixed columns", () => {
    render(
      createElement(DashboardTables, {
        view: "employee",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard",
        employeeColumnKeys: ["cashIn", "netProfit"],
        periodColumnKeys: allPeriodColumnKeys,
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    const headerTexts = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.replace(/\s+/g, " ").trim() ?? "");

    expect(headerTexts).toEqual([
      "Month",
      "Total Cash Inward (INR)",
      "Net P/L (INR)",
      "Actions",
    ]);
  });

  it("renders the stakeholder defaults in exact order with a period expand control", () => {
    render(
      createElement(DashboardTables, {
        view: "period",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard",
        employeeColumnKeys: DEFAULT_EMPLOYEE_DASHBOARD_COLUMNS,
        periodColumnKeys: DEFAULT_PERIOD_DASHBOARD_COLUMNS,
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    expect(
      screen.getAllByRole("columnheader").map((header) =>
        header.textContent?.replace(/\s+/g, " ").trim(),
      ),
    ).toEqual([
      "",
      "Period",
      "Total effective dollar inward (USD)",
      "Cashout rate",
      "Total Cash Inward (INR)",
      "Salary paid (INR)",
      "PF (INR)",
      "TDS (INR)",
      "Forex gain (INR)",
      "Operating margin (INR)",
      "Gross P&L (INR)",
      "In P/LExpenses (INR)",
      "In P/LAdvances (INR)",
      "Net P/L (INR)",
    ]);
    expect(screen.getByRole("button", { name: "Expand period April 2026" })).toBeTruthy();
  });

  it("keeps export links aligned with the live accounting checkboxes", () => {
    render(
      createElement(DashboardTables, {
        view: "period",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard",
        employeeColumnKeys: DEFAULT_EMPLOYEE_DASHBOARD_COLUMNS,
        periodColumnKeys: DEFAULT_PERIOD_DASHBOARD_COLUMNS,
        exportHrefs: {
          tableCsv: "/api/dashboard/export?format=csv",
          tablePdf: "/api/dashboard/export?format=pdf",
          companyCsv: "/api/dashboard/export?format=csv&scope=company",
          companyPdf: "/api/dashboard/export?format=pdf&scope=company",
        },
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    expect(
      screen.getAllByRole("link").map((link) => link.textContent?.trim()),
    ).toEqual(["Export CSV", "Export PDF"]);
    expect(screen.queryByRole("link", { name: "Export company CSV" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Export company PDF" })).toBeNull();

    const csvLink = screen.getByRole("link", { name: "Export CSV" });
    expect(csvLink.getAttribute("href")).toContain("includeAdvances=1");

    fireEvent.click(screen.getByRole("checkbox", { name: "Include advances in Net P/L" }));

    expect(csvLink.getAttribute("href")).toContain("includeExpenses=1");
    expect(csvLink.getAttribute("href")).toContain("includeAdvances=0");
    expect(csvLink.getAttribute("href")).toContain("includeReimbursements=1");
  });

  it("renders only selected monthly period columns plus the period column", () => {
    render(
      createElement(DashboardTables, {
        view: "period",
        periodType: "monthly",
        data: baseData,
        returnTo: "/dashboard",
        employeeColumnKeys: allEmployeeColumnKeys,
        periodColumnKeys: ["cashIn", "netPl"],
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    const headerTexts = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.replace(/\s+/g, " ").trim() ?? "");

    expect(headerTexts).toEqual(["", "Period", "Total Cash Inward (INR)", "Net P/L (INR)"]);
  });

  it("expands monthly period rows into company and visible column source breakdowns", () => {
    render(
      createElement(DashboardTables, {
        view: "period",
        periodType: "monthly",
        data: baseData,
        companyBreakdowns: [
          {
            companyId: "comp_1",
            companyName: "Acme India",
            data: baseData,
          },
        ],
        returnTo: "/dashboard",
        employeeColumnKeys: allEmployeeColumnKeys,
        periodColumnKeys: ["cashIn", "netPl"],
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand period April 2026" }));
    expect(screen.getByText("Acme India")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Expand company Acme India" }));
    expect(screen.getByText("Column breakdown")).toBeTruthy();

    const cashInBreakdownButton = screen.getByRole("button", {
      name: "Expand Total Cash Inward (INR) breakdown for Acme India",
    });
    const cashInBreakdownCell = cashInBreakdownButton.closest("td");
    fireEvent.click(cashInBreakdownButton);

    expect(cashInBreakdownCell).not.toBeNull();
    expect(
      within(cashInBreakdownCell as HTMLElement).getByText("Alice - INV-1 - April 2026"),
    ).toBeTruthy();
    expect(within(cashInBreakdownCell as HTMLElement).getByText("₹18,200.00")).toBeTruthy();
  });

  it("opens expenses as grouped rows before showing individual expense entries", () => {
    render(
      createElement(DashboardTables, {
        view: "period",
        periodType: "monthly",
        data: {
          ...baseData,
          periodRows: [
            {
              ...periodRows[0],
              expensesInrCents: 157_231_00,
            },
          ],
        },
        companyBreakdowns: [
          {
            companyId: "comp_1",
            companyName: "Acme India",
            data: {
              ...baseData,
              periodRows: [
                {
                  ...periodRows[0],
                  expensesInrCents: 157_231_00,
                },
              ],
            },
            expenses: expenseRows,
          },
        ],
        returnTo: "/dashboard",
        employeeColumnKeys: allEmployeeColumnKeys,
        periodColumnKeys: ["expenses"],
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand period April 2026" }));
    fireEvent.click(screen.getByRole("button", { name: "Expand company Acme India" }));

    const expensesBreakdownButton = screen.getByRole("button", {
      name: "Expand Expenses (INR) breakdown for Acme India",
    });
    const expensesBreakdownCell = expensesBreakdownButton.closest("td");
    fireEvent.click(expensesBreakdownButton);

    expect(expensesBreakdownCell).not.toBeNull();
    expect(
      within(expensesBreakdownCell as HTMLElement).getByText(
        "Beesetti Kiran Suresh's salary",
      ),
    ).toBeTruthy();
    expect(
      within(expensesBreakdownCell as HTMLElement).queryByText("₹63,334.00"),
    ).toBeNull();

    fireEvent.click(
      within(expensesBreakdownCell as HTMLElement).getByRole("button", {
        name: "Expand Beesetti Kiran Suresh's salary",
      }),
    );

    expect(
      within(expensesBreakdownCell as HTMLElement).getByText("₹63,334.00"),
    ).toBeTruthy();
    expect(
      within(expensesBreakdownCell as HTMLElement).getByText("₹93,897.00"),
    ).toBeTruthy();
  });

  it("opens advances as grouped rows before showing individual advance entries", () => {
    render(
      createElement(DashboardTables, {
        view: "period",
        periodType: "monthly",
        data: {
          ...baseData,
          periodRows: [
            {
              ...periodRows[0],
              advancesInrCents: 400_00,
            },
          ],
        },
        companyBreakdowns: [
          {
            companyId: "comp_1",
            companyName: "Acme India",
            data: {
              ...baseData,
              periodRows: [
                {
                  ...periodRows[0],
                  advancesInrCents: 400_00,
                },
              ],
            },
          },
        ],
        returnTo: "/dashboard",
        employeeColumnKeys: allEmployeeColumnKeys,
        periodColumnKeys: ["advances"],
        updateDashboardEmployeeCashFlowEntryAction: vi.fn(async () => {}),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand period April 2026" }));
    fireEvent.click(screen.getByRole("button", { name: "Expand company Acme India" }));

    const advancesBreakdownButton = screen.getByRole("button", {
      name: "Expand Advances (INR) breakdown for Acme India",
    });
    const advancesBreakdownCell = advancesBreakdownButton.closest("td");
    fireEvent.click(advancesBreakdownButton);

    expect(advancesBreakdownCell).not.toBeNull();
    expect(within(advancesBreakdownCell as HTMLElement).getByText("Alice")).toBeTruthy();
    expect(
      within(advancesBreakdownCell as HTMLElement).queryByText("INV-1 - April 2026"),
    ).toBeNull();

    fireEvent.click(
      within(advancesBreakdownCell as HTMLElement).getByRole("button", {
        name: "Expand Alice",
      }),
    );

    expect(
      within(advancesBreakdownCell as HTMLElement).getByText("INV-1 - April 2026"),
    ).toBeTruthy();
    expect(
      within(advancesBreakdownCell as HTMLElement).getAllByText("₹400.00").length,
    ).toBeGreaterThan(0);
  });
});
