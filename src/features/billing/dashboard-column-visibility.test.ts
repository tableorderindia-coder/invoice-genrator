import { describe, expect, it } from "vitest";

import { getVisibleToggleColumns } from "./dashboard-column-visibility";

describe("dashboard column toggle", () => {
  it("returns only dollar inward + effective dollar inward when collapsed", () => {
    const columns = getVisibleToggleColumns(false);
    expect(columns.map((col) => col.key)).toEqual([
      "dollarInward",
      "effectiveDollarInward",
    ]);
  });

  it("returns all toggle columns when expanded", () => {
    const columns = getVisibleToggleColumns(true);
    expect(columns.map((col) => col.key)).toEqual([
      "dollarInward",
      "onboardingAdvance",
      "reimbursements",
      "reimbursementLabels",
      "reimbursementsInr",
      "appraisalAdvance",
      "appraisalAdvanceInr",
      "offboardingDeduction",
      "effectiveDollarInward",
    ]);
  });
});
