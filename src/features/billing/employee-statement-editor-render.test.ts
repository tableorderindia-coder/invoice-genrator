// @vitest-environment jsdom

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/features/billing/actions", () => ({
  saveEmployeeStatementAction: vi.fn(),
}));

import EmployeeStatementEditor from "../../../app/employee-statements/_components/employee-statement-editor";
import type { EmployeeStatementSection } from "./types";

const sectionFixture: EmployeeStatementSection = {
  employeeId: "emp_1",
  employeeName: "Lakshay Chaudhary",
  months: [
    {
      monthKey: "2026-01",
      monthLabel: "January 2026",
      effectiveDollarInwardUsdCents: 3439_00,
      monthlyDollarPaidUsdCents: 1040_00,
      rows: [
        {
          employeeId: "emp_1",
          employeeName: "Lakshay Chaudhary",
          invoiceId: "inv_1",
          invoiceNumber: "2026/003",
          monthKey: "2026-01",
          monthLabel: "January 2026",
          dollarInwardUsdCents: 839_00,
          onboardingAdvanceUsdCents: 0,
          reimbursementUsdCents: 0,
          reimbursementLabelsText: "Laptop reimbursement label text",
          appraisalAdvanceUsdCents: 500_00,
          offboardingDeductionUsdCents: 0,
        },
        {
          employeeId: "emp_1",
          employeeName: "Lakshay Chaudhary",
          invoiceId: "inv_2",
          invoiceNumber: "2026/004",
          monthKey: "2026-01",
          monthLabel: "January 2026",
          dollarInwardUsdCents: 0,
          onboardingAdvanceUsdCents: 2600_00,
          reimbursementUsdCents: 125_00,
          reimbursementLabelsText: "Travel support",
          appraisalAdvanceUsdCents: 0,
          offboardingDeductionUsdCents: 0,
        },
      ],
    },
  ],
};

describe("employee statement editor rendering", () => {
  it("renders employee statement editable fields with explicit minimum widths", () => {
    render(
      createElement(EmployeeStatementEditor, {
        companyId: "comp_1",
        companyName: "The Arena Platform, Inc.",
        section: sectionFixture,
        startMonth: "2026-01",
        endMonth: "2026-04",
        generatedDate: "04-17-2026",
        returnTo: "/employee-statements",
      }),
    );

    expect(screen.getByDisplayValue("2600.00").className).toContain("min-w-[8rem]");
    expect(screen.getByDisplayValue("1040.00").className).toContain("min-w-[8rem]");
    expect(screen.getByDisplayValue("500.00").className).toContain("min-w-[8rem]");
    expect(screen.getByDisplayValue("Laptop reimbursement label text").className).toContain(
      "min-w-[14rem]",
    );
    expect(screen.getAllByText("$4,064")).toHaveLength(2);
  });
});
