// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OverviewPnlSummaryTable } from "../../../app/overview-pnl-summary-table";
import type { OverviewPnlSummaryRow } from "./overview-pnl-summary";

const baseTotals = {
  daysWorked: null,
  dollarInwardUsdCents: 100_00,
  onboardingAdvanceUsdCents: 0,
  reimbursementUsdCents: 0,
  reimbursementInrCents: 0,
  appraisalAdvanceUsdCents: 0,
  appraisalAdvanceInrCents: 0,
  offboardingDeductionUsdCents: 0,
  effectiveDollarInwardUsdCents: 100_00,
  cashoutUsdInrRate: 80,
  cashInInrCents: 8_000_00,
  paidUsdInrRate: 78,
  actualPaidInrCents: 7_720_00,
  pfInrCents: 500_00,
  tdsInrCents: 200_00,
  salaryPaidInrCents: 7_020_00,
  fxCommissionInrCents: 1_000_00,
  totalCommissionUsdCents: 10_00,
  commissionEarnedInrCents: 2_000_00,
  grossEarningsInrCents: 3_000_00,
  expensesInrCents: 300_00,
  companyReimbursementUsdCents: 2_00,
  companyReimbursementInrCents: 160_00,
  netPlInrCents: 4_860_00,
};

const rows: OverviewPnlSummaryRow[] = [
  {
    companyId: "company_1",
    companyName: "Wizard Commerce",
    periodLabel: "July 2026",
    sourcePeriodRows: [],
    totals: baseTotals,
  },
  {
    companyId: "__total__",
    companyName: "Total",
    periodLabel: "July 2026",
    sourcePeriodRows: [],
    totals: {
      ...baseTotals,
      dollarInwardUsdCents: 200_00,
      netPlInrCents: 9_720_00,
    },
  },
];

describe("overview P&L summary table", () => {
  it("renders the core P&L columns and total row", () => {
    render(<OverviewPnlSummaryTable rows={rows} />);

    const table = screen.getByRole("table");
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.replace(/\s+/g, " ").trim());

    expect(headers).toEqual([
      "Company",
      "Period",
      "Total dollar inward",
      "Total cash inward INR",
      "Actual paid INR",
      "Salary paid INR",
      "PF paid INR",
      "TDS paid INR",
      "FX commission INR",
      "Total commission USD",
      "Commission earned INR",
      "Gross earnings INR",
      "Expenses INR",
      "Reimbursements USD",
      "Reimbursements INR",
      "Net P/L INR",
    ]);
    expect(screen.getByText("Wizard Commerce")).not.toBeNull();
    expect(screen.getByText("Total")).not.toBeNull();
  });

  it("does not render the old cockpit overview content", () => {
    render(<OverviewPnlSummaryTable rows={rows} />);

    expect(screen.queryByText("Monthly workflow")).toBeNull();
    expect(screen.queryByText("Recent invoices")).toBeNull();
    expect(screen.queryByText("Ready for cashout")).toBeNull();
  });

  it("renders a clear empty state", () => {
    render(<OverviewPnlSummaryTable rows={[]} />);

    expect(screen.getByText("No P&L data found for the selected period.")).not.toBeNull();
  });
});
