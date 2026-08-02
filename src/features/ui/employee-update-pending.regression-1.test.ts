import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Regression: ISSUE-005 - same-URL employee redirects left the save button pending
// Found by /qa on 2026-08-03
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-08-03.md

describe("employee update completion redirect", () => {
  it("changes the return URL after a successful update", async () => {
    const actionSource = await readFile(
      path.join(process.cwd(), "src/features/billing/actions.ts"),
      "utf8",
    );
    const updateEmployeeAction = actionSource.slice(
      actionSource.indexOf("export async function updateEmployeeAction"),
      actionSource.indexOf("export async function createInvoiceDraftAction"),
    );

    expect(updateEmployeeAction).toContain(
      'returnTo = buildFlashRedirect(returnTo, "success", "Employee updated.")',
    );
    expect(updateEmployeeAction).toContain("redirect(returnTo)");
  });
});
