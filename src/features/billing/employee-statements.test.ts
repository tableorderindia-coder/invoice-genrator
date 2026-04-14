import { describe, expect, it } from "vitest";

import {
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
});
