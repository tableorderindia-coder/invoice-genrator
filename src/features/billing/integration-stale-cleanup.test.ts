import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "../../..");
const externalPortalName = ["eo", "r"].join("");
const externalPortalNameUpper = externalPortalName.toUpperCase();
const removedIntegrationPattern = new RegExp(
  [
    externalPortalNameUpper,
    externalPortalName,
    ["syncCompanyTo", "E", "or"].join(""),
    ["syncInvoiceTo", "E", "or"].join(""),
    ["INVOICE", "GENERATOR", "SYNC", "SECRET"].join("_"),
    [externalPortalNameUpper, "PORTAL"].join("_"),
  ].join("|"),
);

function readProjectFile(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("external integration and stale profit cleanup", () => {
  it("removes the external portal integration surface from product code and configuration", () => {
    const searchableFiles = [
      ".env.example",
      "app/companies/page.tsx",
      "src/features/billing/actions.ts",
      "src/features/billing/actions.test.ts",
      "proxy.ts",
    ];

    for (const path of searchableFiles) {
      expect(readProjectFile(path), path).not.toMatch(removedIntegrationPattern);
    }

    expect(
      existsSync(
        resolve(projectRoot, `src/features/billing/${externalPortalName}-sync.ts`),
      ),
    ).toBe(false);
    expect(
      existsSync(
        resolve(
          projectRoot,
          `app/api/integrations/${externalPortalName}-portal/invoice-status/route.ts`,
        ),
      ),
    ).toBe(false);
    expect(existsSync(resolve(projectRoot, "middleware.ts"))).toBe(false);
  });

  it("uses canonical invoice routes and removes redirect-only legacy routes", () => {
    const appHome = readProjectFile("app/page.tsx");
    const invoiceList = readProjectFile("app/invoices/page.tsx");

    expect(appHome).toContain('href="/invoices/create"');
    expect(appHome).not.toContain('href="/invoices/new"');
    expect(appHome).not.toMatch(/href=\{`\/invoices\/\$\{invoice\.id\}`/);
    expect(invoiceList).not.toMatch(/href=\{`\/invoices\/\$\{invoice\.id\}`/);
    expect(existsSync(resolve(projectRoot, "app/invoices/new/page.tsx"))).toBe(false);
    expect(existsSync(resolve(projectRoot, "app/invoices/[id]/page.tsx"))).toBe(false);
  });

  it("retires legacy USD dashboard profit metrics from app code", () => {
    const overview = readProjectFile("app/page.tsx");
    const employees = readProjectFile("app/employees/page.tsx");
    const store = readProjectFile("src/features/billing/store.ts");
    const types = readProjectFile("src/features/billing/types.ts");

    expect(overview).toContain("Net P/L (INR)");
    expect(overview).not.toMatch(/Realized profit|USD only in phase 1|getDashboardMetrics/);
    expect(employees).not.toMatch(/realizedProfit|formatSignedUsd|getDashboardMetrics/);
    expect(employees).not.toContain("getPnDashboardData");
    expect(store).not.toContain("getDashboardMetrics");
    expect(types).not.toContain("DashboardMetrics");
  });

  it("keeps audit-before-drop migration coverage for retired database structures", () => {
    const schema = readProjectFile("supabase/schema.sql");
    const seed = readProjectFile("supabase/seed.sql");
    const migration = readProjectFile(
      "supabase/migrations/20260705154500_retire_legacy_profit_schema.sql",
    );
    const retiredDbNames =
      /dashboard_expenses|payout_monthly_usd_cents_snapshot|payout_total_usd_cents|profit_total_usd_cents|realized_revenue_usd_cents|realized_payout_usd_cents|realized_profit_usd_cents/;

    expect(schema).not.toMatch(retiredDbNames);
    expect(seed).not.toMatch(retiredDbNames);
    expect(migration).toMatch(/migration_audit_dashboard_expenses_20260705/);
    expect(migration).toMatch(/migration_audit_invoice_line_item_legacy_profit_20260705/);
    expect(migration).toMatch(/migration_audit_invoice_realization_legacy_profit_20260705/);
    expect(migration).toMatch(/drop table if exists public\.dashboard_expenses/);
    expect(migration).toMatch(/drop column if exists payout_monthly_usd_cents_snapshot/);
    expect(migration).toMatch(/drop column if exists realized_profit_usd_cents/);
  });
});
