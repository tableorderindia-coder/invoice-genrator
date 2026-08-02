import { describe, expect, it } from "vitest";

import { formatRateInput } from "@/src/features/billing/utils";

// Regression: ISSUE-004 - four-decimal peg rates were rounded when forms reloaded
// Found by /qa on 2026-08-03
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-08-03.md

describe("peg-rate input formatting", () => {
  it("preserves meaningful precision up to four decimal places", () => {
    expect(formatRateInput(84.875)).toBe("84.875");
    expect(formatRateInput(84.8751)).toBe("84.8751");
    expect(formatRateInput(84.5)).toBe("84.5");
  });
});
