import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "../../..");

function readProjectFile(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("dashboard export page", () => {
  it("renders CSV and PDF export links for the current dashboard filters", () => {
    const page = readProjectFile("app/dashboard/page.tsx");
    const tables = readProjectFile("app/dashboard/dashboard-tables.tsx");

    expect(tables).toContain("Export CSV");
    expect(tables).toContain("Export PDF");
    expect(tables).toContain("buildDashboardExportHref");
    expect(page).toContain("/api/dashboard/export");
    expect(page).toContain('format: "csv"');
    expect(page).toContain('format: "pdf"');
  });
});
