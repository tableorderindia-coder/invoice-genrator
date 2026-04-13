import { describe, expect, it } from "vitest";

import {
  buildAddedEmployeeCashFlowEntry,
  buildEmployeeCashFlowInvoiceOptionsInput,
  getDaysInMonthFromMonthKey,
  removeEntryFromSelections,
  resolveEmployeeToAddSelection,
  resolveEmployeeCashFlowInvoiceIds,
  removeEmployeeFromSelections,
  resolveEmployeeCashFlowMonthKey,
} from "./employee-cash-flow-page-state";

describe("employee cash flow page state", () => {
  it("keeps payment month separate from invoice option filtering", () => {
    expect(buildEmployeeCashFlowInvoiceOptionsInput("company_1")).toEqual({
      companyId: "company_1",
    });
  });

  it("does not add month or year constraints to invoice option filtering", () => {
    expect(buildEmployeeCashFlowInvoiceOptionsInput("company_1")).not.toHaveProperty("month");
    expect(buildEmployeeCashFlowInvoiceOptionsInput("company_1")).not.toHaveProperty("year");
  });

  it("resolves legacy month/year search params into a payment month key", () => {
    expect(
      resolveEmployeeCashFlowMonthKey("4", "2026", new Date("2026-06-01T00:00:00Z")),
    ).toBe("2026-04");
  });

  it("falls back to the current month when no payment month is provided", () => {
    expect(
      resolveEmployeeCashFlowMonthKey(undefined, undefined, new Date("2026-06-01T00:00:00Z")),
    ).toBe("2026-06");
  });

  it("derives the actual number of days from a payment month key", () => {
    expect(getDaysInMonthFromMonthKey("2026-02")).toBe(28);
    expect(getDaysInMonthFromMonthKey("2026-04")).toBe(30);
    expect(getDaysInMonthFromMonthKey("2026-05")).toBe(31);
  });

  it("prefills added employee rows from the selected cashed-out invoice", () => {
    expect(
      buildAddedEmployeeCashFlowEntry({
        employee: {
          id: "emp_1",
          fullName: "Asha",
          payoutMonthlyUsdCents: 2_000_00,
        },
        paymentMonth: "2026-05",
        invoiceId: "inv_1",
        invoiceNumber: "2026/005",
        invoiceUsdInrRate: 84.25,
      }),
    ).toMatchObject({
      clientBatchId: expect.stringMatching(/^batch_/),
      invoicePaymentId: undefined,
      batchLabel: "2026/005",
      invoiceId: "inv_1",
      invoiceNumber: "2026/005",
      employeeId: "emp_1",
      employeeNameSnapshot: "Asha",
      daysWorked: 0,
      daysInMonth: 31,
      monthlyPaidUsdCents: 2_000_00,
      baseDollarInwardUsdCents: 0,
      cashoutUsdInrRate: 84.25,
      isNonInvoiceEmployee: true,
    });
  });

  it("keeps onboarding and offboarding separate from base inward on added rows", () => {
    expect(
      buildAddedEmployeeCashFlowEntry({
        employee: {
          id: "emp_1",
          fullName: "Asha",
          payoutMonthlyUsdCents: 2_000_00,
          onboardingAdvanceUsdCents: 900_00,
          reimbursementUsdCents: 300_00,
          reimbursementLabelsText: "Laptop",
          appraisalAdvanceUsdCents: 400_00,
          offboardingDeductionUsdCents: 200_00,
        },
        paymentMonth: "2026-05",
        invoiceId: "inv_1",
        invoiceNumber: "2026/005",
        invoiceUsdInrRate: 84.25,
      }),
    ).toMatchObject({
      baseDollarInwardUsdCents: 0,
      onboardingAdvanceUsdCents: 900_00,
      reimbursementUsdCents: 300_00,
      reimbursementLabelsText: "Laptop",
      appraisalAdvanceUsdCents: 400_00,
      offboardingDeductionUsdCents: 200_00,
    });
  });

  it("falls back to the first addable employee when the current add selection is stale", () => {
    expect(
      resolveEmployeeToAddSelection("emp_missing", [
        { id: "emp_1" },
        { id: "emp_2" },
      ]),
    ).toBe("emp_1");
  });

  it("parses multiple invoice ids from repeated and comma-separated search params", () => {
    expect(resolveEmployeeCashFlowInvoiceIds(["inv_1", "inv_2,inv_3", "inv_2"])).toEqual([
      "inv_1",
      "inv_2",
      "inv_3",
    ]);
  });

  it("removes an employee from both the visible selection and entry list", () => {
    expect(
      removeEmployeeFromSelections({
        entries: [
          { id: "row_1", employeeId: "emp_1" },
          { id: "row_2", employeeId: "emp_2" },
        ],
        selectedEmployeeIds: ["emp_1", "emp_2"],
        employeeIdToRemove: "emp_1",
      }),
    ).toEqual({
      entries: [{ id: "row_2", employeeId: "emp_2" }],
      selectedEmployeeIds: ["emp_2"],
    });
  });

  it("removes only the selected entry and keeps the employee selected when another row remains", () => {
    expect(
      removeEntryFromSelections({
        entries: [
          { id: "row_1", employeeId: "emp_1" },
          { id: "row_2", employeeId: "emp_1" },
          { id: "row_3", employeeId: "emp_2" },
        ],
        selectedEmployeeIds: ["emp_1", "emp_2"],
        entryIdToRemove: "row_1",
      }),
    ).toEqual({
      entries: [
        { id: "row_2", employeeId: "emp_1" },
        { id: "row_3", employeeId: "emp_2" },
      ],
      selectedEmployeeIds: ["emp_1", "emp_2"],
    });
  });
});
