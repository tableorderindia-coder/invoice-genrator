import { beforeEach, describe, expect, it, vi } from "vitest";

const listEmployeesMock = vi.fn();
const listInvoicesForCompanyMock = vi.fn();
const getInvoiceDetailMock = vi.fn();
const listEmployeeStatementInvoiceRowsMock = vi.fn();
const listEmployeeStatementMonthSummariesMock = vi.fn();

vi.mock("./store", () => ({
  listEmployees: listEmployeesMock,
  listInvoicesForCompany: listInvoicesForCompanyMock,
  getInvoiceDetail: getInvoiceDetailMock,
  listEmployeeStatementInvoiceRows: listEmployeeStatementInvoiceRowsMock,
  listEmployeeStatementMonthSummaries: listEmployeeStatementMonthSummariesMock,
}));

describe("employee statement loading", () => {
  beforeEach(() => {
    listEmployeesMock.mockReset();
    listInvoicesForCompanyMock.mockReset();
    getInvoiceDetailMock.mockReset();
    listEmployeeStatementInvoiceRowsMock.mockReset();
    listEmployeeStatementMonthSummariesMock.mockReset();
  });

  it("builds invoice rows from invoice detail and overlays saved month values", async () => {
    listEmployeesMock.mockResolvedValue([
      {
        id: "emp_1",
        companyId: "comp_1",
        fullName: "Asha",
        designation: "Engineer",
        defaultTeam: "Team A",
        billingRateUsdCents: 10000,
        payoutMonthlyUsdCents: 250000,
        hrsPerWeek: 40,
        activeFrom: "2026-01-01",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    listInvoicesForCompanyMock.mockResolvedValue([
      {
        id: "inv_draft",
        companyId: "comp_1",
        month: 4,
        year: 2026,
        invoiceNumber: "INV-DRAFT",
        status: "draft",
      },
      {
        id: "inv_1",
        companyId: "comp_1",
        month: 4,
        year: 2026,
        invoiceNumber: "INV-001",
        status: "generated",
      },
    ]);
    getInvoiceDetailMock.mockImplementation(async (invoiceId: string) => ({
      invoice: {
        id: invoiceId,
        companyId: "comp_1",
        month: 4,
        year: 2026,
        invoiceNumber: invoiceId === "inv_draft" ? "INV-DRAFT" : "INV-001",
        status: invoiceId === "inv_draft" ? "draft" : "generated",
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
          invoiceId,
          teamName: "Team A",
          sortOrder: 0,
          lineItems: [
            {
              id: `line_${invoiceId}`,
              invoiceTeamId: "team_1",
              employeeId: "emp_1",
              employeeNameSnapshot: "Asha",
              designationSnapshot: "Engineer",
              teamNameSnapshot: "Team A",
              billingRateUsdCents: 10000,
              payoutMonthlyUsdCentsSnapshot: 250000,
              hrsPerWeek: 40,
              daysWorked: 30,
              billedTotalUsdCents: invoiceId === "inv_draft" ? 999999 : 100000,
              payoutTotalUsdCents: 0,
              profitTotalUsdCents: 0,
            },
          ],
        },
      ],
      adjustments:
        invoiceId === "inv_draft"
          ? []
          : [
              {
                id: "adj_1",
                invoiceId: "inv_1",
                type: "onboarding",
                label: "Joining",
                employeeName: "Asha",
                amountUsdCents: 10000,
                sortOrder: 0,
              },
              {
                id: "adj_2",
                invoiceId: "inv_1",
                type: "reimbursement",
                label: "Laptop",
                employeeName: "Asha",
                amountUsdCents: 5000,
                sortOrder: 1,
              },
              {
                id: "adj_3",
                invoiceId: "inv_1",
                type: "offboarding",
                label: "Recovery",
                employeeName: "Asha",
                amountUsdCents: -2000,
                sortOrder: 2,
              },
            ],
    }));
    listEmployeeStatementInvoiceRowsMock.mockResolvedValue([]);
    listEmployeeStatementMonthSummariesMock.mockResolvedValue([
      {
        employeeId: "emp_1",
        monthKey: "2026-04",
        monthLabel: "April 2026",
        effectiveDollarInwardUsdCents: 120000,
        monthlyDollarPaidUsdCents: 260000,
      },
    ]);

    const { listEmployeeStatementSections } = await import("./employee-statements");
    const sections = await listEmployeeStatementSections({
      companyId: "comp_1",
      startMonth: "2026-04",
      endMonth: "2026-04",
    });

    expect(sections).toHaveLength(1);
    expect(sections[0]?.months[0]?.rows[0]).toMatchObject({
      invoiceId: "inv_1",
      invoiceNumber: "INV-001",
      dollarInwardUsdCents: 100000,
      onboardingAdvanceUsdCents: 10000,
      reimbursementUsdCents: 5000,
      reimbursementLabelsText: "Laptop",
      offboardingDeductionUsdCents: 2000,
    });
    expect(sections[0]?.months[0]?.effectiveDollarInwardUsdCents).toBe(120000);
    expect(sections[0]?.months[0]?.monthlyDollarPaidUsdCents).toBe(260000);
    expect(sections[0]?.months[0]?.rows).toHaveLength(1);
    expect(getInvoiceDetailMock).toHaveBeenCalledTimes(1);
  });
});
