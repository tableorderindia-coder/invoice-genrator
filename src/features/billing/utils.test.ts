import { describe, expect, it } from "vitest";

import { formatDate, normalizeDateRange, sanitizeDownloadFilename } from "./utils";

describe("billing date formatting", () => {
  it("formats ISO dates as MM-DD-YYYY", () => {
    expect(formatDate("2026-04-15")).toBe("04-15-2026");
  });

  it("formats Date objects as MM-DD-YYYY", () => {
    expect(formatDate(new Date(Date.UTC(2026, 3, 7)))).toBe("04-07-2026");
  });

  it("normalizes billing duration strings to MM-DD-YYYY", () => {
    expect(normalizeDateRange("03/15/2026 - 04/14/2026")).toBe(
      "03-15-2026 - 04-14-2026",
    );
  });

  it("sanitizes invoice numbers for download filenames", () => {
    expect(sanitizeDownloadFilename("2026/006")).toBe("2026-006");
    expect(sanitizeDownloadFilename("  INV:APRIL*2026  ")).toBe("INV-APRIL-2026");
  });
});
