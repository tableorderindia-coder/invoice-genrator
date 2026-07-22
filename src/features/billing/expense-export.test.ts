import { describe, expect, it, vi } from "vitest";
import PDFDocument from "pdfkit";

import {
  buildExpenseExportCsv,
  buildExpenseExportRows,
  buildExpenseExportPdf,
} from "./expense-export";
import type { CompanyExpense } from "./types";

const expenses: CompanyExpense[] = [
  {
    id: "expense_1",
    companyId: "company_1",
    year: 2026,
    month: 7,
    label: "Office rent",
    amountInrCents: 123456,
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
  },
  {
    id: "expense_2",
    companyId: "company_1",
    year: 2026,
    month: 6,
    label: "Software, licenses",
    amountInrCents: 50000,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
];

describe("expense export", () => {
  it("builds month, label, amount, and total rows", () => {
    const rows = buildExpenseExportRows(expenses);

    expect(rows).toEqual([
      { month: "July 2026", label: "Office rent", amountInr: "1234.56" },
      { month: "June 2026", label: "Software, licenses", amountInr: "500.00" },
      { month: "Total", label: "", amountInr: "1734.56" },
    ]);
  });

  it("escapes CSV values and includes the total row", () => {
    const csv = buildExpenseExportCsv(expenses);

    expect(csv).toContain("Month,Expense label,Expense INR");
    expect(csv).toContain('"June 2026","Software, licenses","500.00"');
    expect(csv).toContain('"Total","","1734.56"');
  });

  it("renders a valid PDF report with the company, period, and total", async () => {
    const pdf = await buildExpenseExportPdf({
      companyLabel: "Arena",
      periodLabel: "June 2026 - July 2026",
      expenses,
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("draws bordered table cells so expense columns do not visually merge", async () => {
    const rectSpy = vi.spyOn(PDFDocument.prototype, "rect");

    await buildExpenseExportPdf({
      companyLabel: "Arena",
      periodLabel: "June 2026 - July 2026",
      expenses,
    });

    expect(rectSpy.mock.calls.length).toBeGreaterThanOrEqual((expenses.length + 2) * 3);
    rectSpy.mockRestore();
  });
});
