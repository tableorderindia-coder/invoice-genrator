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
const createEmployeeMock = vi.fn();
const updateEmployeeMock = vi.fn();
const upsertFounderWithdrawalsMock = vi.fn();
const saveMonthlyPayrollRowsMock = vi.fn();
const requireCompanyPageEditAccessMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/server", () => ({
  requirePageEditAccess: vi.fn().mockResolvedValue(undefined),
  requireCompanyPageEditAccess: requireCompanyPageEditAccessMock,
}));

vi.mock("./store", () => ({
  addInvoiceAdjustment: vi.fn(),
  addInvoiceLineItem: vi.fn(),
  assignEmployeeToInvoiceTeam: vi.fn(),
  addInvoiceTeam: vi.fn(),
  cashOutInvoice: vi.fn(),
  createCompany: vi.fn(),
  createEmployee: createEmployeeMock,
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
  updateEmployee: updateEmployeeMock,
  upsertDashboardExpense: vi.fn(),
  upsertEmployeeStatementSection: upsertEmployeeStatementSectionMock,
  upsertFounderWithdrawals: upsertFounderWithdrawalsMock,
}));

vi.mock("./employee-cash-flow-store", () => ({
  deleteSavedEmployeeCashFlowEntry: vi.fn(),
  replaceInvoicePaymentEmployeeEntries: replaceInvoicePaymentEmployeeEntriesMock,
  updateSavedEmployeeCashFlowEntry: vi.fn(),
  updateDashboardEmployeeCashFlowEntry: updateDashboardEmployeeCashFlowEntryMock,
  upsertInvoicePayment: upsertInvoicePaymentMock,
}));

