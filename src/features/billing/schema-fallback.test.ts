import { describe, expect, it } from "vitest";

import { hasMissingSchemaColumn } from "./schema-fallback";

describe("schema fallback helpers", () => {
  it("detects a missing column error for a specific table and column", () => {
    expect(
      hasMissingSchemaColumn(
        {
          code: "PGRST204",
          message:
            "Could not find the 'days_worked' column of 'invoice_line_items' in the schema cache",
        },
        "invoice_line_items",
        "days_worked",
      ),
    ).toBe(true);
  });

  it("returns false when the error points to a different column", () => {
    expect(
      hasMissingSchemaColumn(
        {
          code: "PGRST204",
          message:
            "Could not find the 'cashout_usd_inr_rate' column of 'invoice_payment_employee_entries' in the schema cache",
        },
        "invoice_line_items",
        "days_worked",
      ),
    ).toBe(false);
  });

  it("detects a postgres missing column error for a specific table and column", () => {
    expect(
      hasMissingSchemaColumn(
        {
          code: "42703",
          message: "column invoice_line_items.days_worked does not exist",
        },
        "invoice_line_items",
        "days_worked",
      ),
    ).toBe(true);
  });
});
