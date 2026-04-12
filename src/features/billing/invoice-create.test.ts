import { describe, expect, it } from "vitest";

import { formatDuplicateInvoiceOptionLabel } from "./invoice-create";

describe("formatDuplicateInvoiceOptionLabel", () => {
  it("renders draft invoices with a readable status", () => {
    expect(formatDuplicateInvoiceOptionLabel("INV-123", "draft")).toBe(
      "INV-123 • Draft",
    );
  });

  it("renders cashed out invoices with a readable status", () => {
    expect(formatDuplicateInvoiceOptionLabel("INV-456", "cashed_out")).toBe(
      "INV-456 • Cashed out",
    );
  });
});