vi.mock("./payroll-store", () => ({
  saveMonthlyPayrollRows: saveMonthlyPayrollRowsMock,
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
    createEmployeeMock.mockReset();
    createEmployeeMock.mockResolvedValue(undefined);
    updateEmployeeMock.mockReset();
    updateEmployeeMock.mockResolvedValue(undefined);
    upsertFounderWithdrawalsMock.mockReset();
    upsertFounderWithdrawalsMock.mockResolvedValue(undefined);
    saveMonthlyPayrollRowsMock.mockReset();
    saveMonthlyPayrollRowsMock.mockResolvedValue(undefined);
    requireCompanyPageEditAccessMock.mockReset();
    requireCompanyPageEditAccessMock.mockResolvedValue({
      profile: { id: "admin_1", role: "admin" },
    });
  });

  it("saves monthly payroll rows through the company-scoped Salary permission gate", async () => {
    const { saveMonthlyPayrollRowsAction } = await import("./actions");
    const formData = new FormData();
    formData.set("companyId", "comp_1");
    formData.set("month", "2026-07");
    formData.set("status", "verified");
    formData.set("updateEmployeeMaster", "true");
    formData.set("returnTo", "/salary?companyId=comp_1&month=2026-07");
    formData.set(
      "rowsJson",
      JSON.stringify([
        {
          employeeId: "emp_1",
          employeeName: "Asha",
          paidUsdInrRate: 83,
          salaryPaidInrCents: 20000000,
          pfInrCents: 180000,
          tdsInrCents: 250000,
          paidStatus: true,
          paidDate: "2026-07-31",
          notes: "Verified",
          overrideNote: "Final admin override",
        },
      ]),
    );

    await expect(saveMonthlyPayrollRowsAction(formData)).rejects.toThrow(
      "REDIRECT:/salary?companyId=comp_1&month=2026-07&flashStatus=success&flashMessage=Salary%20month%20saved.",
    );

    expect(requireCompanyPageEditAccessMock).toHaveBeenCalledWith("salary", "comp_1");
    expect(saveMonthlyPayrollRowsMock).toHaveBeenCalledWith({
      companyId: "comp_1",
      month: "2026-07",
      status: "verified",
      updateEmployeeMaster: true,
      actorUserId: "admin_1",
      rows: [
        expect.objectContaining({
          employeeId: "emp_1",
          salaryPaidInrCents: 20000000,
          overrideNote: "Final admin override",
        }),
      ],
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/salary");
    expect(revalidatePathMock).toHaveBeenCalledWith("/employee-cash-flow");
  });

  it("passes employee cash-flow defaults through employee creation", async () => {
    const { createEmployeeAction } = await import("./actions");
    const formData = new FormData();
    formData.set("companyId", "comp_1");
    formData.set("fullName", "Asha Rao");
    formData.set("designation", "Engineer");
    formData.set("defaultTeam", "Data");
    formData.set("billingRateUsd", "25");
    formData.set("hrsPerWeek", "40");
    formData.set("activeFrom", "2026-04-01");
    formData.set("defaultPaidUsdInrRate", "82.75");
    formData.set("defaultActualPaidInr", "210000");
    formData.set("defaultPfInr", "1800");
    formData.set("defaultTdsInr", "2500");

    await expect(createEmployeeAction(formData)).rejects.toThrow(
      "REDIRECT:/employees",
    );

    expect(createEmployeeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPaidUsdInrRate: 82.75,
        defaultActualPaidInrCents: 21000000,
        defaultPfInrCents: 180000,
        defaultTdsInrCents: 250000,
      }),
    );
  });

  it("passes employee cash-flow defaults through employee updates", async () => {
    const { updateEmployeeAction } = await import("./actions");
    const formData = new FormData();
    formData.set("employeeId", "emp_1");
    formData.set("companyId", "comp_1");
    formData.set("fullName", "Asha Rao");
    formData.set("designation", "Engineer");
    formData.set("defaultTeam", "Data");
    formData.set("billingRateUsd", "25");
    formData.set("hrsPerWeek", "40");
    formData.set("activeFrom", "2026-04-01");
    formData.set("isActive", "true");
    formData.set("defaultPaidUsdInrRate", "81.5");
    formData.set("defaultActualPaidInr", "190000");
    formData.set("defaultPfInr", "1600");
    formData.set("defaultTdsInr", "2200");

    await expect(updateEmployeeAction(formData)).rejects.toThrow(
      "REDIRECT:/employees",
    );

    expect(updateEmployeeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPaidUsdInrRate: 81.5,
        defaultActualPaidInrCents: 19000000,
        defaultPfInrCents: 160000,
        defaultTdsInrCents: 220000,
      }),
    );
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
    expect(upsertInvoicePaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentDate: "2026-04-25",
      }),
    );
  });

  it("rejects employee cash flow saves when the entries payload is missing", async () => {
    const { saveInvoicePaymentEmployeeEntriesAction } = await import("./actions");
    const formData = new FormData();
    formData.set("companyId", "comp_1");
    formData.set("paymentMonth", "2026-04");
    formData.set("returnTo", "/employee-cash-flow?companyId=comp_1&paymentMonth=2026-04");

    await expect(saveInvoicePaymentEmployeeEntriesAction(formData)).rejects.toThrow(
      "REDIRECT:/employee-cash-flow?companyId=comp_1&paymentMonth=2026-04&flashStatus=error&flashMessage=Employee%20cash%20flow%20rows%20payload%20is%20required.",
    );

    expect(replaceInvoicePaymentEmployeeEntriesMock).not.toHaveBeenCalled();
    expect(upsertInvoicePaymentMock).not.toHaveBeenCalled();
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
          appraisalAdvanceUsdCents: 7000,
          offboardingDeductionUsdCents: 1000,
        },
        ],
        monthSummaries: [
          {
            employeeId: "emp_1",
            monthKey: "2026-04",
            monthLabel: "April 2026",
            effectiveDollarInwardUsdCents: 134000,
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
          appraisalAdvanceUsdCents: 7000,
        }),
      ],
      monthSummaries: [
        expect.objectContaining({
          monthKey: "2026-04",
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

  it("saves selected founder withdrawal rows", async () => {
    const { saveFounderWithdrawalsAction } = await import("./actions");
    const formData = new FormData();
    formData.set("companyId", "comp_1");
    formData.set("returnTo", "/founders-balance?companyId=comp_1");
    formData.set("rowKey", "2026-01");
    formData.set("rowKey", "2026-02");
    formData.set("selectedRow", "2026-02");
    formData.set("withdrawal__2026-01__nirbhay_kumar_giri", "10");
    formData.set("withdrawal__2026-01__pawan_kumar_beesetti", "20");
    formData.set("withdrawal__2026-01__vishal_savaliya", "30");
    formData.set("withdrawal__2026-02__nirbhay_kumar_giri", "100.50");
    formData.set("withdrawal__2026-02__pawan_kumar_beesetti", "200");
    formData.set("withdrawal__2026-02__vishal_savaliya", "300");

    await expect(saveFounderWithdrawalsAction(formData)).rejects.toThrow(
      "REDIRECT:/founders-balance?companyId=comp_1&flashStatus=success&flashMessage=Founder%20withdrawals%20updated.",
    );

    expect(upsertFounderWithdrawalsMock).toHaveBeenCalledWith({
      companyId: "comp_1",
      rows: [
        {
          year: 2026,
          month: 2,
          withdrawals: {
            nirbhay_kumar_giri: 10050,
            pawan_kumar_beesetti: 20000,
            vishal_savaliya: 30000,
          },
        },
      ],
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/founders-balance");
  });

  it("saves all-company founder withdrawals with a null company id", async () => {
    const { saveFounderWithdrawalsAction } = await import("./actions");
    const formData = new FormData();
    formData.set("companyId", "all");
    formData.set("returnTo", "/founders-balance?companyId=all");
    formData.set("rowKey", "2026-01");
    formData.set("selectedRow", "2026-01");
    formData.set("withdrawal__2026-01__nirbhay_kumar_giri", "1");

    await expect(saveFounderWithdrawalsAction(formData)).rejects.toThrow(
      "REDIRECT:/founders-balance?companyId=all&flashStatus=success&flashMessage=Founder%20withdrawals%20updated.",
    );

    expect(upsertFounderWithdrawalsMock).toHaveBeenCalledWith({
      companyId: null,
      rows: [
        {
          year: 2026,
          month: 1,
          withdrawals: {
            nirbhay_kumar_giri: 100,
            pawan_kumar_beesetti: 0,
            vishal_savaliya: 0,
          },
        },
      ],
    });
  });

  it("rejects negative founder withdrawals", async () => {
    const { saveFounderWithdrawalsAction } = await import("./actions");
    const formData = new FormData();
    formData.set("companyId", "all");
    formData.set("returnTo", "/founders-balance?companyId=all");
    formData.set("rowKey", "2026-01");
    formData.set("selectedRow", "2026-01");
    formData.set("withdrawal__2026-01__nirbhay_kumar_giri", "-1");

    await expect(saveFounderWithdrawalsAction(formData)).rejects.toThrow(
      "REDIRECT:/founders-balance?companyId=all&flashStatus=error&flashMessage=Withdrawal%20amounts%20cannot%20be%20negative.",
    );

    expect(upsertFounderWithdrawalsMock).not.toHaveBeenCalled();
  });
});
