// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  savePreference: vi.fn(
    async (_value: boolean): Promise<{ ok: boolean; message?: string }> => ({ ok: true }),
  ),
}));

vi.mock("../../../app/overview-actions", () => ({
  saveOverviewAdvancePreferenceAction: mocks.savePreference,
}));

import { OverviewPnlSummaryTable } from "../../../app/overview-pnl-summary-table";
import type { OverviewMonthlyPnlRow } from "./overview-pnl-summary";

const rows: OverviewMonthlyPnlRow[] = [
  {
    monthKey: "2026-07",
    periodLabel: "July 2026",
    effectiveDollarInwardUsdCents: 100_00,
    cashoutUsdInrRate: 90,
    effectiveInwardInrCents: 9_000_00,
    salaryPaidInrCents: 6_000_00,
    pfInrCents: 500_00,
    tdsInrCents: 300_00,
    expensesInrCents: 200_00,
    advancesInrCents: 900_00,
    fxGainInrCents: 500_00,
    operatingMarginInrCents: 1_700_00,
    grossPnlInrCents: 2_200_00,
    netPnlBeforeAdvanceInrCents: 2_000_00,
  },
];

describe("overview P&L summary table", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.savePreference.mockReset();
    mocks.savePreference.mockResolvedValue({ ok: true });
  });

  it("renders the stakeholder columns in the requested order with totals", () => {
    render(
      <OverviewPnlSummaryTable
        rows={rows}
        initialExcludeAdvanceDeduction={false}
        preferenceLoadFailed={false}
      />,
    );

    const table = screen.getByRole("table");
    const labelRow = within(table).getByTestId("overview-column-labels");
    const headers = within(labelRow)
      .getAllByTestId("overview-column-label")
      .map((header) => header.textContent?.replace(/\s+/g, " ").trim());

    expect(headers).toEqual([
      "Effective dollar inward (USD)",
      "Cashout rate",
      "Total effective INR inward",
      "Total salary paid",
      "PF",
      "TDS",
      "Forex gain",
      "Operating margin",
      "Total earning (Gross P&L)",
      "Expenses (INR)",
      "Advances (INR)",
      "Net P&L",
    ]);
    expect(screen.getByRole("columnheader", { name: "Period" })).not.toBeNull();
    expect(screen.getByText("July 2026")).not.toBeNull();
    expect(screen.getByText("Totals")).not.toBeNull();
    expect(screen.getAllByText("+ ₹1,100.00")).toHaveLength(2);
    expect(screen.getByText("Totals").className).toContain("py-4");
  });

  it("optimistically excludes the advance deduction and persists the choice", async () => {
    render(
      <OverviewPnlSummaryTable
        rows={rows}
        initialExcludeAdvanceDeduction={false}
        preferenceLoadFailed={false}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Exclude advance deduction" });
    fireEvent.click(checkbox);

    expect(screen.getAllByText("+ ₹2,000.00")).toHaveLength(2);
    await waitFor(() => expect(mocks.savePreference).toHaveBeenCalledWith(true));
  });

  it("restores a persisted checked preference", () => {
    render(
      <OverviewPnlSummaryTable
        rows={rows}
        initialExcludeAdvanceDeduction
        preferenceLoadFailed={false}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Exclude advance deduction" });
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(screen.getAllByText("+ ₹2,000.00")).toHaveLength(2);
  });

  it("rolls back the checkbox and figures when saving fails", async () => {
    mocks.savePreference.mockResolvedValue({
      ok: false,
      message: "Could not save the Overview preference.",
    });
    render(
      <OverviewPnlSummaryTable
        rows={rows}
        initialExcludeAdvanceDeduction={false}
        preferenceLoadFailed={false}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Exclude advance deduction" });
    fireEvent.click(checkbox);

    await waitFor(() =>
      expect((checkbox as HTMLInputElement).checked).toBe(false),
    );
    expect(screen.getByText("Could not save the Overview preference.")).not.toBeNull();
    expect(screen.getAllByText("+ ₹1,100.00")).toHaveLength(2);
  });

  it("rolls back when the server action request rejects", async () => {
    mocks.savePreference.mockRejectedValue(new Error("offline"));
    render(
      <OverviewPnlSummaryTable
        rows={rows}
        initialExcludeAdvanceDeduction={false}
        preferenceLoadFailed={false}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Exclude advance deduction" });
    fireEvent.click(checkbox);

    await waitFor(() =>
      expect((checkbox as HTMLInputElement).checked).toBe(false),
    );
    expect(screen.getByText("Could not save the Overview preference.")).not.toBeNull();
    expect(screen.getAllByText("+ ₹1,100.00")).toHaveLength(2);
  });

  it("shows the conservative fallback warning when the preference cannot load", () => {
    render(
      <OverviewPnlSummaryTable
        rows={rows}
        initialExcludeAdvanceDeduction={false}
        preferenceLoadFailed
      />,
    );

    expect(
      screen.getByText("Preference could not be loaded. Advances are being deducted."),
    ).not.toBeNull();
  });

  it("renders a clear empty state", () => {
    render(
      <OverviewPnlSummaryTable
        rows={[]}
        initialExcludeAdvanceDeduction={false}
        preferenceLoadFailed={false}
      />,
    );

    expect(screen.getByText("No P&L data found for the selected period.")).not.toBeNull();
  });
});
