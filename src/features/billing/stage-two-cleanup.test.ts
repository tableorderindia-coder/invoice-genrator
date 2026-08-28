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
  it("has moved auth actions off Supabase and onto the self-hosted session/pg layer", () => {
    const authActions = readProjectFile("lib/auth/actions.ts");
    const authServer = readProjectFile("lib/auth/server.ts");
    const packageJson = readProjectFile("package.json");

    expect(authActions).not.toMatch(
      /createSupabaseAdminClient|createSupabaseServerClient|auth\.admin\.createUser/,
    );
    expect(authServer).not.toMatch(
      /createSupabaseServerClient|supabase\.auth\.getUser/,
    );
    expect(packageJson).toContain('"server-only"');
    expect(packageJson).toContain('"pg"');
    expect(packageJson).toContain('"bcryptjs"');

    for (const path of [
      "lib/supabase/client.ts",
      "src/lib/supabase/client.ts",
      "src/lib/supabase/server.ts",
      "src/lib/supabase/config.ts",
      // The Supabase magic-link forgot-password flow has no self-hosted-auth
      // equivalent (see lib/auth/actions.ts changePasswordAction docblock) -
      // password resets are admin-issued temp passwords instead.
      "components/ForgotPassword.tsx",
      "app/auth/callback/route.ts",
      "app/api/auth/users/exists/route.ts",
    ]) {
      expect(existsSync(resolve(projectRoot, path)), path).toBe(false);
    }
  });

  it("keeps the active browser auth and PDF endpoints in place", () => {
    for (const path of [
      "components/LoginForm.tsx",
      "components/ResetPasswordForm.tsx",
      "lib/auth/session.ts",
      "lib/auth/password.ts",
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
