import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "../../..");

function readProjectFile(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("stage one cleanup", () => {
  it("keeps removed server wrappers and stale dashboard terminology out of product code", () => {
    const actions = readProjectFile("src/features/billing/actions.ts");
    const cashFlowStore = readProjectFile("src/features/billing/employee-cash-flow-store.ts");
    const store = readProjectFile("src/features/billing/store.ts");
    const dashboard = readProjectFile("app/dashboard/page.tsx");

    expect(actions).not.toMatch(
      /addInvoiceLineItemAction|saveDashboardExpenseAction|saveInvoicePaymentAction|saveEmployeeSalaryPaymentAction/,
    );
    expect(cashFlowStore).not.toContain("getEmployeeCashFlowDashboardData");
    expect(store).not.toMatch(
      /findLatestInvoiceForCompany|export async function addInvoiceLineItem|export async function upsertDashboardExpense/,
    );
    expect(store).toContain("async function addInvoiceLineItem");
    expect(dashboard).toContain(
      "Total earning (INR) = Operating margin (INR) + Forex gain (INR).",
    );
  });

  it("keeps dead components, template assets, and gsap out of the project", () => {
    const packageJson = readProjectFile("package.json");
    const removedPaths = [
      "app/employee-cash-flow/_components/employee-cash-flow-detail-panel.tsx",
      "app/employee-cash-flow/_components/employee-cash-flow-summary-table.tsx",
      "public/file.svg",
      "public/globe.svg",
      "public/next.svg",
      "public/vercel.svg",
      "public/window.svg",
    ];

    expect(packageJson).not.toContain('"gsap"');
    for (const path of removedPaths) {
      expect(existsSync(resolve(projectRoot, path)), path).toBe(false);
    }
  });
});
