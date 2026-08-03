import { describe, expect, it } from "vitest";

import { getVisibleToggleColumns } from "./dashboard-column-visibility";
import {
  EMPLOYEE_DASHBOARD_COLUMN_OPTIONS,
  PERIOD_DASHBOARD_COLUMN_OPTIONS,
} from "./dashboard-column-options";

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

  it("distinguishes monthly paid, actual paid, and salary paid labels", () => {
    expect(EMPLOYEE_DASHBOARD_COLUMN_OPTIONS.map((option) => option.label)).toEqual(
      expect.arrayContaining([
        "Monthly paid (INR)",
        "Actual paid (INR)",
        "Salary paid (INR)",
      ]),
    );
    expect(PERIOD_DASHBOARD_COLUMN_OPTIONS.map((option) => option.label)).toEqual(
      expect.arrayContaining([
        "Monthly paid (INR)",
        "Actual paid (INR)",
        "Salary paid (INR)",
      ]),
    );
  });

  it("orders salary paid before PF and TDS in employee and period views", () => {
    for (const options of [
      EMPLOYEE_DASHBOARD_COLUMN_OPTIONS,
      PERIOD_DASHBOARD_COLUMN_OPTIONS,
    ]) {
      const keys = options.map((option) => option.value);
      expect(keys.indexOf("salaryPaid")).toBeLessThan(keys.indexOf("pf"));
      expect(keys.indexOf("pf")).toBeLessThan(keys.indexOf("tds"));
    }
  });
});
