import { describe, expect, it } from "vitest";

import {
  parseInvoiceHeaderFormInput,
  resolveSelectedTeam,
} from "./invoice-editor";
import type { InvoiceDetail } from "./types";

const teams: InvoiceDetail["teams"] = [
  {
    id: "team_data",
    invoiceId: "invoice_1",
    teamName: "Data Engineering",
    sortOrder: 1,
    lineItems: [],
  },
  {
    id: "team_finance",
    invoiceId: "invoice_1",
    teamName: "Finance",
    sortOrder: 2,
    lineItems: [],
  },
];

describe("invoice editor selection", () => {
  it("uses the requested team when it exists", () => {
    expect(resolveSelectedTeam(teams, "team_finance")?.id).toBe("team_finance");
  });

  it("falls back to the first team when the requested team is invalid", () => {
    expect(resolveSelectedTeam(teams, "missing_team")?.id).toBe("team_data");
  });

  it("returns undefined when there are no teams", () => {
    expect(resolveSelectedTeam([], "team_data")).toBeUndefined();
  });
});

describe("invoice editor header parsing", () => {
  it("normalizes and validates editable header input", () => {
    expect(
      parseInvoiceHeaderFormInput({
        companyId: "company_1",
        companyName: "  The Arena Platform, Inc.  ",
        invoiceNumber: "  INV-204  ",
        month: "4",
        year: "2026",
        billingDate: "2026-04-01",
        dueDate: "2026-04-15",
        status: "generated",
      }),
    ).toEqual({
      companyId: "company_1",
      companyName: "The Arena Platform, Inc.",
      invoiceNumber: "INV-204",
      month: 4,
      year: 2026,
      billingDate: "2026-04-01",
      dueDate: "2026-04-15",
      status: "generated",
    });
  });

  it("rejects out-of-range months", () => {
    expect(() =>
      parseInvoiceHeaderFormInput({
        companyId: "company_1",
        companyName: "The Arena Platform, Inc.",
        invoiceNumber: "INV-204",
        month: "13",
        year: "2026",
        billingDate: "2026-04-01",
        dueDate: "2026-04-15",
        status: "draft",
      }),
    ).toThrow("Month must be between 1 and 12.");
  });

  it("rejects invalid statuses", () => {
    expect(() =>
      parseInvoiceHeaderFormInput({
        companyId: "company_1",
        companyName: "The Arena Platform, Inc.",
        invoiceNumber: "INV-204",
        month: "4",
        year: "2026",
        billingDate: "2026-04-01",
        dueDate: "2026-04-15",
        status: "archived",
      }),
    ).toThrow("Status is invalid.");
  });
});
