import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Regression: ISSUE-002 - employee saves reset the global company scope
// Found by /qa on 2026-08-03
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-08-03.md
describe("employee mutation scope wiring", () => {
  it("posts the scoped return path and redirects both employee actions to it", async () => {
    const [pageSource, actionSource] = await Promise.all([
      readFile(path.join(process.cwd(), "app/employees/page.tsx"), "utf8"),
      readFile(path.join(process.cwd(), "src/features/billing/actions.ts"), "utf8"),
    ]);

    expect(pageSource).toContain('name="returnTo" value={addHref}');
    expect(pageSource).toContain('name="returnTo" value={editReturnTo}');

    const createEmployeeAction = actionSource.slice(
      actionSource.indexOf("export async function createEmployeeAction"),
      actionSource.indexOf("export async function updateEmployeeAction"),
    );
    const updateEmployeeAction = actionSource.slice(
      actionSource.indexOf("export async function updateEmployeeAction"),
      actionSource.indexOf("export async function createInvoiceDraftAction"),
    );

    expect(createEmployeeAction).toContain('getString(formData, "returnTo")');
    expect(createEmployeeAction).toContain("redirect(returnTo)");
    expect(updateEmployeeAction).toContain('getString(formData, "returnTo")');
    expect(updateEmployeeAction).toContain("redirect(returnTo)");
  });
});
