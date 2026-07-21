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

  it("renders the salary sheet with monthly paid and days worked instead of payment controls", () => {
    const editor = readProjectFile("app/salary/_components/salary-month-editor.tsx");

    expect(editor).toContain("Days worked");
    expect(editor).toContain("Monthly paid INR");
    expect(editor).toContain("Actual paid INR");
    expect(editor).toContain("calculateActualPaidInrCents");
    expect(editor).not.toContain("Peg rate");
    expect(editor).not.toContain("Paid date");
    expect(editor).not.toContain("Override note");
    expect(editor).not.toContain("paidStatus");
    expect(editor).not.toContain("overrideNote");
  });
});
