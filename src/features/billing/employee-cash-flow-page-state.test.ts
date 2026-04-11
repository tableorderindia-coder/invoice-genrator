import { describe, expect, it } from "vitest";

import {
  buildEmployeeCashFlowInvoiceOptionsInput,
  resolveEmployeeCashFlowMonthKey,
} from "./employee-cash-flow-page-state";

describe("employee cash flow page state", () => {
  it("keeps payment month separate from invoice option filtering", () => {
    expect(buildEmployeeCashFlowInvoiceOptionsInput("company_1")).toEqual({
      companyId: "company_1",
    });
  });

  it("resolves legacy month/year search params into a payment month key", () => {
    expect(
      resolveEmployeeCashFlowMonthKey("4", "2026", new Date("2026-06-01T00:00:00Z")),
    ).toBe("2026-04");
  });

  it("falls back to the current month when no payment month is provided", () => {
    expect(
      resolveEmployeeCashFlowMonthKey(undefined, undefined, new Date("2026-06-01T00:00:00Z")),
    ).toBe("2026-06");
  });
});
