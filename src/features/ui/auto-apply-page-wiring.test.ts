import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function source(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

const autoApplyPages = [
  "app/page.tsx",
  "app/companies/page.tsx",
  "app/employees/page.tsx",
  "app/dashboard/page.tsx",
  "app/salary/page.tsx",
  "app/employee-cash-flow/page.tsx",
  "app/employee-statements/page.tsx",
  "app/expenses/page.tsx",
];

describe("automatic filter page wiring", () => {
  it("uses the shared auto-apply form on every former Load surface", () => {
    for (const path of autoApplyPages) {
      const page = source(path);
      expect(page, path).toContain("AutoApplyFilterForm");
      expect(page, path).not.toMatch(/defaultText="Load(?: month)?"/);
      expect(page, path).not.toMatch(/>\s*Load\s*</);
    }
  });

  it("commits every multi-select filter when its dropdown closes", () => {
    expect(source("app/dashboard/page.tsx").match(/autoApplyOnClose/g)).toHaveLength(6);
    expect(source("app/employee-cash-flow/page.tsx").match(/autoApplyOnClose/g)).toHaveLength(3);
    expect(source("app/employee-statements/page.tsx").match(/autoApplyOnClose/g)).toHaveLength(1);
  });

  it("retains explicit mutation actions", () => {
    expect(source("app/companies/page.tsx")).toContain('defaultText="Update company"');
    expect(source("app/employees/page.tsx")).toContain('defaultText="Update employee"');
    expect(source("app/expenses/page.tsx")).toContain('defaultText="Add expense"');
    expect(source("app/invoices/drafts/[id]/page.tsx")).toContain(
      'defaultText="Add selected team"',
    );
  });

  it("marks editable forms for shared unsaved-change protection", () => {
    const editableFiles = [
      "app/companies/page.tsx",
      "app/employees/page.tsx",
      "app/salary/_components/salary-month-editor.tsx",
      "app/employee-cash-flow/_components/employee-cash-flow-entry-form.tsx",
      "app/employee-cash-flow/_components/employee-cash-flow-saved-rows.tsx",
      "app/employee-statements/_components/employee-statement-editor.tsx",
      "app/expenses/page.tsx",
      "app/cashout/page.tsx",
      "app/founders-balance/founders-balance-table.tsx",
      "app/invoices/create/page.tsx",
      "app/invoices/drafts/[id]/page.tsx",
      "app/invoices/drafts/[id]/adjustment-forms.tsx",
      "app/admin/users/page.tsx",
    ];

    for (const path of editableFiles) {
      expect(source(path), path).toContain("data-unsaved-form");
    }
  });
});
