import { describe, expect, it } from "vitest";

import {
  buildDashboardExportHref,
  resolveDashboardExportOptions,
} from "./dashboard-export-options";

describe("dashboard export options", () => {
  it("defaults every accounting item to included", () => {
    expect(resolveDashboardExportOptions(new URLSearchParams())).toEqual({
      includeExpenses: true,
      includeAdvances: true,
      includeReimbursements: true,
    });
  });

  it("parses exclusions and preserves them in export links", () => {
    const options = resolveDashboardExportOptions(
      new URLSearchParams("includeExpenses=0&includeAdvances=0&includeReimbursements=1"),
    );
    const href = buildDashboardExportHref(
      "/api/dashboard/export?format=csv&companyIds=company_a",
      options,
    );
    const params = new URL(href, "http://localhost").searchParams;

    expect(options).toEqual({
      includeExpenses: false,
      includeAdvances: false,
      includeReimbursements: true,
    });
    expect(params.get("format")).toBe("csv");
    expect(params.get("companyIds")).toBe("company_a");
    expect(params.get("includeExpenses")).toBe("0");
    expect(params.get("includeAdvances")).toBe("0");
    expect(params.get("includeReimbursements")).toBe("1");
  });
});
