import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";

import { buildPayslipPdf } from "./payslip-pdf";
import type { SavedPayslip } from "./payslip-store";

function countPdfPages(buffer: Buffer) {
  return (buffer.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;
}

const payslip: SavedPayslip = {
  id: "payslip_1",
  companyId: "company_1",
  employeeId: "emp_1",
  employeeName: "Beesetti Kiran Suresh",
  month: "2026-04",
  panNumber: "GLWPS3874M",
  pfUan: "",
  joiningDate: "2026-04-01",
  designation: "Senior Data Engineer",
  effectiveWorkDays: 30,
  earnings: [
    { label: "BASIC", amountInrCents: 33_334_00, sortOrder: 1 },
    { label: "SPECIAL ALLOWANCE", amountInrCents: 50_000_00, sortOrder: 2 },
    { label: "INSURANCE", amountInrCents: 0, sortOrder: 3 },
  ],
  deductions: [
    { label: "PF", amountInrCents: 0, sortOrder: 1 },
    { label: "INCOME TAX", amountInrCents: 0, sortOrder: 2 },
  ],
  tdsEarnings: [
    { label: "BASIC", grossInrCents: 400_008_00, exemptInrCents: 0, taxableInrCents: 400_008_00, sortOrder: 1 },
    { label: "SPECIAL ALLOWANCE", grossInrCents: 600_000_00, exemptInrCents: 0, taxableInrCents: 600_000_00, sortOrder: 2 },
    { label: "INSURANCE", grossInrCents: 0, exemptInrCents: 0, taxableInrCents: 0, sortOrder: 3 },
  ],
  tdsIncomeTaxDeductions: [
    { label: "Income after Section 10 Exemption", amountInrCents: 1_000_008_00, sortOrder: 1 },
    { label: "Profession Tax", amountInrCents: 0, sortOrder: 2 },
    { label: "Standard Deduction", amountInrCents: 75_000_00, sortOrder: 3 },
    { label: "Taxable Income", amountInrCents: 925_008_00, sortOrder: 4 },
    { label: "Total Tax", amountInrCents: 0, sortOrder: 5 },
    { label: "Education Cess", amountInrCents: 0, sortOrder: 6 },
    { label: "Tax Deducted (Previous Employer)", amountInrCents: 0, sortOrder: 7 },
    { label: "Tax Deducted Till Date", amountInrCents: 0, sortOrder: 8 },
    { label: "Tax to be Deducted", amountInrCents: 0, sortOrder: 9 },
    { label: "Monthly Projected Tax", amountInrCents: 0, sortOrder: 10 },
  ],
  taxPaidMonths: [
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
    "JAN",
    "FEB",
    "MAR",
  ].map((monthCode, index) => ({
    monthCode,
    monthKey: index < 9 ? `2026-${String(index + 4).padStart(2, "0")}` : `2027-${String(index - 8).padStart(2, "0")}`,
    amountInrCents: 0,
    sortOrder: index + 1,
  })),
};

describe("payslip pdf", () => {
  it("renders a one-page payslip PDF matching the salary slip structure", async () => {
    const pdf = await buildPayslipPdf({
      payslip,
      companyName: "EASSY ONBOARD LLP",
      companyAddress:
        "#PLOT NO:-37, KANTESHVAR SOCIETY-1, DABHOLI ROAD, NEAR LALITA CHOKDI, KATARGAM, SURAT, GUJARAT-395004",
    });
    if (process.env.WRITE_PAYSLIP_PDF_SAMPLE) {
      writeFileSync(process.env.WRITE_PAYSLIP_PDF_SAMPLE, pdf);
    }

    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(countPdfPages(pdf)).toBe(1);
  });
});
