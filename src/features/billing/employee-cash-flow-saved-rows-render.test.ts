// @vitest-environment jsdom

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { inputClass } from "../../../app/_components/field";

vi.mock("../../../src/features/billing/actions", () => ({
  deleteSavedEmployeeCashFlowEntryAction: vi.fn(),
  updateSavedEmployeeCashFlowEntryAction: vi.fn(),
}));

import EmployeeCashFlowSavedRows from "../../../app/employee-cash-flow/_components/employee-cash-flow-saved-rows";

describe("employee cash flow saved rows rendering", () => {
  it("keeps the visible table column count aligned with the rendered cells", () => {
    render(
      createElement(EmployeeCashFlowSavedRows, {
        returnTo: "/employee-cash-flow?companyId=comp_1",
        initialRows: [
          {
            id: "row_1",
            employeeId: "emp_1",
            companyId: "comp_1",
            paymentMonth: "2026-04",
            employeeNameSnapshot: "Asha",
            invoiceId: "inv_1",
            invoiceNumber: "2026/004",
            clientBatchId: "batch_1",
            daysWorked: 10,
            daysInMonth: 30,
            baseDollarInwardUsdCents: 0,
            onboardingAdvanceUsdCents: 0,
            reimbursementUsdCents: 0,
            reimbursementLabelsText: "",
            appraisalAdvanceUsdCents: 0,
            offboardingDeductionUsdCents: 0,
            cashoutUsdInrRate: 84,
            paidUsdInrRate: 80,
            monthlyPaidInrCents: 30_000,
            actualPaidInrCents: 9_999,
            pfInrCents: 0,
            tdsInrCents: 0,
            salaryPaidInrCents: 9_999,
            fxCommissionInrCents: 0,
            totalCommissionUsdCents: 0,
            commissionEarnedInrCents: 0,
            grossEarningsInrCents: 0,
            isNonInvoiceEmployee: true,
            isPaid: false,
            notes: "",
          },
        ],
      }),
    );

    const headerCells = screen.getAllByRole("columnheader");
    expect(headerCells).toHaveLength(18);
    expect(
      screen.getByRole("columnheader", { name: "Final effective inward $" }),
    ).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Monthly paid INR" })).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Actual paid INR" })).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Salary paid INR" })).not.toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Paid date" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Paid status" })).toBeNull();
    expect(screen.queryByText("Mark as paid")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Total paid INR" })).toBeNull();

    const bodyRow = screen.getAllByRole("row")[1];
    expect(bodyRow.querySelectorAll("td")).toHaveLength(18);
  });

  it("renders cramped saved-row editable fields with explicit minimum widths", () => {
    render(
      createElement(EmployeeCashFlowSavedRows, {
        returnTo: "/employee-cash-flow?companyId=comp_1",
        initialRows: [
          {
            id: "row_1",
            employeeId: "emp_1",
            companyId: "comp_1",
            paymentMonth: "2026-04",
            employeeNameSnapshot: "Asha",
            invoiceId: "inv_1",
            invoiceNumber: "2026/004",
            clientBatchId: "batch_1",
            daysWorked: 10,
            daysInMonth: 30,
            baseDollarInwardUsdCents: 0,
            onboardingAdvanceUsdCents: 0,
            reimbursementUsdCents: 0,
            reimbursementLabelsText: "Laptop reimbursement and travel support",
            appraisalAdvanceUsdCents: 0,
            offboardingDeductionUsdCents: 0,
            cashoutUsdInrRate: 84,
            paidUsdInrRate: 80,
            monthlyPaidInrCents: 30_000,
            actualPaidInrCents: 9_999,
            pfInrCents: 0,
            tdsInrCents: 0,
            salaryPaidInrCents: 9_999,
            fxCommissionInrCents: 0,
            totalCommissionUsdCents: 0,
            commissionEarnedInrCents: 0,
            grossEarningsInrCents: 0,
            isNonInvoiceEmployee: true,
            isPaid: false,
            notes: "Prefilled note text should remain fully visible",
          },
        ],
      }),
    );

    expect(inputClass).toContain("min-w-0");
    expect(inputClass).toContain("leading-5");
    expect(
      screen.getByDisplayValue("Laptop reimbursement and travel support").className,
    ).toContain("min-w-[14rem]");
    expect(
      screen.getByDisplayValue("Prefilled note text should remain fully visible").className,
    ).toContain("min-w-[16rem]");
  });

  it("renders saved-row rate inputs without unnecessary trailing decimals", () => {
    render(
      createElement(EmployeeCashFlowSavedRows, {
        returnTo: "/employee-cash-flow?companyId=comp_1",
        initialRows: [
          {
            id: "row_1",
            employeeId: "emp_1",
            companyId: "comp_1",
            paymentMonth: "2026-04",
            employeeNameSnapshot: "Asha",
            invoiceId: "inv_1",
            invoiceNumber: "2026/004",
            clientBatchId: "batch_1",
            daysWorked: 10,
            daysInMonth: 30,
            baseDollarInwardUsdCents: 0,
            onboardingAdvanceUsdCents: 0,
            reimbursementUsdCents: 0,
            reimbursementLabelsText: "",
            appraisalAdvanceUsdCents: 0,
            offboardingDeductionUsdCents: 0,
            cashoutUsdInrRate: 87.87,
            paidUsdInrRate: 86,
            monthlyPaidInrCents: 30_000,
            actualPaidInrCents: 9_999,
            pfInrCents: 0,
            tdsInrCents: 0,
            salaryPaidInrCents: 9_999,
            fxCommissionInrCents: 0,
            totalCommissionUsdCents: 0,
            commissionEarnedInrCents: 0,
            grossEarningsInrCents: 0,
            isNonInvoiceEmployee: true,
            isPaid: false,
            notes: "",
          },
        ],
      }),
    );

    expect(screen.getByDisplayValue("87.87")).not.toBeNull();
    expect(screen.getByDisplayValue("86")).not.toBeNull();
    expect(screen.queryByDisplayValue("87.8700")).toBeNull();
    expect(screen.queryByDisplayValue("86.0000")).toBeNull();
  });
});
