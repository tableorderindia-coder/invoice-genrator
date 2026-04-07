import { describe, expect, it } from "vitest";

import {
  assertNoCaseInsensitiveDuplicate,
  assertNoDuplicateEmployeeInTeam,
  normalizeForDuplicateCheck,
} from "./duplicate-guards";

describe("duplicate guards", () => {
  it("normalizes text for case-insensitive duplicate checks", () => {
    expect(normalizeForDuplicateCheck("  Acme Corp  ")).toBe("acme corp");
  });

  it("blocks case-insensitive duplicate values", () => {
    expect(() =>
      assertNoCaseInsensitiveDuplicate({
        existingValues: ["Acme Corp", "Beta LLC"],
        candidateValue: "  acme corp ",
        entityLabel: "Company",
      }),
    ).toThrow("Company already exists");
  });

  it("allows unique values after normalization", () => {
    expect(() =>
      assertNoCaseInsensitiveDuplicate({
        existingValues: ["Acme Corp", "Beta LLC"],
        candidateValue: "Gamma Inc",
        entityLabel: "Company",
      }),
    ).not.toThrow();
  });

  it("blocks the same employee from being added twice to the same team", () => {
    expect(() =>
      assertNoDuplicateEmployeeInTeam({
        existingEmployeeIds: ["employee_1", "employee_2"],
        employeeId: "employee_2",
      }),
    ).toThrow("Candidate already exists in this team");
  });
});
