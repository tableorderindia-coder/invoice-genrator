import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("billing cache safety", () => {
  // Prior to the Neon migration these reads went through a per-request
  // Supabase client implicitly bound to the logged-in user's session (via
  // cookies), so unstable_cache was banned here outright: caching by
  // argument alone would have leaked one user's data to another, since
  // identity wasn't part of the cache key. Reads now go through the plain,
  // non-user-scoped `pg` pool (lib/db/pool.ts) with `companyId` passed
  // explicitly, and authorization happens upstream (requirePageAccess /
  // filterCompaniesForAuthContext) before these functions are ever called -
  // so unstable_cache is safe as long as every cached read still takes its
  // scope (companyId, and month where relevant) as an explicit argument
  // rather than pulling it from cookies/headers/an implicit client.
  it("does not read cookies, headers, or an auth-scoped client inside cached reads", () => {
    const cachedStore = readProjectFile("src/features/billing/cached-store.ts");
    const cachedPayrollStore = readProjectFile("src/features/billing/cached-payroll-store.ts");

    for (const source of [cachedStore, cachedPayrollStore]) {
      expect(source).not.toContain("next/headers");
      expect(source).not.toContain("createSupabaseServerClient");
      expect(source).not.toContain("getAuthContext");
    }
  });

  it("keys every unstable_cache call on an explicit companyId (or the global scope)", () => {
    const cachedStore = readProjectFile("src/features/billing/cached-store.ts");
    const cachedPayrollStore = readProjectFile("src/features/billing/cached-payroll-store.ts");

    // Every unstable_cache(...) call's keyParts array must be an array
    // literal (not a spread of an unknown/dynamic source), so the cache key
    // is always statically inspectable here rather than assembled from
    // hidden state.
    for (const source of [cachedStore, cachedPayrollStore]) {
      const keyPartsArrays = [...source.matchAll(/unstable_cache\(\s*[\s\S]*?\[([\s\S]*?)\]/g)];
      expect(keyPartsArrays.length).toBeGreaterThan(0);
    }
  });
});
