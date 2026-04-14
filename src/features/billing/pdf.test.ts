import { describe, expect, it } from "vitest";

import type { InvoiceDetail } from "./types";
import {
  buildInvoicePdf,
  buildInvoicePdfModel,
  paginateInvoicePdfSectionRows,
} from "./pdf";

function countPdfPages(buffer: Buffer) {
  return (buffer.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;
}

const detail: InvoiceDetail = {
  company: {
    id: "company_1",
    name: "The Arena Platform, Inc.",
    billingAddress: "200 Vesey Street, 24th Floor, New York, NY 10281",
    defaultNote:
      "Adjusted according to 52 weeks i.e. (40 hours/week * 52 weeks)/12 months.",
    createdAt: "2026-04-01T00:00:00.000Z",
  },
  invoice: {
    id: "invoice_1",
    companyId: "company_1",
    month: 3,
    year: 2026,
    invoiceNumber: "2026/006",
    billingDate: "2026-04-04",
    billingDuration: "03/15/2026 - 04/14/2026",
    dueDate: "2026-04-15",
    status: "generated",
    noteText:
      "**Adjusted according to 52 weeks i.e. (40 hours/week * 52 weeks)/12 months. We pay our employees on 25th of every month,if possible try to settle the bill by 20th of month.",
    subtotalUsdCents: 2734200,
    adjustmentsUsdCents: 276200,
    grandTotalUsdCents: 2458200,
    createdAt: "2026-04-04T00:00:00.000Z",
    updatedAt: "2026-04-04T00:00:00.000Z",
  },
  teams: [
    {
      id: "team_1",
      invoiceId: "invoice_1",
      teamName: "Data Team",
      sortOrder: 0,
      lineItems: [
        {
          id: "line_1",
          invoiceTeamId: "team_1",
          employeeId: "employee_1",
          employeeNameSnapshot: "Pawan Kumar Beesetti",
          designationSnapshot: "Data Engineer",
          teamNameSnapshot: "Data Team",
          billingRateUsdCents: 3400,
          payoutMonthlyUsdCentsSnapshot: 0,
          hrsPerWeek: 40,
          daysWorked: 31,
          billedTotalUsdCents: 589333,
          payoutTotalUsdCents: 0,
          profitTotalUsdCents: 0,
        },
      ],
    },
    {
      id: "team_2",
      invoiceId: "invoice_1",
      teamName: "Finance Team",
      sortOrder: 1,
      lineItems: [
        {
          id: "line_2",
          invoiceTeamId: "team_2",
          employeeId: "employee_2",
          employeeNameSnapshot: "Srivarshini",
          designationSnapshot: "Finance Analyst",
          teamNameSnapshot: "Finance Team",
          billingRateUsdCents: 1000,
          payoutMonthlyUsdCentsSnapshot: 0,
          hrsPerWeek: 20,
          daysWorked: 31,
          billedTotalUsdCents: 86667,
          payoutTotalUsdCents: 0,
          profitTotalUsdCents: 0,
        },
      ],
    },
  ],
  adjustments: [
    {
      id: "adj_1",
      invoiceId: "invoice_1",
      type: "onboarding",
      label: "Onboarding Advance",
      employeeName: "Dhara Ghelani",
      rateUsdCents: 2800,
      hrsPerWeek: 40,
      amountUsdCents: 485400,
      sortOrder: 0,
    },
    {
      id: "adj_2",
      invoiceId: "invoice_1",
      type: "appraisal",
      label: "Appraisal Advance",
      employeeName: "Riya Solanki",
      rateUsdCents: 2300,
      hrsPerWeek: 5,
      amountUsdCents: 23000,
      sortOrder: 1,
    },
    {
      id: "adj_3",
      invoiceId: "invoice_1",
      type: "reimbursement",
      label: "One Time Laptop Allowance",
      amountUsdCents: 80000,
      sortOrder: 2,
    },
    {
      id: "adj_4",
      invoiceId: "invoice_1",
      type: "reimbursement",
      label: "Travel Desk Expense",
      amountUsdCents: 12000,
      sortOrder: 3,
    },
    {
      id: "adj_5",
      invoiceId: "invoice_1",
      type: "offboarding",
      label: "Off-Boarding Adjustments",
      employeeName: "Darshan Tukaram Bandache",
      rateUsdCents: 5000,
      hrsPerWeek: 16,
      amountUsdCents: -520000,
      sortOrder: 4,
    },
  ],
};

const minimalDetail: InvoiceDetail = {
  ...detail,
  invoice: {
    ...detail.invoice,
    invoiceNumber: "2026/001",
    noteText: "Short note.",
    subtotalUsdCents: 589333,
    adjustmentsUsdCents: 0,
    grandTotalUsdCents: 589333,
  },
  teams: [detail.teams[0]!],
  adjustments: [],
};

describe("branded invoice pdf model", () => {
  it("builds sample-style sections and grand total formula", () => {
    const model = buildInvoicePdfModel(detail);

    expect(model.billTo.name).toBe("The Arena Platform, Inc.");
    expect(model.invoiceDetails.invoiceNumber).toBe("2026/006");
    expect(model.invoiceDetails.invoiceDate).toBe("04-04-2026");
    expect(model.invoiceDetails.dueDate).toBe("04-15-2026");
    expect(model.invoiceDetails.billingDuration).toBe("03-15-2026 - 04-14-2026");

    expect(model.sections.map((section) => section.title)).toEqual([
      "Data Team :",
      "Finance Team :",
      "Onboarding Advance",
      "Appraisal Advance",
      "Reimbursements / Expenses",
      "Off-Boarding Adjustments",
    ]);

    expect(model.sections[0].totalLabel).toBe("Total (A)");
    expect(model.sections[1].totalLabel).toBe("Total (B)");
    expect(model.sections[2].rows).toHaveLength(1);
    expect(model.sections[3].rows).toHaveLength(1);
    expect(model.sections[4].rows).toHaveLength(2);
    expect(model.sections[4].rows[0]).toMatchObject({
      contractorName: "One Time Laptop Allowance",
      hourlyRate: "",
      hrsPerWeek: "",
      total: "$800",
    });
    expect("daysWorked" in model.sections[0].rows[0]).toBe(false);
    expect(model.sections[5].isDeduction).toBe(true);

    expect(model.grandTotal.formula).toBe(
      "Grand Total = Total(A) + Total(B) + Total(C) + Total(D) + Total(E) - Total(F)",
    );
    expect(model.grandTotal.amount).toBe("$24,582");
  });

  it("renders a single-page PDF for compact invoices without a blank extra page", async () => {
    const pdfBuffer = await buildInvoicePdf(minimalDetail);

    expect(pdfBuffer.byteLength).toBeGreaterThan(1000);
    expect(pdfBuffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(countPdfPages(pdfBuffer)).toBe(1);
  });

  it("keeps a section total with the last chunk instead of orphaning it onto a new page", () => {
    const chunks = paginateInvoicePdfSectionRows({
      bodyRows: [
        { contractorName: "A", hourlyRate: "$10", hrsPerWeek: "40", total: "$100" },
        { contractorName: "B", hourlyRate: "$10", hrsPerWeek: "40", total: "$100" },
        { contractorName: "C", hourlyRate: "$10", hrsPerWeek: "40", total: "$100" },
      ],
      availableRowSlots: [2, 3],
      minimumRowsToStartSection: 2,
    });

    expect(chunks).toEqual([
      { rowCount: 1, includesTotal: false },
      { rowCount: 2, includesTotal: true },
    ]);
  });
});
