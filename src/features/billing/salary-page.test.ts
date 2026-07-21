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
});
