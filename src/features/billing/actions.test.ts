import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
const updateDashboardEmployeeCashFlowEntryMock = vi.fn();

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
  updateEmployee: vi.fn(),
  addEmployeePayoutRow: vi.fn(),
  updateEmployeePayout: vi.fn(),
  markEmployeePayoutPaid: vi.fn(),
  removeEmployeePayoutRow: vi.fn(),
  upsertDashboardExpense: vi.fn(),
}));

vi.mock("./employee-cash-flow-store", () => ({
  deleteSavedEmployeeCashFlowEntry: vi.fn(),
  replaceInvoicePaymentEmployeeEntries: vi.fn(),
  updateSavedEmployeeCashFlowEntry: vi.fn(),
  updateDashboardEmployeeCashFlowEntry: updateDashboardEmployeeCashFlowEntryMock,
  upsertEmployeeSalaryPayment: vi.fn(),
  upsertInvoicePayment: vi.fn(),
}));

describe("updateDashboardEmployeeCashFlowEntryAction", () => {
  beforeEach(() => {
    revalidatePathMock.mockReset();
    redirectMock.mockClear();
    updateDashboardEmployeeCashFlowEntryMock.mockReset();
    updateDashboardEmployeeCashFlowEntryMock.mockResolvedValue(undefined);
  });

  it("passes days worked through to the dashboard cash-flow update", async () => {
    const { updateDashboardEmployeeCashFlowEntryAction } = await import("./actions");
    const formData = new FormData();
    formData.set("payoutId", "cash_1");
    formData.set("returnTo", "/dashboard?companyId=comp_1&view=employee");
    formData.set("daysWorked", "24");
    formData.set("dollarInwardUsd", "1250");
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
});
