import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
const updateDashboardEmployeeCashFlowEntryMock = vi.fn();
const replaceInvoicePaymentEmployeeEntriesMock = vi.fn();
const upsertInvoicePaymentMock = vi.fn();
const upsertEmployeeStatementSectionMock = vi.fn();
const updateCompanyMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("./store", () => ({
  addInvoiceAdjustment: vi.fn(),
  addInvoiceLineItem: vi.fn(),
  assignEmployeeToInvoiceTeam: vi.fn(),
  addInvoiceTeam: vi.fn(),
  cashOutInvoice: vi.fn(),
  createCompany: vi.fn(),
  createEmployee: vi.fn(),
  createInvoiceDraft: vi.fn(),
  createTeam: vi.fn(),
  deleteInvoice: vi.fn(),
  deleteInvoiceAdjustment: vi.fn(),
  deleteInvoiceLineItem: vi.fn(),
  deleteInvoiceTeam: vi.fn(),
  updateInvoiceLineItem: vi.fn(),
  updateInvoiceLineItemTotal: vi.fn(),
  updateInvoiceTeamTotal: vi.fn(),
  updateInvoiceGrandTotal: vi.fn(),
  updateInvoiceHeader: vi.fn(),
  updateInvoiceAdjustmentAmount: vi.fn(),
  updateInvoiceNote: vi.fn(),
  updateInvoiceStatus: vi.fn(),
  updateCompany: updateCompanyMock,
  updateEmployee: vi.fn(),
  addEmployeePayoutRow: vi.fn(),
  updateEmployeePayout: vi.fn(),
  markEmployeePayoutPaid: vi.fn(),
  removeEmployeePayoutRow: vi.fn(),
  upsertDashboardExpense: vi.fn(),
  upsertEmployeeStatementSection: upsertEmployeeStatementSectionMock,
}));

vi.mock("./employee-cash-flow-store", () => ({
  deleteSavedEmployeeCashFlowEntry: vi.fn(),
  replaceInvoicePaymentEmployeeEntries: replaceInvoicePaymentEmployeeEntriesMock,
  updateSavedEmployeeCashFlowEntry: vi.fn(),
  updateDashboardEmployeeCashFlowEntry: updateDashboardEmployeeCashFlowEntryMock,
  upsertEmployeeSalaryPayment: vi.fn(),
  upsertInvoicePayment: upsertInvoicePaymentMock,
}));

