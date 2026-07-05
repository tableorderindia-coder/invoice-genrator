import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "../../..");

function readProjectFile(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

function tableDefinition(schema: string, tableName: string) {
  const match = schema.match(
    new RegExp(
      `create table if not exists (?:public\\.)?${tableName} \\(([\\s\\S]*?)\\n\\);`,
      "i",
    ),
  );
  return match?.[1] ?? "";
}

describe("stage two cleanup", () => {
  it("removes obsolete auth actions and Supabase compatibility shims", () => {
    const authActions = readProjectFile("lib/auth/actions.ts");
    const authServer = readProjectFile("lib/auth/server.ts");
    const packageJson = readProjectFile("package.json");

    expect(authActions).not.toMatch(
      /loginAction|forgotPasswordAction|resetPasswordAction|getRequestOrigin/,
    );
    expect(authServer).not.toMatch(
      /getPostAuthRedirectPath|shouldRedirectToPasswordReset/,
    );
    expect(packageJson).toContain('"server-only"');

    for (const path of [
      "lib/supabase/client.ts",
      "src/lib/supabase/client.ts",
      "src/lib/supabase/server.ts",
      "src/lib/supabase/config.ts",
    ]) {
      expect(existsSync(resolve(projectRoot, path)), path).toBe(false);
    }
  });

  it("keeps the active browser auth and PDF endpoints in place", () => {
    for (const path of [
      "components/LoginForm.tsx",
      "components/ForgotPassword.tsx",
      "components/ResetPasswordForm.tsx",
      "app/auth/callback/route.ts",
      "app/api/invoices/[id]/pdf/route.ts",
      "app/api/employee-statements/[employeeId]/pdf/route.ts",
    ]) {
      expect(existsSync(resolve(projectRoot, path)), path).toBe(true);
    }
  });

  it("documents the migrated cash-flow and RBAC schema for fresh installs", () => {
    const schema = readProjectFile("supabase/schema.sql");

    for (const table of [
      "invoice_payments",
      "invoice_payment_employee_entries",
      "employee_salary_payments",
      "profiles",
      "permissions",
    ]) {
      expect(tableDefinition(schema, table), table).not.toBe("");
    }

    expect(tableDefinition(schema, "employees")).not.toContain(
      "payout_monthly_usd_cents",
    );
    expect(tableDefinition(schema, "employee_payouts")).not.toContain(
      "employee_monthly_usd_cents",
    );
    expect(tableDefinition(schema, "invoice_payment_employee_entries")).not.toContain(
      "monthly_paid_usd_cents",
    );
    expect(tableDefinition(schema, "employee_salary_payments")).not.toContain(
      "salary_usd_cents",
    );
    expect(tableDefinition(schema, "employee_statement_month_summaries")).toContain(
      "monthly_dollar_paid_usd_cents",
    );
    expect(schema).toContain("create schema if not exists private");
    expect(schema).toContain("private.has_page_permission");
  });
});
