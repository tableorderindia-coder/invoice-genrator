import { describe, expect, it } from "vitest";

import {
  expenseMonthKey,
  formatExpensePeriodLabel,
  isExpenseInPeriod,
  normalizeExpensePeriodRange,
  parseExpenseMonthKeyParts,
} from "./expense-period";

describe("expense period helpers", () => {
  it("keeps a single-month range on one month", () => {
    const range = normalizeExpensePeriodRange({
      startMonth: "2026-07",
      endMonth: "2026-07",
      fallbackMonth: "2026-06",
    });

    expect(range).toEqual({ startMonth: "2026-07", endMonth: "2026-07" });
    expect(isExpenseInPeriod({ year: 2026, month: 7 }, range)).toBe(true);
    expect(isExpenseInPeriod({ year: 2026, month: 6 }, range)).toBe(false);
  });

  it("includes every month in a multi-month range", () => {
    const range = normalizeExpensePeriodRange({
      startMonth: "2026-04",
      endMonth: "2026-07",
      fallbackMonth: "2026-07",
    });

    expect(isExpenseInPeriod({ year: 2026, month: 4 }, range)).toBe(true);
    expect(isExpenseInPeriod({ year: 2026, month: 5 }, range)).toBe(true);
    expect(isExpenseInPeriod({ year: 2026, month: 6 }, range)).toBe(true);
    expect(isExpenseInPeriod({ year: 2026, month: 7 }, range)).toBe(true);
    expect(isExpenseInPeriod({ year: 2026, month: 8 }, range)).toBe(false);
  });

  it("normalizes a reversed range", () => {
    expect(
      normalizeExpensePeriodRange({
        startMonth: "2026-07",
        endMonth: "2026-04",
        fallbackMonth: "2026-07",
      }),
    ).toEqual({ startMonth: "2026-04", endMonth: "2026-07" });
  });

  it("handles cross-year ranges", () => {
    const range = normalizeExpensePeriodRange({
      startMonth: "2025-12",
      endMonth: "2026-02",
      fallbackMonth: "2026-01",
    });

    expect(isExpenseInPeriod({ year: 2025, month: 11 }, range)).toBe(false);
    expect(isExpenseInPeriod({ year: 2025, month: 12 }, range)).toBe(true);
    expect(isExpenseInPeriod({ year: 2026, month: 1 }, range)).toBe(true);
    expect(isExpenseInPeriod({ year: 2026, month: 2 }, range)).toBe(true);
    expect(isExpenseInPeriod({ year: 2026, month: 3 }, range)).toBe(false);
  });

  it("formats and parses expense month keys", () => {
    expect(expenseMonthKey(2026, 7)).toBe("2026-07");
    expect(parseExpenseMonthKeyParts("2026-07")).toEqual({ year: 2026, month: 7 });
    expect(formatExpensePeriodLabel("2026-04", "2026-07")).toBe("April 2026 - July 2026");
    expect(formatExpensePeriodLabel("2026-07", "2026-07")).toBe("July 2026");
  });
});
