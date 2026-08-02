import { describe, expect, it } from "vitest";

import { buildVisibleExportHref } from "../../../app/dashboard/unified-employee-table";

describe("unified dashboard server rendering helpers", () => {
  it("builds visible exports without requiring a browser window", () => {
    expect(
      buildVisibleExportHref(
        "/api/dashboard/export?format=csv&allEmployees=1&employeeIds=old",
        ["employee_1", "employee_2"],
      ),
    ).toBe(
      "/api/dashboard/export?format=csv&employeeIds=employee_1&employeeIds=employee_2",
    );
  });
});
