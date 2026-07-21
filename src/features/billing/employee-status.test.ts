import { describe, expect, it } from "vitest";

import { employeeStatusLabel } from "./employee-status";

describe("employee status labels", () => {
  it("adds an inactive suffix without changing active employee names", () => {
    expect(employeeStatusLabel({ fullName: "Asha", isActive: true })).toBe("Asha");
    expect(employeeStatusLabel({ fullName: "Bala", isActive: false })).toBe("Bala (Inactive)");
  });
});
