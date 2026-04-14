import { describe, expect, it } from "vitest";

import {
  filterSavedCashFlowRows,
  formatPaymentMonthLabel,
  normalizeMultiSelectValue,
} from "./filter-selection";

describe("filter selection helpers", () => {
  it("normalizes repeated and comma-separated multi-select values", () => {
    expect(normalizeMultiSelectValue([" emp_1 ", "emp_2, emp_1", "", "emp_2"])).toEqual([
      "emp_1",
      "emp_2",
    ]);
  });

  it("formats payment months as readable labels", () => {
    expect(formatPaymentMonthLabel("2026-04")).toBe("April 2026");
  });

  it("falls back to the raw payment month when the month key is invalid", () => {
    expect(formatPaymentMonthLabel("not-a-month")).toBe("not-a-month");
  });

  it("falls back to the raw payment month when the month key has an invalid month number", () => {
    expect(formatPaymentMonthLabel("2026-00")).toBe("2026-00");
    expect(formatPaymentMonthLabel("2026-13")).toBe("2026-13");
  });

  it("filters saved cash flow rows by employee and month", () => {
    const rows = [
      { id: "row_1", employeeId: "emp_1", paymentMonth: "2026-04" },
      { id: "row_2", employeeId: "emp_2", paymentMonth: "2026-04" },
      { id: "row_3", employeeId: "emp_1", paymentMonth: "2026-05" },
    ];

    expect(
      filterSavedCashFlowRows(rows, {
        employeeIds: ["emp_1"],
        paymentMonths: ["2026-04"],
      }),
    ).toEqual([{ id: "row_1", employeeId: "emp_1", paymentMonth: "2026-04" }]);
  });

  it("filters saved cash flow rows by employee only", () => {
    const rows = [
      { id: "row_1", employeeId: "emp_1", paymentMonth: "2026-04" },
      { id: "row_2", employeeId: "emp_2", paymentMonth: "2026-05" },
    ];

    expect(
      filterSavedCashFlowRows(rows, {
        employeeIds: ["emp_2"],
      }),
    ).toEqual([{ id: "row_2", employeeId: "emp_2", paymentMonth: "2026-05" }]);
  });

  it("filters saved cash flow rows by month only", () => {
    const rows = [
      { id: "row_1", employeeId: "emp_1", paymentMonth: "2026-04" },
      { id: "row_2", employeeId: "emp_2", paymentMonth: "2026-05" },
    ];

    expect(
      filterSavedCashFlowRows(rows, {
        paymentMonths: ["2026-05"],
      }),
    ).toEqual([{ id: "row_2", employeeId: "emp_2", paymentMonth: "2026-05" }]);
  });

  it("treats empty filter arrays as no restriction", () => {
    const rows = [
      { id: "row_1", employeeId: "emp_1", paymentMonth: "2026-04" },
      { id: "row_2", employeeId: "emp_2", paymentMonth: "2026-05" },
    ];

    expect(
      filterSavedCashFlowRows(rows, {
        employeeIds: [],
        paymentMonths: [],
      }),
    ).toEqual(rows);
  });
});
