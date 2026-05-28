// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FoundersBalanceTable } from "../../../app/founders-balance/founders-balance-table";
import type { FounderBalanceModel } from "./founders-balance";

const model: FounderBalanceModel = {
  companyId: "comp_1",
  rows: [
    {
      key: "2026-03",
      year: 2026,
      month: 3,
      netPlInrCents: 300_00,
      founderShareInrCents: 300_00,
      founderEntitlementInrCents: 100_00,
      withdrawals: {
        nirbhay_kumar_giri: 10_00,
        pawan_kumar_beesetti: 20_00,
        vishal_savaliya: 30_00,
      },
      updatedAt: "2026-05-28T13:10:00.000Z",
    },
  ],
  totals: {
    netPlInrCents: 300_00,
    founderShareInrCents: 300_00,
    founderEntitlementInrCents: 100_00,
    withdrawals: {
      nirbhay_kumar_giri: 10_00,
      pawan_kumar_beesetti: 20_00,
      vishal_savaliya: 30_00,
    },
  },
  available: {
    nirbhay_kumar_giri: 90_00,
    pawan_kumar_beesetti: 80_00,
    vishal_savaliya: 70_00,
  },
};

describe("founder's balance table rendering", () => {
  it("renders only the requested visible columns", () => {
    render(
      <FoundersBalanceTable
        companyId="comp_1"
        data={model}
        returnTo="/founders-balance?companyId=comp_1"
        saveFounderWithdrawalsAction={vi.fn()}
      />,
    );

    const headers = within(screen.getByRole("table"))
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.replace(/\s+/g, " ").trim());

    expect(headers).toEqual([
      "Select all",
      "P&L Month",
      "Company Net P/L",
      "Each Founder Share",
      "Nirbhay Kumar Giri",
      "Pawan Kumar Beesetti",
      "Vishal Savaliya",
    ]);
    expect(screen.queryByText("Founder’s Share")).toBeNull();
    expect(screen.queryByText("Updated at")).toBeNull();
  });
});
