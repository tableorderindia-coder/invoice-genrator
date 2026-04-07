import { describe, expect, it } from "vitest";

import { resolveSelectedTeam } from "./invoice-editor";
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
