import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("billing cache safety", () => {
  it("does not wrap request-scoped Supabase reads in Next persistent cache", () => {
    const cachedStore = readProjectFile("src/features/billing/cached-store.ts");
    const cachedPayrollStore = readProjectFile("src/features/billing/cached-payroll-store.ts");

    expect(cachedStore).not.toContain("unstable_cache");
    expect(cachedPayrollStore).not.toContain("unstable_cache");
  });
});
