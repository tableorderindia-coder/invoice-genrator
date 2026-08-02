import { describe, expect, it } from "vitest";

import { normalizeDashboardPdfText } from "./dashboard-export";

// Regression: ISSUE-007 - the dashboard PDF rendered the rupee symbol as an apostrophe
// Found by /qa on 2026-08-03
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-08-03.md

describe("dashboard PDF currency text", () => {
  it("uses viewer-safe INR labels instead of an unsupported rupee glyph", () => {
    expect(normalizeDashboardPdfText("₹5,41,800.00")).toBe("INR 5,41,800.00");
    expect(normalizeDashboardPdfText("- ₹6,05,800.00")).toBe("- INR 6,05,800.00");
    expect(normalizeDashboardPdfText("+ ₹12,74,624.00")).toBe("+ INR 12,74,624.00");
    expect(normalizeDashboardPdfText("$21,840")).toBe("$21,840");
  });
});
