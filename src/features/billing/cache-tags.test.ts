import { describe, expect, it } from "vitest";

import {
  billingCacheTags,
  getBillingInvalidationTags,
  normalizeCacheScopeIds,
} from "./cache-tags";

describe("billing cache tags", () => {
  it("normalizes scoped cache ids so equivalent selections share cache keys", () => {
    expect(normalizeCacheScopeIds(["company_b", "company_a", "company_b"])).toBe(
      "company_a,company_b",
    );
  });

  it("builds stable domain tags for company and month scoped reads", () => {
    expect(billingCacheTags.employees(["company_b", "company_a"])).toBe(
      "billing:employees:company_a,company_b",
    );
    expect(billingCacheTags.salary("company_a", "2026-07")).toBe(
      "billing:salary:company_a:2026-07",
    );
    expect(billingCacheTags.dashboard("company_a")).toBe("billing:dashboard:company_a");
  });

  it("maps employee writes to the read caches that use employee defaults", () => {
    expect(getBillingInvalidationTags({ type: "employee", companyId: "company_a" })).toEqual([
      "billing:companies",
      "billing:employees:company_a",
      "billing:salary:company_a",
      "billing:invoices:company_a",
      "billing:cashflow:company_a",
      "billing:dashboard:company_a",
      "billing:overview:company_a",
    ]);
  });

  it("maps salary writes to salary, cashflow, dashboard, and overview caches", () => {
    expect(
      getBillingInvalidationTags({
        type: "salary",
        companyId: "company_a",
        month: "2026-07",
      }),
    ).toEqual([
      "billing:salary:company_a",
      "billing:salary:company_a:2026-07",
      "billing:cashflow:company_a",
      "billing:cashflow:company_a:2026-07",
      "billing:dashboard:company_a",
      "billing:overview:company_a",
      "billing:payment-months:company_a",
    ]);
  });
});
