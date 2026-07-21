import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "../../..");

function readProjectFile(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("expenses period page", () => {
  it("renders start and end month controls instead of the old list selectors", () => {
    const page = readProjectFile("app/expenses/page.tsx");

    expect(page).toContain('Field label="Start month"');
    expect(page).toContain('Field label="End month"');
    expect(page).toContain('type="month"');
    expect(page).not.toContain('Field label="Month"');
    expect(page).not.toContain('Field label="Year"');
  });

  it("shows row months and preserves each row month while editing", () => {
    const page = readProjectFile("app/expenses/page.tsx");

    expect(page).toContain("formatMonthYear(expense.month, expense.year)");
    expect(page).toContain('name="year" value={expense.year}');
    expect(page).toContain('name="month" value={expense.month}');
  });
});
