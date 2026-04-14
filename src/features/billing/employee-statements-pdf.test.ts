import { describe, expect, it } from "vitest";

import {
  buildEmployeeStatementPdf,
  buildEmployeeStatementPdfModel,
} from "./employee-statements-pdf";

describe("employee statement pdf", () => {
  it("builds an invoice-style header and totals", () => {
    const model = buildEmployeeStatementPdfModel({
      companyName: "Acme Inc.",
      employeeName: "Asha",
      dateRangeLabel: "January 2026 - March 2026",
      generatedDate: "2026-04-14",
      months: [],
      totals: {
        dollarInwardUsdCents: 100000,
        onboardingAdvanceUsdCents: 20000,
        reimbursementUsdCents: 5000,
        offboardingDeductionUsdCents: 1000,
        effectiveDollarInwardUsdCents: 124000,
        monthlyDollarPaidUsdCents: 250000,
      },
    });

    expect(model.header.companyName).toBe("Acme Inc.");
    expect(model.header.employeeName).toBe("Asha");
    expect(model.totals.effectiveDollarInward).toBe("$1,240");
  });

  it("renders a pdf buffer", async () => {
    const pdf = await buildEmployeeStatementPdf({
      companyName: "Acme Inc.",
      employeeName: "Asha",
      dateRangeLabel: "January 2026 - March 2026",
      generatedDate: "2026-04-14",
      months: [],
      totals: {
        dollarInwardUsdCents: 100000,
        onboardingAdvanceUsdCents: 0,
        reimbursementUsdCents: 0,
        offboardingDeductionUsdCents: 0,
        effectiveDollarInwardUsdCents: 100000,
        monthlyDollarPaidUsdCents: 250000,
      },
    });

    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
