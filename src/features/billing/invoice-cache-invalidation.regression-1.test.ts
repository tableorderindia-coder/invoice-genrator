import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression: ISSUE-003 - invoice status writes left persisted portal snapshots stale
// Found by /qa on 2026-08-03
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-08-03.md

const revalidatePathMock = vi.fn();
const revalidateTagMock = vi.fn();
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
const updateInvoiceStatusMock = vi.fn();
const cashOutInvoiceMock = vi.fn();
const getInvoiceCompanyIdMock = vi.fn();
const rebuildPnSummariesForInvoiceMock = vi.fn();
const invalidatePortalSnapshotsForBillingMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

vi.mock("@/lib/auth/server", () => ({
  requirePageEditAccess: vi.fn().mockResolvedValue(undefined),
  requireCompanyPageEditAccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./store", () => ({
  addInvoiceAdjustment: vi.fn(),
  assignEmployeeToInvoiceTeam: vi.fn(),
  addInvoiceTeam: vi.fn(),
  cashOutInvoice: cashOutInvoiceMock,
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
  updateInvoiceStatus: updateInvoiceStatusMock,
  updateCompany: vi.fn(),
  updateEmployee: vi.fn(),
  upsertCompanyExpense: vi.fn(),
  upsertEmployeeStatementSection: vi.fn(),
  upsertFounderWithdrawals: vi.fn(),
}));

vi.mock("./employee-cash-flow-store", () => ({
  deleteSavedEmployeeCashFlowEntry: vi.fn(),
  replaceInvoicePaymentEmployeeEntries: vi.fn(),
  updateSavedEmployeeCashFlowEntry: vi.fn(),
  updateDashboardEmployeeCashFlowEntry: vi.fn(),
  upsertInvoicePayment: vi.fn(),
}));

vi.mock("./payroll-store", () => ({ saveMonthlyPayrollRows: vi.fn() }));
vi.mock("./payslip-store", () => ({
  prepareAndSavePayslips: vi.fn(),
  savePayslipRecord: vi.fn(),
}));

vi.mock("./pn-summary-store", () => ({
  getCompanyExpenseCompanyId: vi.fn(),
  getEmployeeCashFlowEntryCompanyId: vi.fn(),
  getInvoiceCompanyId: getInvoiceCompanyIdMock,
  rebuildPnSummariesForCompany: vi.fn(),
  rebuildPnSummariesForInvoice: rebuildPnSummariesForInvoiceMock,
}));

vi.mock("./portal-snapshot-cache", () => ({
  invalidatePortalSnapshotsForBilling: invalidatePortalSnapshotsForBillingMock,
}));

describe("invoice mutation cache invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInvoiceCompanyIdMock.mockResolvedValue("comp_1");
    updateInvoiceStatusMock.mockResolvedValue(undefined);
    cashOutInvoiceMock.mockResolvedValue(undefined);
    rebuildPnSummariesForInvoiceMock.mockResolvedValue(undefined);
    invalidatePortalSnapshotsForBillingMock.mockResolvedValue(undefined);
  });

  it("invalidates the company invoice snapshot after a status update", async () => {
    const { updateInvoiceStatusAction } = await import("./actions");
    const formData = new FormData();
    formData.set("invoiceId", "inv_1");
    formData.set("status", "sent");
    formData.set("returnTo", "/invoices?companyIds=comp_1");

    await expect(updateInvoiceStatusAction(formData)).rejects.toThrow("REDIRECT:");

    expect(updateInvoiceStatusMock).toHaveBeenCalledWith("inv_1", "sent");
    expect(invalidatePortalSnapshotsForBillingMock).toHaveBeenCalledWith({
      type: "invoice",
      companyId: "comp_1",
    });
  });

  it("invalidates the company invoice snapshot after cashout", async () => {
    const { cashOutInvoiceAction } = await import("./actions");
    const formData = new FormData();
    formData.set("invoiceId", "inv_1");
    formData.set("dollarInboundUsd", "1000");
    formData.set("usdInrRate", "86.1");
    formData.set("returnTo", "/cashout?companyIds=comp_1");

    await expect(cashOutInvoiceAction(formData)).rejects.toThrow("REDIRECT:");

    expect(cashOutInvoiceMock).toHaveBeenCalledOnce();
    expect(invalidatePortalSnapshotsForBillingMock).toHaveBeenCalledWith({
      type: "invoice",
      companyId: "comp_1",
    });
  });
});
