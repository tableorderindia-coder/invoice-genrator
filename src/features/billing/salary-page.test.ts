import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "../../..");

function readProjectFile(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("salary page", () => {
  it("renders only the salary sheet workflow and no payslip creation surface", () => {
    const page = readProjectFile("app/salary/page.tsx");

    expect(page).toContain("SalaryMonthEditor");
    expect(page).not.toContain("PayslipEditor");
    expect(page).not.toContain("listPayslipRecords");
    expect(page).not.toContain("payslipsHref");
    expect(page).not.toContain("tab=payslips");
    expect(page).not.toContain("Payslips");
    expect(existsSync(resolve(projectRoot, "app/salary/_components/payslip-editor.tsx"))).toBe(false);
  });

  it("renders the salary sheet with component earnings and calculated paid totals", () => {
    const editor = readProjectFile("app/salary/_components/salary-month-editor.tsx");

    expect(editor).toContain("Days worked");
    expect(editor).toContain("Basic INR");
    expect(editor).toContain("Special allowance INR");
    expect(editor).toContain("Insurance INR");
    expect(editor).toContain("Bonus INR");
    expect(editor).toContain("PF INR");
    expect(editor).toContain("TDS INR");
    expect(editor).toContain("Monthly paid INR");
    expect(editor).toContain("Actual paid INR");
    expect(editor).toContain("Salary paid INR");
    expect(editor).toContain("Needs review");
    expect(editor).toContain("calculateMonthlyPaidInrCents");
    expect(editor).toContain("calculateActualPaidInrCents");
    expect(editor).toContain("calculateSalaryPaidInrCents");
    expect(editor).not.toContain("aria-label={`${row.employeeName} monthly paid INR`}");
    expect(editor).not.toContain("Peg rate");
    expect(editor).not.toContain("Paid date");
    expect(editor).not.toContain("Override note");
    expect(editor).not.toContain("paidStatus");
    expect(editor).not.toContain("overrideNote");
  });
});