describe("updateDashboardEmployeeCashFlowEntryAction", () => {
  beforeEach(() => {
    revalidatePathMock.mockReset();
    redirectMock.mockClear();
    updateDashboardEmployeeCashFlowEntryMock.mockReset();
    updateDashboardEmployeeCashFlowEntryMock.mockResolvedValue(undefined);
    replaceInvoicePaymentEmployeeEntriesMock.mockReset();
    upsertInvoicePaymentMock.mockReset();
    upsertInvoicePaymentMock.mockResolvedValue("pay_1");
    upsertEmployeeStatementSectionMock.mockReset();
    upsertEmployeeStatementSectionMock.mockResolvedValue(undefined);
    updateCompanyMock.mockReset();
    updateCompanyMock.mockResolvedValue(undefined);
  });

  it("passes days worked through to the dashboard cash-flow update", async () => {
    const { updateDashboardEmployeeCashFlowEntryAction } = await import("./actions");
    const formData = new FormData();
    formData.set("payoutId", "cash_1");
    formData.set("returnTo", "/dashboard?companyId=comp_1&view=employee");
    formData.set("daysWorked", "24");
    formData.set("dollarInwardUsd", "1250");
    formData.set("onboardingAdvanceUsd", "150");
    formData.set("reimbursementUsd", "200");
    formData.set("reimbursementLabelsText", "Laptop");
    formData.set("appraisalAdvanceUsd", "75");
    formData.set("offboardingDeductionUsd", "25");
    formData.set("employeeMonthlyUsd", "900");
    formData.set("cashoutUsdInrRate", "83.45");
    formData.set("paidUsdInrRate", "82.75");
    formData.set("pfInr", "100");
    formData.set("tdsInr", "50");
    formData.set("actualPaidInr", "180000");

    await expect(updateDashboardEmployeeCashFlowEntryAction(formData)).rejects.toThrow(
      "REDIRECT:/dashboard?companyId=comp_1&view=employee&flashStatus=success&flashMessage=Dashboard%20cash%20flow%20row%20updated.",
    );

    expect(updateDashboardEmployeeCashFlowEntryMock).toHaveBeenCalledWith({
      entryId: "cash_1",
      daysWorked: 24,
      dollarInwardUsdCents: 125000,
      onboardingAdvanceUsdCents: 15000,
      reimbursementUsdCents: 20000,
      reimbursementLabelsText: "Laptop",
      appraisalAdvanceUsdCents: 7500,
      offboardingDeductionUsdCents: 2500,
      employeeMonthlyUsdCents: 90000,
      cashoutUsdInrRate: 83.45,
      paidUsdInrRate: 82.75,
      pfInrCents: 10000,
      tdsInrCents: 5000,
      actualPaidInrCents: 18000000,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/employee-cash-flow");
  });

  it("passes manual actual paid values through compose cash-flow saves", async () => {
    const { saveInvoicePaymentEmployeeEntriesAction } = await import("./actions");
    const formData = new FormData();
    formData.set("companyId", "comp_1");
    formData.set("paymentMonth", "2026-04");
    formData.set("returnTo", "/employee-cash-flow?companyId=comp_1&paymentMonth=2026-04");
    formData.set(
      "entriesJson",
      JSON.stringify([
        {
          clientBatchId: "batch_1",
          invoicePaymentId: undefined,
          batchLabel: "INV-1",
          invoiceId: "inv_1",
          invoiceNumber: "INV-1",
          employeeId: "emp_1",
          employeeNameSnapshot: "Asha",
          daysWorked: 10,
          daysInMonth: 30,
          monthlyPaidUsdCents: 300000,
          baseDollarInwardUsdCents: 0,
          onboardingAdvanceUsdCents: 0,
          reimbursementUsdCents: 0,
          reimbursementLabelsText: "",
          appraisalAdvanceUsdCents: 0,
          offboardingDeductionUsdCents: 0,
          cashoutUsdInrRate: 84,
          paidUsdInrRate: 82,
          pfInrCents: 0,
          tdsInrCents: 0,
          actualPaidInrCents: 950000,
          fxCommissionInrCents: 0,
          totalCommissionUsdCents: 0,
          commissionEarnedInrCents: 0,
          grossEarningsInrCents: 0,
          isNonInvoiceEmployee: false,
          isPaid: false,
          notes: "",
        },
      ]),
    );

    await expect(saveInvoicePaymentEmployeeEntriesAction(formData)).rejects.toThrow(
      "REDIRECT:/employee-cash-flow?companyId=comp_1&paymentMonth=2026-04&flashStatus=success&flashMessage=Employee%20cash%20flow%20rows%20saved.",
    );

    expect(replaceInvoicePaymentEmployeeEntriesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entries: [
          expect.objectContaining({
            employeeId: "emp_1",
            actualPaidInrCents: 950000,
          }),
        ],
      }),
    );
  });

  it("passes statement-only invoice rows and month summaries through employee statement saves", async () => {
    const { saveEmployeeStatementAction } = await import("./actions");
    const formData = new FormData();
    formData.set("returnTo", "/employee-statements?companyId=comp_1");
    formData.set(
      "statementJson",
      JSON.stringify({
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
      }),
    );

    await expect(saveEmployeeStatementAction(formData)).rejects.toThrow(
      "REDIRECT:/employee-statements?companyId=comp_1&flashStatus=success&flashMessage=Employee%20statement%20saved.",
    );

    expect(upsertEmployeeStatementSectionMock).toHaveBeenCalledWith({
      employeeId: "emp_1",
      invoiceRows: [
        expect.objectContaining({
          invoiceId: "inv_1",
          dollarInwardUsdCents: 120000,
        }),
      ],
      monthSummaries: [
        expect.objectContaining({
          monthKey: "2026-04",
          monthlyDollarPaidUsdCents: 250000,
        }),
      ],
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/employee-statements");
  });

  it("updates company details through the company edit action", async () => {
    const { updateCompanyAction } = await import("./actions");
    const formData = new FormData();
    formData.set("companyId", "comp_1");
    formData.set("name", "Acme Inc.");
    formData.set("billingAddress", "123 Market Street");
    formData.set("defaultNote", "Net 15");

    await expect(updateCompanyAction(formData)).rejects.toThrow(
      "REDIRECT:/companies",
    );

    expect(updateCompanyMock).toHaveBeenCalledWith({
      companyId: "comp_1",
      name: "Acme Inc.",
      billingAddress: "123 Market Street",
      defaultNote: "Net 15",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/companies");
  });
});
