import { describe, expect, it } from "vitest";

import {
  filterCashoutEligibleInvoices,
  filterDraftInvoices,
  filterIssuedInvoices,
} from "./invoice-workflow";
import type { Invoice } from "./types";

const invoices: Invoice[] = [
  {
    id: "draft_1",
    companyId: "company_1",
    month: 4,
    year: 2026,
    invoiceNumber: "DRAFT-001",
    billingDate: "2026-04-30",
    dueDate: "2026-05-15",
    status: "draft",
    noteText: "",
    subtotalUsdCents: 0,
    adjustmentsUsdCents: 0,
    grandTotalUsdCents: 0,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "generated_1",
    companyId: "company_1",
    month: 4,
    year: 2026,
    invoiceNumber: "GEN-001",
    billingDate: "2026-04-30",
    dueDate: "2026-05-15",
    status: "generated",
    noteText: "",
    subtotalUsdCents: 0,
    adjustmentsUsdCents: 0,
    grandTotalUsdCents: 0,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "sent_1",
    companyId: "company_1",
    month: 4,
    year: 2026,
    invoiceNumber: "SENT-001",
    billingDate: "2026-04-30",
    dueDate: "2026-05-15",
    status: "sent",
    noteText: "",
    subtotalUsdCents: 0,
    adjustmentsUsdCents: 0,
    grandTotalUsdCents: 0,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "cashed_1",
    companyId: "company_1",
    month: 4,
    year: 2026,
    invoiceNumber: "CASH-001",
    billingDate: "2026-04-30",
    dueDate: "2026-05-15",
    status: "cashed_out",
    noteText: "",
    subtotalUsdCents: 0,
    adjustmentsUsdCents: 0,
    grandTotalUsdCents: 0,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
];

describe("invoice workflow filters", () => {
  it("keeps only drafts in the draft workspace", () => {
    expect(filterDraftInvoices(invoices).map((invoice) => invoice.id)).toEqual([
      "draft_1",
    ]);
  });

  it("keeps only generated and sent invoices in issued operations", () => {
    expect(filterIssuedInvoices(invoices).map((invoice) => invoice.id)).toEqual([
      "generated_1",
      "sent_1",
    ]);
  });

  it("keeps only generated and sent invoices for cashout", () => {
    expect(
      filterCashoutEligibleInvoices(invoices).map((invoice) => invoice.id),
    ).toEqual(["generated_1", "sent_1"]);
  });
});
